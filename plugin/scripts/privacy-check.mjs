#!/usr/bin/env node
// 원격에 올리면 안 되는 개인 리소스 정보와 비밀 값을 찾는다. 패턴의 원본은 이 파일 하나다.
// 기준은 autelon 의 director 스킬 "개인 리소스 정보" 절.
//
// 사용
//   node privacy-check.mjs scan [파일|-]       파일(기본: 표준 입력)을 검사한다. 걸리면 위치를 찍고 1로 끝난다.
//   node privacy-check.mjs gh <gh 인자...>      제목·본문을 검사하고, 통과하면 그 gh 명령을 그대로 실행한다.
//
// gh 모드는 이슈·PR의 제목·본문·코멘트를 올리는 유일한 통로다. 이슈와 코멘트는 리뷰 없이 바로 공개되므로
// 올리기 전에 막아야 한다. 받는 명령: issue create|edit|comment, pr create|edit|comment.
// 본문은 -F/--body-file 파일이나 -b/--body 문자열로만 받는다. 검사할 수 없는 곳에서 글을 가져오는 플래그
// (표준 입력 -F -, 편집기, 브라우저, 템플릿, --fill, --recover), 코멘트 삭제(--delete-last), 묶어 쓴 짧은 플래그는 거절한다.
// create·comment 는 본문이 없으면 대화형 입력으로 넘어가므로 본문을 꼭 받는다.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const PATTERNS = [
  ['Notion 주소', /notion\.(com|so|site)/i],
  ['Notion 참조', /(collection|view):\/\//i],
  // macOS 홈은 대문자, Linux 홈은 소문자다. 대소문자를 가리지 않으면 API 경로(/users/{id})까지 막는다.
  ['사용자 홈 경로', /\/Users\/|\/home\/[a-z]|[Cc]:\\[Uu]sers/],
  ['홈 기준 경로', /(^|[^A-Za-z0-9_.])~\//],
  ['임시 폴더 경로', /-Users-|\/private\/tmp\/|\/var\/folders\/|claude-[0-9]+\/|scratchpad\//],
  ['개인 메일', /@(gmail|naver|kakao|daum|hotmail|outlook|icloud|yahoo)\./i],
  // git SHA(40자)는 앞뒤가 16진수라 걸리지 않는다. 하이픈 없는 Notion ID 꼴만 잡는다.
  ['32자리 ID', /(^|[^0-9a-f])[0-9a-f]{32}([^0-9a-f]|$)/i],
  // 하이픈 있는 Notion ID, 세션 UUID
  ['UUID', /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i],
  ['GitHub 토큰', /\bgh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
  [
    'API 키',
    /\bsk-[A-Za-z0-9_-]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}/,
  ],
  ['개인 키', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['URL 속 자격 증명', /:\/\/[^\s/:@]+:[^\s/@]+@/],
];

const mask = (s) => (s.length <= 4 ? '****' : `${s.slice(0, 4)}****`);

// 걸린 것: [{ line, kind, masked }]. 찾은 값은 앞 4자만 남기고 가린다.
export function scan(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const [kind, re] of PATTERNS) {
      const m = line.match(re);
      if (m)
        hits.push({ line: i + 1, kind, masked: mask(m[0].replace(/^[^0-9A-Za-z/@~:-]+/, '')) });
    }
  });
  return hits;
}

const GH_ALLOWED = {
  issue: ['create', 'edit', 'comment'],
  pr: ['create', 'edit', 'comment'],
};
// 글을 받는 플래그. 짧은 이름 → 긴 이름.
const TEXT_FLAGS = { t: '--title', b: '--body' };
const FILE_FLAGS = { F: '--body-file' };
// 글을 검사할 수 없는 곳(편집기, 브라우저, 템플릿, 커밋 내용, 실패한 실행)에서 가져오거나 코멘트를 지우는 플래그.
const REJECTED = new Set([
  '-e',
  '--editor',
  '-w',
  '--web',
  '-T',
  '--template',
  '--recover',
  '--fill',
  '--fill-first',
  '--fill-verbose',
  '--delete-last',
]);
// 값을 받는 다른 짧은 플래그(issue/pr create·edit·comment). 값이 붙어 있어도(-Rorg/repo) 검사할 글이 아니다.
const OTHER_VALUE_SHORT = new Set(['a', 'A', 'B', 'H', 'l', 'm', 'p', 'r', 'R']);
// 본문 없이 실행하면 대화형 입력으로 넘어가는 명령
const NEEDS_BODY = new Set(['create', 'comment']);

