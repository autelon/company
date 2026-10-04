// privacy-check.mjs 의 패턴 검사. 실행: pnpm test
// 탐지 대상 문자열은 조각을 이어 붙여 만든다. 이 파일 자체가 개인 정보 검사(diff grep, 보안 검토)에 걸리지 않게 하기 위해서다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scan, textsFromGhArgs, bashViolation, splitCommands } from './privacy-check.mjs';

const kinds = (text) => scan(text).map((h) => h.kind);

const BLOCKED = {
  'Notion 주소': 'https://www.' + 'notion' + '.so/page',
  'Notion 참조': 'collection' + '://abc',
  '사용자 홈 경로': '/Us' + 'ers/alice/dev',
  '홈 기준 경로': '경로 ' + '~' + '/dev/x',
  '임시 폴더 경로': '/private' + '/tmp/' + 'claude-' + '501/x',
  '개인 메일': 'alice' + '@' + 'gmail' + '.com',
  '32자리 ID': 'id ' + 'a'.repeat(32) + ' 끝',
  UUID: ['12345678', '1234', '1234', '1234', '123456789abc'].join('-'),
  'GitHub 토큰': 'gh' + 'p_' + 'A'.repeat(36),
  'API 키': 'sk' + '-ant-' + 'x'.repeat(30),
  '개인 키': '-----BEGIN ' + 'RSA PRIVATE KEY-----',
  'URL 속 자격 증명': 'https://user' + ':pass' + '@example.com',
};

for (const [kind, text] of Object.entries(BLOCKED)) {
  test(`막는다: ${kind}`, () => {
    assert.ok(kinds(text).includes(kind), `${kind} 를 잡지 못함`);
  });
}

test('통과: 40자리 git SHA, 저장소 상대 경로, noreply 메일, 저장소 이름', () => {
  const ok = [
    'head ' + 'b'.repeat(40),
    'plugin/scripts/privacy-check.mjs',
    'noreply' + '@anthropic.com',
    'autelon/logistics-hub#36',
    '~~취소선~~',
    'GET /users/{id}',
    '/homepage/index',
  ].join('\n');
  assert.deepEqual(scan(ok), []);
});

test('찾은 값은 앞 4자만 남긴다', () => {
  const [hit] = scan('gh' + 'p_' + 'A'.repeat(36));
  assert.equal(hit.masked, 'ghp_****');
});

test('gh 인자: 본문 파일과 제목을 뽑는다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pc-'));
  const file = path.join(dir, 'body.md');
  writeFileSync(file, '본문');
  const texts = textsFromGhArgs(['issue', 'comment', '12', '--body-file', file, '--title=제목']);
  assert.deepEqual(
    texts.map((t) => t.text),
    ['본문', '제목'],
  );
});

test('gh 인자: 붙여 쓴 짧은 플래그의 값도 검사한다', () => {
  const texts = textsFromGhArgs([
    'issue',
    'comment',
    '1',
    '-Rautelon/company',
    '-b=본문',
    '-t제목',
  ]);
  assert.deepEqual(
    texts.map((t) => t.text),
    ['본문', '제목'],
  );
});

test('gh 인자: 검사할 수 없는 글과 코멘트 삭제는 거절한다', () => {
  const body = ['-b', '본문'];
  for (const bad of [
    ['api', 'repos/x/y'],
    ['issue', 'comment', '1', '-F', '-'],
    ['issue', 'comment', '1', '-F-'],
    ['pr', 'create', '--fill'],
    ['pr', 'create', '-f', '-t', '제목', ...body],
    ['pr', 'create', '--fill-first', ...body],
    ['issue', 'create', '-e', ...body],
    ['issue', 'create', '--web', ...body],
    ['issue', 'create', '-T', 'bug', ...body],
    ['issue', 'create', '--recover', 'x', ...body],
    ['issue', 'comment', '1', '--delete-last'],
    ['issue', 'create', '-dw', ...body],
    ['issue', 'comment', '1', '--', '-b', 'x'],
  ]) {
    assert.throws(() => textsFromGhArgs(bad), undefined, bad.join(' '));
  }
});

