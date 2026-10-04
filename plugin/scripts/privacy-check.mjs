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
// 본문은 -F/--body-file 파일이나 -b/--body 문자열로만 받는다. 표준 입력(-F -)은 검사할 수 없어 거절한다.
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
const TEXT_FLAGS = ['-t', '--title', '-b', '--body'];
const FILE_FLAGS = ['-F', '--body-file'];

// gh 인자에서 검사할 글을 뽑는다: [{ source, text }]. 받지 않는 형태면 Error.
export function textsFromGhArgs(args) {
  const [group, sub] = args;
  if (!GH_ALLOWED[group]?.includes(sub)) {
    throw new Error(
      `받지 않는 명령: gh ${group ?? ''} ${sub ?? ''}. issue create|edit|comment, pr create|edit|comment 만 받는다`,
    );
  }
  const texts = [];
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    const eq = arg.indexOf('=');
    const flag = arg.startsWith('--') && eq > 0 ? arg.slice(0, eq) : arg;
    const inline = flag !== arg ? arg.slice(eq + 1) : undefined;
    if (!TEXT_FLAGS.includes(flag) && !FILE_FLAGS.includes(flag)) continue;
    const value = inline ?? args[++i];
    if (value === undefined) throw new Error(`${flag} 뒤에 값이 없다`);
    if (FILE_FLAGS.includes(flag)) {
      if (value === '-') throw new Error('표준 입력 본문(-F -)은 검사할 수 없다. 파일로 넘긴다');
      texts.push({ source: value, text: readFileSync(value, 'utf8') });
    } else {
      texts.push({ source: flag, text: value });
    }
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
