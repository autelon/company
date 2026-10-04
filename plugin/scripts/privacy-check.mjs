#!/usr/bin/env node
// 원격에 올리면 안 되는 개인 리소스 정보와 비밀 값을 찾는다. 패턴의 원본은 이 파일 하나다.
// 기준은 autelon 의 director 스킬 "개인 리소스 정보" 절.
//
// 사용
//   node privacy-check.mjs scan [파일|-]       파일(기본: 표준 입력)을 검사한다. 걸리면 위치를 찍고 1로 끝난다.
//   node privacy-check.mjs gh <gh 인자...>      제목·본문을 검사하고, 통과하면 그 gh 명령을 그대로 실행한다.
//   node privacy-check.mjs hook                  PreToolUse(Bash) 훅. 표준 입력의 명령에 스크립트를 거치지 않은
//                                               gh 글쓰기가 있으면 deny 를 출력한다(plugin/hooks/hooks.json).
//                                               도움말 플래그(--help, -h)만 붙은 호출은 통과한다.
//
// gh 모드는 이슈·PR의 제목·본문·코멘트와 그 밖의 공개 글을 올리는 유일한 통로다. 이슈와 코멘트는 리뷰 없이 바로
// 공개되므로 올리기 전에 막아야 한다. 받는 명령: issue create|edit|comment, pr create|edit|comment,
// label create|edit(이름·설명), api 의 마일스톤 만들기·고치기(repos/<o>/<r>/milestones[/<n>])와
// 이슈 코멘트 고치기(-X PATCH repos/<o>/<r>/issues/comments/<id>). api 는 아래 플래그만 받는다(autelon/company#27).
// 본문은 -F/--body-file 파일이나 -b/--body 문자열로만 받는다. 검사할 수 없는 곳에서 글을 가져오는 플래그
// (표준 입력 -F -, 편집기, 브라우저, 템플릿, --fill, --recover), 코멘트 삭제(--delete-last), 묶어 쓴 짧은 플래그는 거절한다.
// create·comment 는 본문이 없으면 대화형 입력으로 넘어가므로 본문을 꼭 받고, create 는 제목(-t)도 받는다.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// 널리 쓰는 예시 UUID. 세션 UUID 와 구별되지 않는 무작위 값은 그대로 막는다.
// nil·max(RFC 9562), RFC 4122 본문의 예시, 문서·튜토리얼에 흔한 예시.
const EXAMPLE_UUIDS = new Set([
  '00000000-0000-0000-0000-000000000000',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
  '123e4567-e89b-12d3-a456-426614174000',
]);