test('gh 인자: create·comment 는 본문이 있어야 한다, edit 는 없어도 된다', () => {
  assert.throws(() => textsFromGhArgs(['issue', 'create', '-t', '제목']));
  assert.throws(() => textsFromGhArgs(['pr', 'create', '-b', '본문']));
  assert.equal(textsFromGhArgs(['pr', 'create', '-t', '제목', '-b', '본문']).length, 2);
  assert.throws(() => textsFromGhArgs(['issue', 'comment', '1']));
  assert.deepEqual(textsFromGhArgs(['issue', 'edit', '1', '--add-label', 'decision']), []);
});

// autelon/company#28: 웹 주소·라우트의 홈 경로와 예시 UUID 는 넘기고, 실제 홈 경로와 무작위 UUID 는 막는다.
const HOME = '/ho' + 'me/';
test('홈 경로: 웹 주소·HTTP 라우트는 통과, 경로 맨 앞의 홈은 막는다', () => {
  assert.deepEqual(scan('https://example.com' + HOME + 'about'), []);
  assert.deepEqual(scan('localhost:3000' + HOME + 'x'), []);
  assert.deepEqual(scan('GET ' + HOME + 'dashboard'), []);
  for (const bad of [
    HOME + 'alice/dev',
    '경로 ' + HOME + 'bob',
    '`' + HOME + 'carol`',
    'file://' + HOME + 'dan',
  ]) {
    assert.ok(kinds(bad).includes('사용자 홈 경로'), bad);
  }
});

test('UUID: nil·예시 값은 통과, 같은 줄의 다른 UUID 는 막는다', () => {
  const nil = ['00000000', '0000', '0000', '0000', '000000000000'].join('-');
  const example = ['123e4567', 'e89b', '12d3', 'a456', '426614174000'].join('-');
  const other = ['12345678', '1234', '1234', '1234', '123456789abc'].join('-');
  assert.deepEqual(scan(nil + ' ' + example), []);
  assert.deepEqual(kinds(example + ' ' + other), ['UUID']);
});

test('32자 해시는 Notion ID 와 가를 수 없어 막는다', () => {
  assert.ok(kinds('md5 ' + '0123456789abcdef'.repeat(2)).includes('32자리 ID'));
});

// autelon/company#27: 라벨 이름·설명, 마일스톤, 코멘트 고치기도 검사 뒤 실행한다.
test('gh label: 이름·새 이름·설명을 뽑고 다른 하위 명령과 모르는 플래그는 거절한다', () => {
  assert.deepEqual(
    textsFromGhArgs([
      'label',
      'create',
      'agent:ready',
      '-R',
      'o/r',
      '-c',
      '1D76DB',
      '--description=설명',
    ]).map((t) => t.text),
    ['agent:ready', '설명'],
  );
  assert.deepEqual(
    textsFromGhArgs(['label', 'edit', 'a', '-n', 'b', '-d', '설명']).map((t) => t.text),
    ['a', 'b', '설명'],
  );
  for (const bad of [
    ['label', 'delete', 'a'],
    ['label', 'create', 'a', '--web'],
    ['label', 'create', 'a', '-fd', 'x'],
    ['label', 'create'],
    ['label', 'create', 'a', '-n', 'b'],
    ['label', 'create', 'a', '--', '-d', 'x'],
  ]) {
    assert.throws(() => textsFromGhArgs(bad), undefined, bad.join(' '));
  }
});

