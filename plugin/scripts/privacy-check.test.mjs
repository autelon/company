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

test('gh 인자: 받지 않는 명령과 표준 입력 본문은 거절한다', () => {
  assert.throws(() => textsFromGhArgs(['api', 'repos/x/y']));
  assert.throws(() => textsFromGhArgs(['issue', 'comment', '1', '-F', '-']));
});