// [종류, 정규식, 허용(찾은 값 → true 면 넘김)]
export const PATTERNS = [
  ['Notion 주소', /notion\.(com|so|site)/i],
  ['Notion 참조', /(collection|view):\/\//i],
  // macOS 홈은 대문자, Linux 홈은 소문자다. 대소문자를 가리지 않으면 API 경로(/users/{id})까지 막는다.
  // Linux 홈은 경로의 맨 앞에서만 시작한다. 앞에 호스트·경로 글자(example.com/home/...)나 HTTP 메서드(GET /home/...)가
  // 있으면 웹 주소·라우트로 보고 넘긴다(autelon/company#28).
  [
    '사용자 홈 경로',
    /\/Users\/|(?<![\w.~%-])(?<!\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) )\/home\/[a-z]|[Cc]:\\[Uu]sers/,
  ],
  ['홈 기준 경로', /(^|[^A-Za-z0-9_.])~\//],
  ['임시 폴더 경로', /-Users-|\/private\/tmp\/|\/var\/folders\/|claude-[0-9]+\/|scratchpad\//],
  ['개인 메일', /@(gmail|naver|kakao|daum|hotmail|outlook|icloud|yahoo)\./i],
  // git SHA(40자)는 앞뒤가 16진수라 걸리지 않는다. 하이픈 없는 Notion ID 꼴만 잡는다.
  // md5 같은 32자 해시도 걸린다. Notion ID 와 모양이 같아 가를 수 없다(글에는 "해시"처럼 말로 쓴다).
  ['32자리 ID', /(^|[^0-9a-f])[0-9a-f]{32}([^0-9a-f]|$)/i],
  // 하이픈 있는 Notion ID, 세션 UUID
  [
    'UUID',
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    (v) => EXAMPLE_UUIDS.has(v.toLowerCase()),
  ],
  ['GitHub 토큰', /\bgh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
  [
    'API 키',
    /\bsk-[A-Za-z0-9_-]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}/,
  ],
  ['개인 키', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['URL 속 자격 증명', /:\/\/[^\s/:@]+:[^\s/@]+@/],
];

const mask = (s) => (s.length <= 4 ? '****' : `${s.slice(0, 4)}****`);

// 걸린 것: [{ line, kind, masked }]. 찾은 값은 앞 4자만 남기고 가린다. 한 줄에서 종류마다 하나만 찍는다.
export function scan(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const [kind, re, allow] of PATTERNS) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      for (const m of line.matchAll(g)) {
        if (allow?.(m[0])) continue;
        hits.push({ line: i + 1, kind, masked: mask(m[0].replace(/^[^0-9A-Za-z/@~:-]+/, '')) });
        break;
      }
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
  '-f',
  '--fill',
  '--fill-first',
  '--fill-verbose',
  '--delete-last',
]);
// 값을 받는 다른 짧은 플래그(issue/pr create·edit·comment). 값이 붙어 있어도(-Rorg/repo) 검사할 글이 아니다.
const OTHER_VALUE_SHORT = new Set(['a', 'A', 'B', 'H', 'l', 'm', 'p', 'r', 'R']);
// 본문 없이 실행하면 대화형 입력으로 넘어가는 명령
const NEEDS_BODY = new Set(['create', 'comment']);

const ACCEPTED =
  'issue create|edit|comment, pr create|edit|comment, label create|edit, api(마일스톤, 이슈 코멘트 고치기)';

// gh 인자에서 검사할 글을 뽑는다: [{ source, text }]. 검사를 거치지 않는 형태면 Error.
// readFile: 본문 파일을 읽는 함수. 훅은 크기·종류를 제한한 함수를 넘긴다.
export function textsFromGhArgs(rawArgs, readFile = (f) => readFileSync(f, 'utf8')) {
  // gh 는 그룹 앞과 그룹·하위 명령 사이의 -R/--repo 도 받는다. 검사는 걷어 낸 인자로 하고, 실행은 받은 인자 그대로 한다.
  const args = stripGhRepo(rawArgs);
  const [group, sub] = args;
  if (group === 'label' && (sub === 'create' || sub === 'edit')) return labelTexts(args);
  if (group === 'api') return apiTexts(args, readFile);
  if (!GH_ALLOWED[group]?.includes(sub)) {
    throw new Error(`받지 않는 명령: gh ${group ?? ''} ${sub ?? ''}. ${ACCEPTED} 만 받는다`);
  }
  const texts = [];
  const take = (flag, value) => {
    if (value === undefined) throw new Error(`${flag} 뒤에 값이 없다`);
    if (flag === '--body-file') {
      if (value === '-') throw new Error('표준 입력 본문(-F -)은 검사할 수 없다. 파일로 넘긴다');
      texts.push({ source: value, text: readFile(value) });
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
  // create 는 제목이 없으면 커밋 메시지·대화형 입력에서 채워져 검사를 거치지 않는다
  if (sub === 'create' && !texts.some((t) => t.source === '--title')) {
    throw new Error(`gh ${group} create 는 -t 로 제목을 넘겨야 한다`);
  }
  if (NEEDS_BODY.has(sub) && !texts.some((t) => t.source !== '--title')) {
    throw new Error(
      `gh ${group} ${sub} 는 -b 나 -F 로 본문을 넘겨야 한다(없으면 대화형 입력으로 넘어간다)`,
    );
  }
  return texts;
}

// label·api 처럼 받는 플래그가 정해진 명령의 인자를 나눈다. spec: { 긴 이름: { short, value } }.
// 목록에 없는 플래그, --, 묶어 쓴 짧은 플래그는 거절한다. 돌려주는 것: { flags: [[긴 이름, 값]], positional: [] }
function parseStrict(args, spec, label) {
  const byShort = Object.fromEntries(
    Object.entries(spec)
      .filter(([, v]) => v.short)
      .map(([k, v]) => [v.short, k]),
  );
  const flags = [];
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') throw new Error('-- 뒤의 인자는 검사하지 않으므로 받지 않는다');
    let name;
    let attached;
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      name = eq > 0 ? arg.slice(0, eq) : arg;
      attached = eq > 0 ? arg.slice(eq + 1) : undefined;
      if (!spec[name]) throw new Error(`${label} 에서 ${name} 는 받지 않는다`);
    } else if (arg.startsWith('-') && arg.length >= 2) {
      name = byShort[arg[1]];
      if (!name) throw new Error(`${label} 에서 -${arg[1]} 는 받지 않는다`);
      if (arg.length > 2) {
        if (!spec[name].value)
          throw new Error(`묶어 쓴 짧은 플래그(${arg})는 받지 않는다. 하나씩 나눠 쓴다`);
        attached = arg.slice(2).replace(/^=/, '');
      }
    } else {
      positional.push(arg);
      continue;
    }
    if (spec[name].value) {
      const value = attached ?? args[++i];
      if (value === undefined) throw new Error(`${name} 뒤에 값이 없다`);
      flags.push([name, value]);
    } else {
      if (attached !== undefined) throw new Error(`${name} 는 값을 받지 않는다`);
      flags.push([name, true]);
    }
  }
  return { flags, positional };
}

const LABEL_SPEC = {
  '--color': { short: 'c', value: true },
  '--description': { short: 'd', value: true },
  '--name': { short: 'n', value: true },
  '--force': { short: 'f', value: false },
  '--repo': { short: 'R', value: true },
};

// gh label create|edit <이름>: 라벨 이름, 새 이름(-n), 설명(-d)을 검사한다.
function labelTexts(args) {
  const sub = args[1];
  const { flags, positional } = parseStrict(args.slice(2), LABEL_SPEC, `gh label ${sub}`);
  if (positional.length !== 1) throw new Error(`gh label ${sub} 는 라벨 이름 하나를 받는다`);
  if (sub === 'create' && flags.some(([f]) => f === '--name'))
    throw new Error('gh label create 는 --name 을 받지 않는다');
  if (sub === 'edit' && flags.some(([f]) => f === '--force'))
    throw new Error('gh label edit 는 --force 를 받지 않는다');
  const texts = [{ source: '라벨 이름', text: positional[0] }];
  for (const [f, v] of flags) {
    if (f === '--description' || f === '--name') texts.push({ source: f, text: v });
  }
  return texts;
}

const API_SPEC = {
  '--method': { short: 'X', value: true },
  '--raw-field': { short: 'f', value: true },
  '--field': { short: 'F', value: true },
  '--jq': { short: 'q', value: true },
  '--silent': { value: false },
};
// 저장소 이름 자리에 ?·# 같은 글자가 들어가 다른 자원으로 가지 않게 GitHub 이름 글자만 받는다.
const MILESTONE_PATH = /^\/?repos\/[\w.-]+\/[\w.-]+\/milestones(\/\d+)?$/;
const COMMENT_PATH = /^\/?repos\/[\w.-]+\/[\w.-]+\/issues\/comments\/\d+$/;

// gh api: 마일스톤 만들기·고치기와 이슈 코멘트 고치기만 받는다. 필드 값을 모두 검사한다.
// -F key=@파일 은 파일 내용을 검사하고, 표준 입력(@-)과 --input 은 받지 않는다.
function apiTexts(args, readFile) {
  const { flags, positional } = parseStrict(args.slice(1), API_SPEC, 'gh api');
  if (positional.length !== 1) throw new Error('gh api 는 엔드포인트 하나를 받는다');
  const endpoint = positional[0];
  const fields = flags.filter(([f]) => f === '--raw-field' || f === '--field');
  // gh 는 -X 를 여러 번 주면 마지막 값을 쓴다. 검사한 메서드와 실제 메서드가 갈리지 않게 한 번만 받는다.
  if (flags.filter(([f]) => f === '--method').length > 1)
    throw new Error('gh api 의 -X/--method 는 한 번만 쓴다');
  const method = (
    flags.find(([f]) => f === '--method')?.[1] ?? (fields.length ? 'POST' : 'GET')
  ).toUpperCase();
  if (!fields.length)
    throw new Error(
      'gh api 는 글을 쓰는 호출(필드가 있는 호출)만 받는다. 읽기는 스크립트 없이 한다',
    );
  if (MILESTONE_PATH.test(endpoint)) {
    const isItem = /\/\d+$/.test(endpoint);
    if (method !== (isItem ? 'PATCH' : 'POST'))
      throw new Error(
        `마일스톤은 ${isItem ? 'PATCH .../milestones/<번호>' : 'POST .../milestones'} 만 받는다`,
      );
  } else if (COMMENT_PATH.test(endpoint)) {
    if (method !== 'PATCH') throw new Error('이슈 코멘트는 -X PATCH 로 고치는 것만 받는다');
  } else {
    throw new Error(
      `받지 않는 api 엔드포인트: ${endpoint}. 마일스톤과 이슈 코멘트 고치기만 받는다`,
    );
  }
  const texts = [];
  for (const [f, kv] of fields) {
    const eq = kv.indexOf('=');
    if (eq <= 0) throw new Error(`${f} 는 key=value 꼴이어야 한다`);
    const key = kv.slice(0, eq);
    const value = kv.slice(eq + 1);
    if (f === '--field' && value.startsWith('@')) {
      const file = value.slice(1);
      if (file === '-' || file === '')
        throw new Error('표준 입력 값(@-)은 검사할 수 없다. 파일로 넘긴다');
      texts.push({ source: file, text: readFile(file) });
    } else {
      texts.push({ source: key, text: value });
    }
  }
  return texts;
}

// ---- hook 모드: PreToolUse(Bash) 훅 ----
// Bash 명령에서 검사 스크립트를 거치지 않고 공개 글을 쓰는 gh 호출을 찾아 막는다(autelon/company#29).
// 셸을 흉내 낸 간단한 분해라 변수에 담은 명령, eval, bash -c 안의 명령 등은 잡지 못한다. 실수 방지용이다.
// 도움말만 보는 호출(gh issue create --help)은 글을 쓰지 않으므로 통과한다(isHelpOnly).

// 명령 문자열을 단순 명령(단어 배열)들로 나눈다. 따옴표 안은 한 단어로 묶고, 연산자(; & | ( ) 줄바꿈 백틱)에서 끊는다.
// here-document 본문은 명령이 아니므로 건너뛴다.
export function splitCommands(command) {
  const commands = [];
  let words = [];
  let word = null;
  let quote = null;
  const heredocs = [];
  const endWord = () => {
    if (word !== null) words.push(word);
    word = null;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < command.length) word += command[++i];
      else word += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      word ??= '';
      continue;
    }
    if (c === '\\' && i + 1 < command.length) {
      if (command[i + 1] !== '\n') word = (word ?? '') + command[i + 1];
      i++;
      continue;
    }
    if (c === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      const m = command.slice(i).match(/^<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
      if (m) {
        endWord();
        heredocs.push(m[2]);
        i += m[0].length - 1;
        continue;
      }
    }
    if (c === '\n') {
      endCommand();
      // 이 줄에서 연 here-document 본문을 건너뛴다.
      for (const tag of heredocs.splice(0)) {
        const rest = command.slice(i + 1);
        const re = new RegExp(`^[\\t ]*${tag}[\\t ]*$`, 'm');
        const m = re.exec(rest);
        i = m ? i + 1 + m.index + m[0].length - 1 : command.length;
      }
      continue;
    }
    if (';&|()`'.includes(c) || (c === '$' && command[i + 1] === '(')) {
      endCommand();
      if (c === '$') i++;
      continue;
    }
    if (c === ' ' || c === '\t') {
      endWord();
      continue;
    }
    word = (word ?? '') + c;
  }
  endCommand();
  return commands;
}