// gh 인자에서 검사할 글을 뽑는다: [{ source, text }]. 검사를 거치지 않는 형태면 Error.
export function textsFromGhArgs(args) {
  const [group, sub] = args;
  if (!GH_ALLOWED[group]?.includes(sub)) {
    throw new Error(
      `받지 않는 명령: gh ${group ?? ''} ${sub ?? ''}. issue create|edit|comment, pr create|edit|comment 만 받는다`,
    );
  }
  const texts = [];
  const take = (flag, value) => {
    if (value === undefined) throw new Error(`${flag} 뒤에 값이 없다`);
    if (flag === '--body-file') {
      if (value === '-') throw new Error('표준 입력 본문(-F -)은 검사할 수 없다. 파일로 넘긴다');
      texts.push({ source: value, text: readFileSync(value, 'utf8') });
    } else {
      texts.push({ source: flag, text: value });
    }
  };
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') throw new Error('-- 뒤의 인자는 검사하지 않으므로 받지 않는다');
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const flag = eq > 0 ? arg.slice(0, eq) : arg;
      if (REJECTED.has(flag))
        throw new Error(`${flag} 는 검사할 수 없는 글을 쓰거나 코멘트를 지우므로 받지 않는다`);
      if (flag === '--title' || flag === '--body' || flag === '--body-file') {
        take(flag, eq > 0 ? arg.slice(eq + 1) : args[++i]);
      }
      continue;
    }
    if (!arg.startsWith('-') || arg.length < 2) continue;
    const letter = arg[1];
    const attached = arg.length > 2 ? arg.slice(2).replace(/^=/, '') : undefined;
    const long = TEXT_FLAGS[letter] ?? FILE_FLAGS[letter];
    if (long) {
      take(long, attached ?? args[++i]);
    } else if (REJECTED.has(`-${letter}`)) {
      throw new Error(`-${letter} 는 검사할 수 없는 글을 쓰므로 받지 않는다`);
    } else if (OTHER_VALUE_SHORT.has(letter)) {
      if (attached === undefined) i++;
    } else if (attached !== undefined) {
      // -dw 같은 묶음은 어떤 플래그가 들어 있는지 확실히 가를 수 없다
      throw new Error(`묶어 쓴 짧은 플래그(${arg})는 받지 않는다. 하나씩 나눠 쓴다`);
    }
  }
  if (NEEDS_BODY.has(sub) && !texts.some((t) => t.source !== '--title')) {
    throw new Error(
      `gh ${group} ${sub} 는 -b 나 -F 로 본문을 넘겨야 한다(없으면 대화형 입력으로 넘어간다)`,
    );
  }
  return texts;
}

function report(source, hits) {
  for (const h of hits) console.error(`${source}:${h.line}: ${h.kind}: ${h.masked}`);
}

function main(argv) {
  const [mode, ...rest] = argv;
  if (mode === 'scan') {
    const file = rest[0] ?? '-';
    const text = readFileSync(file === '-' ? 0 : file, 'utf8');
    const hits = scan(text);
    report(file === '-' ? '(stdin)' : file, hits);
    return hits.length ? 1 : 0;
  }
  if (mode === 'gh') {
    let texts;
    try {
      texts = textsFromGhArgs(rest);
    } catch (err) {
      console.error(`privacy-check: ${err.message}`);
      return 2;
    }
    let failed = false;
    for (const { source, text } of texts) {
      const hits = scan(text);
      if (hits.length) {
        failed = true;
        report(source, hits);
      }
    }
    if (failed) {
      console.error(
        'privacy-check: 개인 리소스 정보로 보이는 값이 있어 올리지 않았다. 고친 뒤 다시 실행한다',
      );
      return 1;
    }
    const res = spawnSync('gh', rest, { stdio: 'inherit' });
    return res.status ?? 1;
  }
  console.error('사용: privacy-check.mjs scan [파일|-] | privacy-check.mjs gh <gh 인자...>');
  return 2;
}

// 테스트에서 import 할 때는 실행하지 않는다.
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  process.exit(main(process.argv.slice(2)));
}
