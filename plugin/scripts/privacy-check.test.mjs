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