// 명령 앞의 변수 대입과 감싸는 명령(command, env, xargs, timeout, mise exec -- 등)을 걷어 실제 명령을 찾는다.
const WRAPPERS = new Set([
  'command',
  'exec',
  'builtin',
  'noglob',
  'nohup',
  'time',
  'sudo',
  'env',
  'xargs',
  'caffeinate',
  'stdbuf',
]);
// 값을 받는 감싸는 명령의 플래그
const WRAPPER_VALUE_FLAGS = {
  timeout: new Set(['-s', '--signal', '-k', '--kill-after']),
  nice: new Set(['-n']),
};
function stripWrappers(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) i++;
    else if (WRAPPERS.has(w)) {
      i++;
      while (i < words.length && words[i].startsWith('-')) i++;
    } else if (w === 'timeout' || w === 'nice') {
      const valueFlags = WRAPPER_VALUE_FLAGS[w];
      i++;
      while (i < words.length && words[i].startsWith('-')) i += valueFlags.has(words[i]) ? 2 : 1;
      if (w === 'timeout') i++; // 시간 값
    } else if (w === 'mise' && words[i + 1] === 'exec') {
      const dd = words.indexOf('--', i);
      i = dd < 0 ? words.length : dd + 1;
    } else break;
  }
  return words.slice(i);
}