test('gh api: 마일스톤 만들기·고치기와 코멘트 고치기만 받고 필드 값을 모두 뽑는다', () => {
  assert.deepEqual(
    textsFromGhArgs([
      'api',
      'repos/o/r/milestones',
      '-f',
      'title=M-01 첫',
      '-f',
      'description=한 줄',
    ]).map((t) => t.text),
    ['M-01 첫', '한 줄'],
  );
  assert.equal(
    textsFromGhArgs(['api', 'repos/o/r/milestones/3', '-X', 'PATCH', '-f', 'state=closed']).length,
    1,
  );
  const dir = mkdtempSync(path.join(tmpdir(), 'pc-'));
  const file = path.join(dir, 'body.md');
  writeFileSync(file, '고친 코멘트');
  assert.deepEqual(
    textsFromGhArgs([
      'api',
      '-X',
      'PATCH',
      'repos/o/r/issues/comments/9',
      '-F',
      `body=@${file}`,
    ]).map((t) => t.text),
    ['고친 코멘트'],
  );
  for (const bad of [
    ['api', 'repos/o/r/milestones'],
    ['api', 'repos/o/r/milestones/3', '-f', 'state=closed'],
    ['api', 'repos/o/r/issues/comments/9', '-f', 'body=x'],
    ['api', '-X', 'PATCH', 'repos/o/r/issues/comments/9', '-F', 'body=@-'],
    ['api', '-X', 'DELETE', 'repos/o/r/issues/comments/9', '-f', 'a=b'],
    ['api', 'repos/o/r/milestones', '--input', file],
    ['api', 'graphql', '-f', 'query=x'],
    ['api', 'repos/o/r/issues', '-f', 'title=x'],
    ['api', 'repos/o/r/milestones', '-f', 'title'],
    ['api', 'repos/o/r/milestones', '--paginate', '-f', 'title=x'],
    ['api', '-X', 'PATCH', '-X', 'DELETE', 'repos/o/r/issues/comments/9', '-f', 'body=x'],
    ['api', '-X', 'PATCH', 'repos/o/r?/milestones/1', '-f', 'title=x'],
    ['api', 'repos/o/r#x/milestones', '-f', 'title=x'],
  ]) {
    assert.throws(() => textsFromGhArgs(bad), undefined, bad.join(' '));
  }
});

