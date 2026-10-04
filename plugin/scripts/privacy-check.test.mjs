// privacy-check.mjs 의 패턴 검사. 실행: pnpm test
// 탐지 대상 문자열은 조각을 이어 붙여 만든다. 이 파일 자체가 개인 정보 검사(diff grep, 보안 검토)에 걸리지 않게 하기 위해서다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scan, textsFromGhArgs } from './privacy-check.mjs';

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