// gh 는 그룹 앞과 그룹·하위 명령 사이의 -R/--repo 도 받는다(gh -R o/r issue list, gh issue -R o/r list).
// 판정 전에 두 자리에서 걷어 내고, 하위 명령 뒤는 그대로 둔다.
function stripGhRepo(args) {
  const out = [];
  let i = 0;
  while (i < args.length && out.length < 2) {
    const w = args[i];
    if (w === '-R' || w === '--repo') i += 2;
    else if (/^(-R.|--repo=)/.test(w)) i++;
    else out.push(args[i++]);
  }
  return [...out, ...args.slice(i)];
}

const basename = (w) => w.slice(w.lastIndexOf('/') + 1);
const hasFlag = (args, longs, shorts) =>
  args.some(
    (a) =>
      longs.some((l) => a === l || a.startsWith(`${l}=`)) ||
      shorts.some((s) => a === s || (a.startsWith(s) && !a.startsWith('--'))),
  );
// 글이 담긴 REST 자원. 이 경로로 쓰는(GET 이 아닌) 호출은 검사 스크립트를 거쳐야 한다.
const TEXT_REST =
  /^repos\/[^/]+\/[^/]+\/(issues\/\d+\/comments|issues\/comments\/\d+|pulls\/\d+\/(comments|reviews)(\/\d+)?|pulls\/comments\/\d+|milestones(\/\d+)?|labels(\/[^/]+)?|releases(\/\d+)?)$/;