// autelon/company#29: 훅은 스크립트를 거치지 않은 gh 글쓰기만 막는다.
test('훅: 스크립트 밖 gh 글쓰기를 막는다', () => {
  const S = 'node plugin/scripts/privacy-check.mjs';
  for (const bad of [
    'gh issue comment 1 -F local/c.md',
    'gh issue create -t 제목 -b 본문',
    'gh pr comment 3 --body x',
    'gh issue edit 1 --title 새 제목',
    'gh issue close 1 --comment 끝',
    'gh pr review 2 --approve -b 좋음',
    'gh pr merge 2 --subject x',
    'gh label create a --description d',
    'gh api repos/o/r/milestones -f title=x',
    'gh api -X PATCH repos/o/r/issues/comments/9 -F body=@x.md',
    'gh api --silent -X POST repos/o/r/issues/1/comments -f body=x',
    "gh api graphql -f query='mutation { addComment(input:{}) { clientMutationId } }'",
    `${S} scan x && gh issue comment 1 -b x`,
    'cd x; gh issue comment 1 -b x',
    'FOO=1 command gh issue comment 1 -b x',
    'mise exec -- gh pr create -t a -b b',
    '/usr/local/bin/gh issue comment 1 -b x',
    'echo $(gh issue comment 1 -b x)',
    'gh api -X GET -X PATCH repos/o/r/issues/comments/9 -f body=x',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
});

test('훅: 스크립트 경유, 읽기, 글 없는 쓰기, 글 속의 명령 문자열은 통과한다', () => {
  const S = 'node plugin/scripts/privacy-check.mjs';
  for (const ok of [
    `${S} gh issue comment 1 -F local/c.md`,
    `${S} gh api repos/o/r/milestones -f title=x`,
    'gh issue list --label agent:ready',
    'gh issue view 1 --comments',
    'gh issue edit 1 --add-label agent:ready --remove-label agent:needs-user',
    'gh issue close 1 --reason completed',
    'gh pr merge 2 --match-head-commit abc',
    'gh pr review 2 --approve',
    'gh api repos/o/r/issues --paginate',
    'gh api -X PUT repos/o/r/issues/1/sub_issues -f sub_issue_id=3',
    "gh api graphql -f query='query { viewer { login } }'",
    "gh api graphql -f query='mutation { updateProjectV2Field(input:{}) { clientMutationId } }'",
    'git commit -m "gh issue comment 을 스크립트로 바꿈"',
    "echo 'gh issue comment 1 -b x' > local/note.md",
    'cat > local/c.md <<EOF\ngh issue comment 1 -b x\nEOF\ngit status',
    "cat <<'END'\n  gh pr create -t a -b b\nEND",
  ]) {
    assert.equal(bashViolation(ok), null, ok);
  }
});

test('훅: here-document 뒤의 명령은 다시 본다', () => {
  assert.ok(bashViolation('cat > a <<EOF\nx\nEOF\ngh issue comment 1 -b x'));
  assert.deepEqual(splitCommands('a "b c" | d'), [['a', 'b c'], ['d']]);
});

// autelon/company#40: 훅 판정 보완
test('훅: 감싸는 명령·하위 명령 앞 -R·릴리스 글·이슈 제목 PATCH 를 막는다', () => {
  for (const bad of [
    'timeout 30 gh issue comment 1 -b x',
    'timeout -s KILL 30 gh pr create -t a -b b',
    'nice -n 5 gh issue create -t a -b b',
    'gh -R o/r issue comment 1 -b x',
    'gh --repo=o/r pr comment 1 -b x',
    'gh release create v1 --notes 노트',
    'gh release edit v1 -t 제목',
    'gh api -X PATCH repos/o/r/issues/3 -f title=x',
    'gh api -X PATCH repos/o/r/pulls/3 -f body=x',
    'gh api repos/o/r/issues -f title=x',
    'gh api -X PATCH repos/o/r/issues/3 --input body.json',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
});

test('훅: 글 없는 이슈 PATCH, 노트 없는 릴리스, 생성 노트는 통과한다', () => {
  for (const ok of [
    'gh api -X PATCH repos/o/r/issues/3 -f state=closed',
    'gh api -X PATCH repos/o/r/issues/3 -f type=Bug',
    'gh api -X POST repos/o/r/issues/3/labels -f labels[]=decision',
    'gh release create v1 --generate-notes',
    'gh release list',
    'gh -R o/r issue list',
  ]) {
    assert.equal(bashViolation(ok), null, ok);
  }
});

test('훅: 스크립트가 받는 호출은 스크립트로, 받지 않는 호출은 다른 안내로 막는다', () => {
  assert.equal(bashViolation('gh issue comment 1 -b x').via, 'script');
  assert.equal(bashViolation('gh api repos/o/r/milestones -f title=x').via, 'script');
  assert.equal(bashViolation('gh issue close 1 --comment x').via, 'other');
  assert.equal(bashViolation('gh release create v1 -n x').via, 'other');
  assert.equal(bashViolation('gh api repos/o/r/releases -f body=x').via, 'other');
});

test('훅: graphql --input 은 같은 명령 안의 cd 를 따라 읽고, 못 읽으면 따로 안내한다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pc-'));
  writeFileSync(
    path.join(dir, 'q.json'),
    '{"query":"mutation { updateProjectV2Field(input:{}) { clientMutationId } }"}',
  );
  writeFileSync(
    path.join(dir, 'c.json'),
    '{"query":"mutation { addComment(input:{}) { clientMutationId } }"}',
  );
  const root = path.dirname(dir);
  const sub = path.basename(dir);
  assert.equal(bashViolation(`cd ${sub} && gh api graphql --input q.json`, root), null);
  assert.equal(bashViolation(`cd ${sub} && gh api graphql --input c.json`, root).via, 'other');
  assert.equal(bashViolation('gh api graphql --input q.json', root).via, 'unreadable');
});

test('훅: 코멘트 고치기는 cd 를 따른 본문 파일로 스크립트 안내, 파일이 없으면 따로 안내한다', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pc-'));
  writeFileSync(path.join(dir, 'b.md'), '본문');
  const root = path.dirname(dir);
  const sub = path.basename(dir);
  const cmd = 'gh api -X PATCH repos/o/r/issues/comments/9 -F body=@b.md';
  assert.equal(bashViolation(`cd ${sub} && ${cmd}`, root).via, 'script');
  assert.equal(bashViolation(cmd, root).via, 'unreadable');
});

