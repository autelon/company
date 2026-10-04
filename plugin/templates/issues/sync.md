<!-- sync 이슈 본문 (타입 Task). director가 세션 시작 때 버전 비교(director 스킬 "시작할 때" 7번)로 만든다. 이 주석은 지우고 올린다.
     제목: 기준 SHA가 있으면 `autelon sync: <기록 SHA> 이후`, 기준 파일이 없거나 pluginSha가 미정이면 `autelon sync: 기준 버전 정하기`.
     열린 sync 이슈는 제목이 `autelon sync:`로 시작하는 것으로 찾는다. 하나만 열어 둔다.
     라벨: compare 상태가 ahead면 agent:ready, 그 밖(behind, diverged, 비교 실패, 기준 없음)이면 agent:needs-user.
     해당하지 않는 절("사람에게 묻기" 또는 "할 일")은 지운다. -->

## 현재 결론

아직 시작 전.

<!-- 기록 SHA: .claude/autelon-sync.json의 pluginSha(파일이 없으면 "없음"). 설치 SHA: 이 이슈를 만들 때의 값.
     비교 상태: `gh api repos/autelon/company/compare/<기록 SHA>...<설치 SHA> --jq .status`의 값(ahead, behind, diverged). 기준이 없거나 비교가 실패하면 "-" -->

| 항목      | 값           |
| --------- | ------------ |
| 기록 SHA  | `<기록 SHA>` |
| 설치 SHA  | `<설치 SHA>` |
| 비교 상태 | `<상태>`     |

설치 SHA가 바뀌면 director가 `설치 SHA: <12자> (비교 상태: <상태>)` 줄로 코멘트를 더한다. 맞출 대상은 가장 마지막 `설치 SHA:` 줄의 값이다.

## 배경

autelon 플러그인이 이 프로젝트가 마지막으로 맞춘 버전(기록 SHA)에서 바뀌었다. 템플릿·playbook이 바뀌었으면 프로젝트 파일(role, `CLAUDE.md`의 autelon 절, `docs/git-rules.md`, CI, 루틴 지시문, GitHub 라벨·Project)에 맞출 것이 있을 수 있다(autelon/company#42).

바뀐 파일 목록:

```
gh api repos/autelon/company/compare/<기록 SHA>...<설치 SHA> --jq '.files[].filename'
```

## 할 일

<!-- 비교 상태가 ahead일 때 -->

- `autelon:sync-project` 스킬(가칭, autelon/company#67)을 불러 맞춘다. 플러그인에 아직 이 스킬이 없으면 손으로 맞추지 않는다. "sync 스킬 없음"을 코멘트로 남기고 `agent:needs-user`로 넘긴다.
- 맞출 것이 없으면 기준 버전 파일만 올리는 PR로 끝낸다.

## 사람에게 묻기

<!-- 기준 없음: 기준 버전 파일이 없거나 pluginSha가 미정이다. 다음 중 하나를 골라 달라고 쓴다.
     ① 지금 설치 SHA를 기준으로 기록한다(프로젝트 파일이 이미 이 버전에 맞는다고 본다) ② 다른 SHA를 기준으로 준다(그 SHA부터 sync) ③ 프로젝트를 다시 만들 때까지 둔다
     behind / diverged / 비교 실패: 설치된 플러그인이 기록보다 오래됐거나 갈라졌다. 플러그인 업데이트는 사람이 한다. 업데이트할지, 기록이 틀렸는지 묻는다 -->

## 완료 조건

- 맞춘 내용과 `.claude/autelon-sync.json` 갱신(`pluginSha` = 맞춘 설치 SHA, `syncedAt`, `note` = `#<이 이슈>`)이 PR 하나에 들어가 머지됐다.
- 바뀐 템플릿 항목마다 적용 / 프로젝트 유지 / 합침과 이유가 이 이슈 코멘트에 있다.
- 확신이 없는 항목은 `agent:needs-user`로 사람에게 물었다.

## 하지 말 것

- 플러그인을 업데이트하지 않는다(사람이 한다).
- 다른 저장소의 코드·설정·기존 이슈 본문을 고치지 않는다.