// 이슈·PR 자체는 제목·본문을 쓸 때만 글이다(state·labels·assignees 같은 필드만 바꾸면 통과).
const ISSUE_REST = /^repos\/[^/]+\/[^/]+\/(issues|pulls)(\/\d+)?$/;
const ISSUE_TEXT_KEYS = new Set(['title', 'body']);
// gh api 의 값을 받지 않는 플래그. 엔드포인트를 찾을 때 쓴다.
const API_BOOL = new Set([
  '--paginate',
  '--silent',
  '--slurp',
  '-i',
  '--include',
  '--verbose',
  '--allow-escape-sequences',
]);
// 글을 쓰는 GraphQL mutation. Project 필드·화면 mutation 은 playbook 의 고정 문구라 막지 않는다.
const TEXT_MUTATION =
  /\b(addComment|updateIssueComment|createIssue|updateIssue|createPullRequest|updatePullRequest|addPullRequestReview|addPullRequestReviewComment|addPullRequestReviewThread|submitPullRequestReview|updatePullRequestReview|updatePullRequestReviewComment|createDiscussion|updateDiscussion|addDiscussionComment|updateDiscussionComment|createLabel|updateLabel|createRelease|updateRelease)\b/;

// 훅이 판정에 읽는 파일. 일반 파일만, 1MB 까지 읽는다(FIFO·장치 파일에서 멈추지 않게).
function readSmallFile(f) {
  const st = statSync(f);
  if (!st.isFile() || st.size > 1024 * 1024)
    throw Object.assign(new Error(`일반 파일이 아니거나 너무 크다: ${f}`), {
      code: 'NOT_SMALL_FILE',
    });
  return readFileSync(f, 'utf8');
}

// 막는 이유와 안내. via: script(같은 인자로 검사 스크립트), other(스크립트가 받지 않음, 안내 문구),
// unreadable(판정에 필요한 파일을 못 읽음).
const toScript = (what) => ({ what, via: 'script' });
const other = (what, hint) => ({ what, via: 'other', hint });
const NO_SCRIPT = '검사 스크립트가 받지 않는 호출이다. 다른 길을 찾지 말고 사람에게 알린다';

// api 필드 인자(-f/-F/--field/--raw-field)의 키 목록
function apiFieldKeys(a) {
  const keys = [];
  for (let i = 0; i < a.length; i++) {
    const w = a[i];
    let v;
    if (w === '-f' || w === '-F' || w === '--field' || w === '--raw-field') v = a[++i];
    else if (/^--(raw-)?field=/.test(w)) v = w.slice(w.indexOf('=') + 1);
    else if (/^-[fF]./.test(w)) v = w.slice(2);
    if (v !== undefined) keys.push(v.split('=')[0].replace(/\[\]$/, ''));
  }
  return keys;
}