test('훅·gh 모드: 하위 명령 앞 -R 을 같은 인자로 받는다, 그 밖의 안내', () => {
  const args = ['-R', 'o/r', 'issue', 'comment', '1', '-b', '본문'];
  assert.deepEqual(
    textsFromGhArgs(args).map((t) => t.text),
    ['본문'],
  );
  assert.equal(bashViolation(`gh ${args.join(' ')}`).via, 'script');
  assert.match(bashViolation('gh pr close 1 --comment x').hint, /gh pr comment/);
  assert.ok(bashViolation('gh api -X PATCH "repos/o/r/issues/3?body=x"'));
  assert.ok(bashViolation('gh api -X PUT repos/o/r/pulls/3/merge -f commit_title=x'));
  assert.ok(bashViolation('gh api -X PUT "repos/o/r/pulls/3/merge?commit_message=x"'));
  assert.equal(bashViolation('gh api -X PUT repos/o/r/pulls/3/merge -f merge_method=merge'), null);
});

test('훅: 판정에 읽는 파일은 일반 파일 1MB 까지만 읽는다(코멘트 PATCH, issue edit, graphql 모두)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pc-'));
  writeFileSync(path.join(dir, 'big.md'), 'x'.repeat(1024 * 1024 + 1));
  mkdirSync(path.join(dir, 'd.md'));
  for (const f of ['big.md', 'd.md']) {
    assert.equal(
      bashViolation(`gh api -X PATCH repos/o/r/issues/comments/9 -F body=@${f}`, dir).via,
      'unreadable',
      f,
    );
    assert.equal(bashViolation(`gh api graphql --input ${f}`, dir).via, 'unreadable', f);
    // edit 는 못 읽어도 글을 쓰는 호출로 보고 스크립트로 안내한다(스크립트가 실제 파일로 다시 판정한다)
    assert.equal(bashViolation(`gh issue edit 1 -F ${f}`, dir).via, 'script', f);
  }
});

// autelon/company#55: 도움말 플래그만 붙은 호출은 글을 쓰지 않으므로 통과한다.
test('훅: --help·-h 만 붙은 gh 글쓰기 하위 명령은 통과한다', () => {
  for (const ok of [
    'gh issue create --help',
    'gh issue create -h',
    'gh issue comment 1 -h',
    'gh issue edit 1 --help',
    'gh pr create -h',
    'gh pr comment 3 --help',
    'gh pr merge 2 --help',
    'gh label create x --help',
    'gh release create v1 --help',
    'gh api repos/o/r/milestones --help',
    'gh -R o/r issue comment 1 --help',
    'gh issue create -R o/r --help',
    'gh issue create --repo=o/r -h',
    'timeout 30 gh issue create --help',
    'gh help issue create',
  ]) {
    assert.equal(bashViolation(ok), null, ok);
  }
});