// 도움말만 보는 호출인가(autelon/company#55). 명령에 그대로 적힌 단어가 그룹·하위 명령, --help·-h, 위치 인자,
// -R/--repo 와 그 값뿐이고 도움말 플래그가 하나 이상이면 true. gh 는 도움말 플래그가 있으면 도움말만 찍고 명령을
// 실행하지 않는다. 막는 하위 명령 중 -h 를 다른 뜻으로 쓰는 것은 없다(gh 2.102.0 의 gh help <명령>).
// 판정은 셸이 펼치기 전 글자를 본다. 그래서:
// - 적힌 플래그가 도움말과 -R 말고 하나라도 있으면 false 다. 값을 받는 플래그 뒤의 --help 는 그 플래그의 값이 되어
//   명령이 실행되고(--title --help), --help=false 도 실행된다. 플래그마다 값을 받는지 흉내 내지 않으려고 섞인
//   도움말(gh issue create -t x --help)은 그대로 막는다. 묶은 짧은 플래그(-hL)와 -- 도 같다.
// - 위치 인자와 -R 값은 셸이 펼치지 않는 글자(LITERAL)만 받는다. $V, ${V}, $'..', {a,b}, 글롭(* ? [), ~, 리다이렉트는
//   펼친 뒤에 --help=false 같은 플래그가 될 수 있어 false 다. 따옴표를 벗긴 뒤의 글자를 보므로 따옴표로 감싼
//   리터럴('*')도 false 다(splitCommands 가 따옴표 여부를 남기지 않는다). # 은 단어 맨 앞이면 주석이 되어 뒤의
//   --help 를 지우므로 받지 않는다.
// - $( 나 백틱, xargs 처럼 판정이 볼 수 없는 인자가 붙는 경우는 bashViolation 이 helpPass: false 로 끈다.
const LITERAL = /^[A-Za-z0-9._/:@+=-]+$/;
const isLiteral = (w) => typeof w === 'string' && LITERAL.test(w) && !w.startsWith('-');
function isHelpOnly(rawArgs) {
  let i = 0;
  const repoValue = (w, next) => {
    if (w === '-R' || w === '--repo') return isLiteral(next) ? 2 : 0;
    const m = w.match(/^(?:-R=?|--repo=)(.+)$/);
    return m && isLiteral(m[1]) ? 1 : 0;
  };
  // 그룹 앞과 그룹·하위 명령 사이의 -R
  const skipRepo = () => {
    while (i < rawArgs.length && /^(-R|--repo)/.test(rawArgs[i])) {
      const n = repoValue(rawArgs[i], rawArgs[i + 1]);
      if (!n) return false;
      i += n;
    }
    return true;
  };
  for (let k = 0; k < 2; k++) {
    if (!skipRepo() || !isLiteral(rawArgs[i])) return false;
    i++;
  }
  let help = false;
  for (; i < rawArgs.length;) {
    const w = rawArgs[i];
    if (w === '--help' || w === '-h') {
      help = true;
      i++;
    } else if (/^(-R|--repo)/.test(w)) {
      // -R/--repo 의 값은 도움말 플래그로 세지 않는다(-R --help 는 리터럴이 아니라 false).
      const n = repoValue(w, rawArgs[i + 1]);
      if (!n) return false;
      i += n;
    } else if (isLiteral(w)) i++;
    else return false;
  }
  return help;
}