test('훅: 다른 플래그와 섞이거나 플래그 값인 --help 는 그대로 막는다', () => {
  for (const bad of [
    'gh issue create -t --help -b x',
    'gh issue create --title --help -b x',
    'gh issue create -t "--help" -b x',
    'gh issue create --title=--help -b x',
    'gh issue create -t=--help -b x',
    'gh issue comment 1 -b --help',
    'gh issue comment 1 -F local/c.md --help',
    'gh issue create -t x -b y --help',
    'gh issue create --help=false -t x -b y',
    'gh issue create --help=true',
    'gh issue create -hb x',
    'gh issue comment 1 -- --help',
    'gh issue comment 1 -R --help',
    'gh issue close 1 --comment --help',
    'gh pr review 2 -b --help',
    'gh api repos/o/r/issues/1/comments -f body=x --help',
    'gh issue create -H --help',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
});

// 셸이 펼친 뒤 --help=false 같은 플래그가 될 수 있는 단어, 판정이 볼 수 없는 인자가 붙는 호출은 도움말로 보지 않는다.
test('훅: 셸 전개·명령 치환·xargs 가 붙은 도움말은 막는다', () => {
  for (const bad of [
    'gh issue create --help $V',
    'gh issue create --help "$V"',
    'gh issue create --help ${A}',
    "gh issue create --help $'--help=false'",
    'gh issue comment $N --help',
    'gh issue comment 1 --help $(cat local/a.txt)',
    'gh issue comment 1 --help `cat local/a.txt`',
    'gh issue list -L 1 && gh issue comment 1 --help `cat local/a.txt`',
    'gh issue comment 1 --help {--help=false,-b,x}',
    'gh issue comment 1 --help *',
    'gh issue comment 1 --help a?',
    'gh issue comment 1 --help [ab]',
    'gh issue comment 1 --help ~',
    'gh issue comment 1 --help <(cat local/a.txt)',
    'gh issue comment 1 #x --help',
    'gh issue create -R $X --help',
    'gh issue create --repo=$X --help',
    'gh -R $X issue create --help',
    'echo "--help=false -b x" | xargs gh issue comment 1 --help',
    'xargs -0 gh issue comment 1 --help < local/a.txt',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
  // 리터럴 글자만 있으면 따옴표가 있어도 통과한다(펼칠 것이 없다)
  assert.equal(bashViolation('gh issue create -R "o/r" --help'), null);
  assert.equal(bashViolation('gh api repos/o/r/milestones/3 --help'), null);
});

// autelon/company#58: gh 는 그룹과 하위 명령 사이의 -R 도 받는다(gh issue -R o/r list).
test('훅·gh 모드: 그룹과 하위 명령 사이의 -R 을 걷어 내고 판정한다', () => {
  for (const bad of [
    'gh issue -R o/r comment 1 -b x',
    'gh issue --repo o/r comment 1 -b x',
    'gh issue --repo=o/r create -t a -b b',
    'gh issue -Ro/r comment 1 -b x',
    'gh pr -R o/r comment 3 --body x',
    'gh pr -R o/r merge 2 --subject x',
    'gh label -R o/r create a --description d',
    'gh release -R o/r create v1 --notes x',
    'gh -R o/r issue -R o/r comment 1 -b x',
    'gh issue -R o/r comment 1 --help $V',
    'gh issue -R $X comment 1 --help',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
  for (const ok of [
    'gh issue -R o/r list -L 1',
    'gh issue -R o/r comment 1 --help',
    'gh pr --repo=o/r merge 2 --match-head-commit abc',
  ]) {
    assert.equal(bashViolation(ok), null, ok);
  }
  // 막힌 호출은 같은 인자로 검사 스크립트가 받는다
  const args = ['issue', '-R', 'o/r', 'comment', '1', '-b', '본문'];
  assert.deepEqual(
    textsFromGhArgs(args).map((t) => t.text),
    ['본문'],
  );
  assert.equal(bashViolation(`gh ${args.join(' ')}`).via, 'script');
  assert.deepEqual(
    textsFromGhArgs(['label', '--repo=o/r', 'create', 'a', '-d', '설명']).map((t) => t.text),
    ['a', '설명'],
  );
});

// autelon/company#58: xargs 의 값을 받는 플래그 뒤의 gh 도 찾는다.
test('훅: 값을 받는 플래그가 붙은 xargs 뒤의 gh 글쓰기를 막는다', () => {
  const S = 'node plugin/scripts/privacy-check.mjs';
  for (const bad of [
    'echo 1 | xargs -n 1 gh issue comment -b x',
    'echo 1 | xargs -I {} gh issue comment {} -b x',
    'xargs -L 1 gh issue comment -b x < local/n.txt',
    'xargs -P 2 -n 1 gh pr comment -b x < local/n.txt',
    'xargs -0 -I % -n 1 gh issue comment % -b x < local/n.txt',
    'xargs -E END -s 100 gh issue comment -b x < local/n.txt',
    'xargs -a local/n.txt -d , gh issue comment -b x',
    'xargs --max-args 1 gh issue comment -b x < local/n.txt',
    'xargs -n1 gh issue comment -b x < local/n.txt',
    'xargs -I{} gh issue comment {} -b x < local/n.txt',
    'xargs --max-args=1 gh issue comment -b x < local/n.txt',
    'xargs -n 1 timeout 5 gh issue comment -b x < local/n.txt',
    'xargs -n 1 gh issue comment 1 --help < local/n.txt',
  ]) {
    assert.ok(bashViolation(bad), bad);
  }
  for (const ok of [
    'echo 1 | xargs -n 1 gh issue view',
    'echo 1 | xargs -I {} gh issue view {} --comments',
    `echo local/c.md | xargs -I {} ${S} gh issue comment 1 -F {}`,
  ]) {
    assert.equal(bashViolation(ok), null, ok);
  }
});