// gh 인자 하나(gh 다음부터)가 막을 호출이면 { what, via, hint } 를, 아니면 null 을 돌려준다.
// helpPass: 도움말만 보는 호출을 통과시킬지. bashViolation 이 판정이 볼 수 없는 인자가 붙는 경우에 끈다.
export function ghViolation(
  rawArgs,
  readFile = readSmallFile,
  resolvePath = (f) => f,
  { helpPass = true } = {},
) {
  if (helpPass && isHelpOnly(rawArgs)) return null;
  const args = stripGhRepo(rawArgs);
  const [group, sub] = args;
  const rest = args.slice(2);
  if (group === 'issue' || group === 'pr') {
    if (sub === 'create' || sub === 'comment') return toScript(`gh ${group} ${sub}`);
    if (sub === 'edit') {
      try {
        if (textsFromGhArgs(args, (f) => readFile(resolvePath(f))).length)
          return toScript(`gh ${group} edit (제목·본문)`);
      } catch {
        return toScript(`gh ${group} edit`);
      }
      return null;
    }
    if (sub === 'close' && hasFlag(rest, ['--comment'], ['-c']))
      return other(
        `gh ${group} close --comment`,
        `코멘트는 먼저 검사 스크립트로 올리고(gh ${group} comment) close 는 --comment 없이 실행한다`,
      );
    if (
      group === 'pr' &&
      sub === 'review' &&
      hasFlag(rest, ['--body', '--body-file'], ['-b', '-F'])
    )
      return other(
        'gh pr review (본문)',
        '리뷰 글은 검사 스크립트로 PR 코멘트에 올리고 review 는 본문 없이 실행한다',
      );
    if (
      group === 'pr' &&
      sub === 'merge' &&
      hasFlag(rest, ['--body', '--body-file', '--subject'], ['-b', '-F', '-t'])
    )
      return other('gh pr merge (커밋 제목·본문)', '머지는 제목·본문 플래그 없이 실행한다');
    return null;
  }
  if (group === 'label' && (sub === 'create' || sub === 'edit')) return toScript(`gh label ${sub}`);
  if (
    group === 'release' &&
    (sub === 'create' || sub === 'edit') &&
    hasFlag(rest, ['--notes', '--notes-file', '--title'], ['-n', '-F', '-t'])
  )
    return other(`gh release ${sub} (제목·노트)`, NO_SCRIPT);
  if (group === 'api') {
    const a = args.slice(1);
    let endpoint = '';
    for (let i = 0; i < a.length; i++) {
      const w = a[i];
      if (!w.startsWith('-')) {
        endpoint = w;
        break;
      }
      // 값이 붙지 않은 값 플래그(-X PATCH, --jq .x)는 다음 단어가 값이다.
      if (!API_BOOL.has(w) && (/^-[A-Za-z]$/.test(w) || (w.startsWith('--') && !w.includes('='))))
        i++;
    }
    const isMethod = (w) => w === '-X' || w === '--method' || /^(-X.|--method=)/.test(w);
    // gh 는 -X 를 여러 번 주면 마지막 값을 쓴다. 판정이 갈리지 않게 여러 번이면 막는다(gh 모드도 거절한다).
    if (a.filter(isMethod).length > 1) return other('gh api (-X 여러 번)', '-X 는 한 번만 쓴다');
    const methodIdx = a.findIndex(isMethod);
    const method = (
      methodIdx < 0
        ? ''
        : /^(-X|--method)$/.test(a[methodIdx])
          ? (a[methodIdx + 1] ?? '')
          : a[methodIdx].replace(/^(-X=?|--method=)/, '')
    ).toUpperCase();
    const hasInput = hasFlag(a, ['--input'], []);
    const hasFields = hasInput || hasFlag(a, ['--field', '--raw-field'], ['-f', '-F']);
    if (endpoint === 'graphql') {
      let body = a.join(' ');
      const files = [];
      const inputIdx = a.findIndex((w) => w === '--input' || w.startsWith('--input='));
      if (inputIdx >= 0)
        files.push(a[inputIdx] === '--input' ? a[inputIdx + 1] : a[inputIdx].slice(8));
      for (const w of a) {
        const m = w.match(/^[A-Za-z_]+=@(.+)$/);
        if (m && m[1] !== '-') files.push(m[1]);
      }
      for (const file of files) {
        try {
          body += ` ${readFile(file)}`;
        } catch {
          return {
            what: `gh api graphql (파일 ${file} 을 읽지 못함)`,
            via: 'unreadable',
            hint: '글을 쓰는 mutation 인지 판정하지 못했다. 파일 경로를 확인하고(같은 명령 안의 cd 는 따라간다) 다시 실행한다',
          };
        }
      }
      return TEXT_MUTATION.test(body)
        ? other('gh api graphql (글을 쓰는 mutation)', NO_SCRIPT)
        : null;
    }
    const writes = method ? method !== 'GET' : hasFields;
    if (!writes) return null;
    const path = endpoint.replace(/^\//, '').replace(/\?.*$/, '');
    const what = `gh api ${method || 'POST'} ${endpoint}`;
    if (TEXT_REST.test(path)) {
      // 검사 스크립트 gh 모드가 받는 두 가지(마일스톤, 이슈 코멘트 고치기)는 스크립트로 안내한다.
      // -F key=@파일 은 같은 명령의 cd 를 따른 경로로 바꿔 모양만 본다(파일을 못 읽는 것과 받지 않는 호출을 가른다).
      const resolved = args.map((w) => {
        const m = w.match(/^([^=@-][^=]*)=@(.+)$/);
        return m && m[2] !== '-' ? `${m[1]}=@${resolvePath(m[2])}` : w;
      });
      try {
        textsFromGhArgs(resolved, readFile);
        return toScript(what);
      } catch (err) {
        if (err?.code === 'ENOENT' || err?.code === 'EISDIR' || err?.code === 'NOT_SMALL_FILE')
          return {
            what: `${what} (본문 파일을 읽지 못함)`,
            via: 'unreadable',
            hint: '본문 파일 경로를 확인한다(같은 명령 안의 cd 는 따라간다). 그다음 같은 인자로 검사 스크립트를 실행한다',
          };
        return other(what, NO_SCRIPT);
      }
    }
    // 필드와 쿼리 문자열로 준 키(title·body, 커밋 제목·본문)를 본다.
    const queryKeys = [
      ...new URLSearchParams(
        endpoint.includes('?') ? endpoint.slice(endpoint.indexOf('?') + 1) : '',
      ).keys(),
    ];
    // PR 머지 API 의 커밋 제목·본문(gh pr merge --subject/--body 와 같다)
    if (
      /^repos\/[^/]+\/[^/]+\/pulls\/\d+\/merge$/.test(path) &&
      (hasInput ||
        [...apiFieldKeys(a), ...queryKeys].some(
          (k) => k === 'commit_title' || k === 'commit_message',
        ))
    )
      return other(
        `${what} (커밋 제목·본문)`,
        '머지는 gh pr merge 로 제목·본문 플래그 없이 실행한다',
      );
    if (
      ISSUE_REST.test(path) &&
      (hasInput || [...apiFieldKeys(a), ...queryKeys].some((k) => ISSUE_TEXT_KEYS.has(k)))
    )
      return other(
        `${what} (제목·본문)`,
        '이슈·PR 제목·본문은 검사 스크립트의 gh issue|pr create|edit 로 쓴다',
      );
    return null;
  }
  return null;
}

// Bash 명령 문자열에서 막을 gh 호출을 찾는다. 없으면 null. 같은 명령 안의 cd 를 따라가 상대 경로 파일을 읽는다.
export function bashViolation(command, cwd = process.cwd()) {
  let dir = cwd;
  // $( 와 백틱은 splitCommands 가 끊어 버려 gh 인자에 무엇이 붙는지 볼 수 없다. 이때는 도움말 통과를 끈다.
  const substitution = /\$\(|`/.test(command);
  for (const words of splitCommands(command)) {
    const cmd = stripWrappers(words);
    if (!cmd.length) continue;
    if (cmd[0] === 'cd') {
      const to = cmd[1];
      if (to && to !== '-' && !to.startsWith('~')) dir = pathResolve(dir, to);
      continue;
    }
    // 검사 스크립트를 거치는 호출은 통과한다(스크립트가 안에서 띄우는 gh 는 Bash 도구 호출이 아니다).
    if (
      basename(cmd[0]) === 'node' &&
      cmd.slice(1).some((w) => basename(w) === 'privacy-check.mjs')
    )
      continue;
    if (basename(cmd[0]) !== 'gh') continue;
    // xargs 는 표준 입력의 단어를 gh 인자 뒤에 붙인다. 걷어 낸 감싸는 명령에 xargs 가 있으면 도움말 통과를 끈다.
    const viaXargs = words.slice(0, words.length - cmd.length).some((w) => basename(w) === 'xargs');
    const found = ghViolation(
      cmd.slice(1),
      (f) => readSmallFile(pathResolve(dir, f)),
      (f) => pathResolve(dir, f),
      { helpPass: !substitution && !viaXargs },
    );
    if (found) return found;
  }
  return null;
}

function hook() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0; // 입력을 못 읽으면 막지 않는다(훅 고장으로 모든 Bash 가 막히지 않게).
  }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return 0;
  const found = bashViolation(command, typeof input.cwd === 'string' ? input.cwd : process.cwd());
  if (!found) return 0;
  const script = fileURLToPath(import.meta.url);
  const how =
    found.via === 'script'
      ? `공개 글을 쓰므로 검사 스크립트로 실행한다: node "${script}" gh <같은 인자>. 본문은 local/ 아래 파일로 넘긴다(-F).`
      : `${found.hint}.`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `autelon: ${found.what} 를 막았다. ${how} 규칙: director 스킬 "이슈 쓰기 규칙", playbooks/issues.md 1절.`,
      },
    }),
  );
  return 0;
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
  if (mode === 'hook') return hook();
  console.error(
    '사용: privacy-check.mjs scan [파일|-] | privacy-check.mjs gh <gh 인자...> | privacy-check.mjs hook',
  );
  return 2;
}

// 테스트에서 import 할 때는 실행하지 않는다.
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  process.exit(main(process.argv.slice(2)));
}
