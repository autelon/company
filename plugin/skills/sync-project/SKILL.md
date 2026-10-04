---
name: sync-project
description: autelon 플러그인이 바뀌었을 때 프로젝트에 복사된 파일(role, CLAUDE.md의 autelon 절, docs/git-rules.md, CI, .gitignore, 설정)을 새 템플릿에 맞춘다. director가 제목이 "autelon sync:"로 시작하는 sync 이슈를 처리할 때 사용. 템플릿 변경을 절 단위로 판정해 이슈에 먼저 올리고, 모두 정해지면 sync-editor에게 옮기게 해 기준 버전 파일과 함께 PR 하나로 올린다.
---

# 플러그인 버전 맞추기 (sync)

director 세션(사람이 연 세션과 루틴 모두)이 sync 이슈를 처리할 때 이 스킬을 따른다. 판단은 director가 하고, 파일 수정은 공용 role `autelon:sync-editor`가 판정표의 행을 옮기기만 한다(autelon/company#67 결정 1). 근거: autelon/company#42(3-way 판단, 필수 영역은 frontmatter `tools:`, role 수정 PR의 이유 이슈), #66(`ahead`가 아니면 맞추지 않음), #67(이 스킬의 설계와 결정).

- 검사 스크립트: `${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.mjs` (아래 `<S>`)
- 결정 코멘트 템플릿: `${CLAUDE_PLUGIN_ROOT}/templates/issues/comment-decision.md`
- `<o>/<r>`는 프로젝트 저장소, `<N>`은 sync 이슈 번호, `<base>`는 기록 SHA, `<target>`은 대상 SHA(둘 다 12자, 정하는 법은 1번 처음), `<role>`은 role 이름이다.
- `<me>`는 지금 gh 계정이다: `gh api user --jq .login`. 루틴의 `--author @me`와 같은 계정이고, 저장소 소유자(조직 이름)가 아니다. 이 문서에서 "소유 계정이 쓴 코멘트"는 `user.login`이 `<me>`인 코멘트다.
- **판정표 코멘트**: `<me>`가 쓴 코멘트 중 첫 줄(루틴이면 `[루틴]` 다음 줄)이 `대상 SHA: <12자>`로 시작하는 것. 여러 개면 가장 마지막 것이 기준이다(7번).
- **GitHub에 쓰는 일(코멘트, 라벨 바꾸기, PR, 닫기)은 모두 director가 Bash에서 `node <S> gh ...`로 한다.** 스크립트나 node가 child_process로 부르는 `gh`는 PreToolUse 훅을 거치지 않기 때문이다. 글이 없는 명령(`--add-label`, `close`)만 스크립트 없이 실행한다.
- 루틴이 쓰는 코멘트는 첫 줄을 `[루틴]`으로 시작한다(director "이슈 작업 루프").
- **sync 이슈의 사람 답 처리와 PR·머지는 이 스킬이 정한다.** 루틴 지시문의 4번 답 처리와 "PR" 절보다 앞선다(director "이슈 작업 루프"의 sync 이슈 항목). 어느 코멘트가 사람의 답인지는 루틴 지시문 4번의 기준(`[루틴]` 코멘트, role 결과 코멘트, `보낸 곳:` 코멘트는 답이 아니다)을 그대로 쓴다.

표기: **[확인]** 실행으로 확인함 / **[미확인]** 아직 확인하지 못함.

## 0. 언제 부르나

- 제목이 `autelon sync: <기록 SHA> 이후`이고 `agent:ready`인 열린 sync 이슈를 처리할 때.
- `autelon sync: 기준 버전 정하기` 이슈는 이 스킬이 아직 처리하지 않는다. 사람의 답이 와도 고치지 않고, "답 처리 규칙이 아직 없다(autelon/company#74)"를 코멘트로 남기고 `agent:needs-user`로 둔다.
- 처리 순서는 아래 1~11이다. 한 번의 실행에서 가능한 데까지 가고, 멈추는 곳마다 이유를 sync 이슈에 남긴다. 다음 실행은 1번부터 다시 시작해 남긴 기록(판정표, 결정 코멘트, 브랜치, PR)을 보고 이어 간다.

## 1. 입구 검사

매 실행마다 처음에 한다. 하나라도 어긋나면 파일을 고치지 않는다. 이유를 코멘트로 남기고 `agent:ready`를 `agent:needs-user`로 바꾼 뒤 이 이슈를 끝낸다.

먼저 이 이슈의 판정표 코멘트를 찾는다. 있으면 가장 마지막 판정표의 대상 SHA가 `<target>`이다. 없으면 아래 (b)에서 찾은 설치 SHA가 `<target>`이다(2번에서 판정표에 고정한다). (a)·(c)·(d)의 `<target>`은 이 값이다.

- (a) 기준: `git fetch origin` 뒤 `git show origin/main:.claude/autelon-sync.json`의 `pluginSha`를 읽는다. sync 이슈 표의 기록 SHA와 같아야 한다.
  - 다르고, 그 값이 이 이슈의 판정표 `대상 SHA`와 같고, 이 이슈의 sync PR이 머지됐으면(`gh pr list -R <o>/<r> --state merged --head chore/autelon-sync-<target> --json number,mergeCommit`) 11번(마무리)으로 간다(사람이 머지한 경우). 사람의 답 코멘트가 없어도(라벨만 바뀜) 머지가 확인되면 11번으로 간다. 루틴 지시문 4번의 "답 없음"으로 되돌리지 않는다.
  - 그 밖에 다르면 다른 sync가 먼저 머지된 것이다. 멈춘다.
- (b) 설치 SHA 줄: 이슈 본문 표와 **소유 계정(`<me>`)이 쓴** 코멘트에서 `설치 SHA: `로 **시작하는** 줄 중 가장 마지막 것을 찾는다(본문 표만 있으면 표의 값). 판정표 코멘트 안의 줄은 세지 않는다. 그 줄의 비교 상태가 `ahead`여야 한다(#66 결정). 다른 계정의 코멘트는 읽지 않는다.
  ```
  gh issue view <N> -R <o>/<r> --json author,body --jq '.author.login, .body'
  gh api user --jq .login
  gh api repos/<o>/<r>/issues/<N>/comments --paginate --jq '.[] | select(.user.login == "<me>") | {created_at, body}'
  ```
- (c) `gh api repos/autelon/company/compare/<base>...<target> --jq .status`가 `ahead`여야 한다.
- (d) 열린 sync PR: `gh pr list -R <o>/<r> --state open --head chore/autelon-sync-<target> --json number,headRefOid`.
  - 없으면 계속한다.
  - 있고 이 이슈의 판정표가 가리키는 브랜치면 2~8을 다시 하지 않고 9번(검증·리뷰·머지)부터 이어 간다. 9번의 "브랜치 다시 만들기" 조건에 걸리면 거기서 6번이나 8번으로 돌아간다.
  - 그 밖이면(판정표 없이 열린 PR) 멈춘다.

## 2. 대상 SHA 고정

- 이 이슈에 판정표 코멘트(정의는 맨 위)가 이미 있으면 가장 마지막 판정표의 값을 쓴다.
- 없으면 대상 SHA는 1번 (b)에서 찾은 마지막 `ahead` 줄의 설치 SHA다. 7번 판정표 코멘트 첫 줄에 적는다.
- 처리 중에 더 새 `설치 SHA:` 줄이 붙어도 이번 sync를 넓히지 않는다(그 줄이 `ahead`가 아니면 1번 (b)에서 멈춘다). 이 sync가 머지된 뒤 다음 세션의 버전 비교(director "시작할 때" 7번)가 새 sync 이슈를 만든다.
- 지금 세션의 설치 SHA가 대상 SHA와 달라도 진행한다. 템플릿은 로컬 설치본이 아니라 GitHub에서 SHA를 지정해 읽기 때문이다(6번). 판정표 머리의 `이 세션 설치본:`에 지금 값을 적는다(1번 (b)가 판정표 안의 줄을 설치 SHA 줄로 세지 않게 `설치 SHA:`로 쓰지 않는다).

## 3. 범위 정하기

- 바뀐 파일: `gh api repos/autelon/company/compare/<base>...<target> --jq '.files[] | {filename, status, previous_filename}'`. `renamed`는 `previous_filename`이 옛 경로다. 이 목록 전체가 대응표의 마지막 줄("그 밖의 `plugin/`") 보고에 쓰인다.
- 템플릿 범위 맞춰 보기: compare 응답이 잘렸을 때에 대비해 두 SHA의 tree로 맞춰 본다. 범위는 `plugin/templates/` 아래와 `plugin/playbooks/issues.md`만이다.
  ```
  gh api 'repos/autelon/company/git/trees/<sha>?recursive=1' --jq '.truncated, (.tree[] | select(.type == "blob") | select(.path | startswith("plugin/templates/") or . == "plugin/playbooks/issues.md") | "\(.sha) \(.path)")'
  ```
  - 두 SHA에서 blob sha가 다르거나 한쪽에만 있는 경로가 바뀐 파일이다.
  - 이름 바뀜은 쌍으로 센다. compare의 `renamed` 항목(`previous_filename` → `filename`)이 tree에서 옛 SHA에만 있는 경로와 새 SHA에만 있는 경로의 쌍과 같으면 바뀐 파일 하나다. tree에서 한쪽에만 있는 두 경로의 blob sha가 같은데 compare에 `renamed`로 없으면 그 쌍도 이름 바뀜 하나로 센다. 이름 바뀜의 옛 경로를 지워진 파일로 따로 세지 않는다.
  - 이 결과를 compare 목록 중 **같은 범위**(`filename`이나 `previous_filename`이 위 범위에 드는 항목)와 비교한다. 다르면 tree 쪽을 원본으로 하고 판정표에 경고를 적는다. 범위 밖의 compare 항목은 이 비교에 넣지 않는다.
  - `truncated`가 `true`면 멈추고 사람에게 묻는다.
- 바뀐 파일을 아래 대응표로 나눈다. 표에 없는 프로젝트 파일은 대상이 아니다.

| 템플릿(`plugin/` 아래)                                                    | 프로젝트 쪽                 | 정책                                                                                                                    |
| ------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `templates/roles/<role>.md`                                               | `.claude/agents/<role>.md`  | 이름이 같은 것만. 템플릿이 없는 role(도메인 전문가 등)은 대상 아님. 템플릿에 새로 생긴 role은 "새 role 제안"으로 보고만 |
| `templates/project/CLAUDE.template.md`                                    | `CLAUDE.md`                 | 설립 프로젝트는 파일 전체, 도입 프로젝트는 "autelon 운영" 절만(adopt-project가 템플릿에서 가져와 덧붙인 절)             |
| `templates/project/git-rules.md`                                          | `docs/git-rules.md`         | 설립 프로젝트는 전체. 도입 프로젝트는 PR 리뷰어·보안 검토·머지 조건 절만(도입 전부터 있던 문서일 수 있다)               |
| `templates/project/ci.yml`                                                | `.github/workflows/ci.yml`  | 설립 프로젝트만. 도입 프로젝트는 차이를 보고만 한다(adopt-project는 CI를 바꾸지 않는다)                                 |
| `templates/project/gitignore.template`                                    | `.gitignore`                | 빠진 줄만 더한다. 프로젝트 줄은 지우지 않는다                                                                           |
| `templates/project/settings.json`                                         | `.claude/settings.json`     | `enabledPlugins` 안의 `autelon@autelon` 키만                                                                            |
| `templates/project/autelon-sync.json`                                     | `.claude/autelon-sync.json` | 필드 형식이 바뀌었으면 불확실                                                                                           |
| `templates/project/goals.md`·`events.md`                                  | -                           | 프로젝트가 주인이라 대상 아님                                                                                           |
| `templates/routine/prompt.md`                                             | 등록된 루틴 지시문          | 10번(보고만)                                                                                                            |
| `playbooks/issues.md` 2절                                                 | 라벨·Project                | 10번(보고만)                                                                                                            |
| 표에 없는 `templates/` 아래 새 경로                                       | -                           | 불확실. company 이슈 후보로 보고                                                                                        |
| 그 밖의 `plugin/`(skills, agents, hooks, scripts, `templates/issues/` 등) | -                           | 플러그인 업데이트로 반영된다. 판정표에 한 줄씩만 적는다                                                                 |

- 정책이 "보고만"인 것(도입 프로젝트의 CI, 도입 프로젝트 `docs/git-rules.md`의 세 절 밖 변경, 새 role 템플릿, 10번 대상, 대응표 밖의 새 템플릿)은 판정 값 **보고만**을 받는다. 판정표의 표에는 넣지 않고 보고 줄(7번)에 적는다. 파일을 고치지 않고 PR을 막지 않는다. "그 밖의 `plugin/`"는 "플러그인 업데이트로 반영되는 것" 줄에 적는다.
- 맞출 대상(판정표의 표에 들어갈 파일)이 0개면 "맞출 것 없음"이다. 6·7번의 표는 비고, 8번에서 기준 버전 파일만 바꾸는 PR을 올린다.

## 4. 설립인지 도입인지 가리기

대응표의 정책이 다르므로 먼저 가린다. 기준 버전 파일 첫 판의 `note`를 읽는다(#67 결정 3).

```
git log origin/main --diff-filter=A --format=%H -- .claude/autelon-sync.json
git show <위 출력의 마지막 줄>:.claude/autelon-sync.json
```

`note`가 `설립`이면 설립, `도입`이면 도입이다. 읽지 못하거나 다른 값이면 불확실 항목으로 판정표 머리의 `프로젝트:` 줄에 `불확실`로 적고 사람에게 묻는다(선택지는 설립 / 도입). 이 줄의 불확실도 7번의 "불확실이 하나라도 있으면"에 든다. 답을 받는 일과 이어 가는 일은 7번의 다른 불확실 항목과 같다. 답이 정해지면 그 구분으로 3번 대응표의 정책을 다시 적용해 분류한다. **[미확인]** 실제 설립·도입한 프로젝트에서 이 명령으로 첫 판을 읽은 적은 없다(company 저장소에서 같은 꼴의 명령이 파일을 처음 더한 커밋 하나를 돌려주는 것만 확인).

## 5. 크기 판정

고칠 대상 파일 수와 종류(role 파일 / 그 밖의 프로젝트 파일)를 센다. `.claude/autelon-sync.json`은 sync마다 늘 바뀌므로 세지 않는다. 보고만인 대상도 세지 않는다. 잠정 기준은 대상 파일 4개 이상이거나 두 종류가 다 있는 경우다(#67 결정 6: 잠정값으로 시작해 첫 sync 결과로 조정한다).

- 기준 안이면 이 실행에서 이어 간다.
- 기준을 넘으면 B 단계(autelon/company#74)의 단계 쪼개기 규칙을 따른다. 이 스킬에 그 규칙이 아직 없으면 사람에게 묻는다.
  - 사람이 연 세션: AskUserQuestion으로 "이 세션에서 끝까지 이어 간다 / 여기서 멈추고 쪼갤 방법을 정한다"를 묻는다. 답은 결정 코멘트로 남긴다.
  - 루틴: 센 결과와 두 선택지를 코멘트로 남기고 `agent:needs-user`로 바꾼 뒤 끝낸다. 사람이 "이어 간다"로 답하고 `agent:ready`로 바꾸면 다음 실행이 그 답을 결정 코멘트로 남기고 이어 간다.
  - 같은 대상 SHA에 "이어 간다" 결정 코멘트가 있으면 다음 실행부터는 다시 묻지 않는다. 판정표 머리의 크기 줄에 `사람 답: 이어 감 (<결정 코멘트 링크>)`을 적는다. 다시 분류해(7·9번) 대상 파일 수가 그 결정 때보다 늘었으면 다시 묻는다.

## 6. 분류

director가 직접 판단한다(#42 결정 3). 세 가지를 읽는다.

- 옛 템플릿: `gh api -H 'Accept: application/vnd.github.raw' 'repos/autelon/company/contents/<옛 경로>?ref=<base>'`
- 새 템플릿: 같은 명령에 `<새 경로>?ref=<target>`
- 프로젝트 파일: `git show origin/main:<경로>`, 그 blob SHA는 `git rev-parse origin/main:<경로>`

로컬 플러그인 폴더(플러그인 루트 변수 `CLAUDE_PLUGIN_ROOT`가 가리키는 곳)와 마켓플레이스 클론은 템플릿 원본으로 쓰지 않는다. 그 폴더는 지금 설치본 하나뿐이고, 클론은 shallow라 옛 SHA를 읽을 수 없다.

비교 단위:

- 본문은 markdown 제목 단위의 절, frontmatter는 키 단위다.
- 옛 템플릿의 `{{...}}` 자리표시자는 어떤 값과도 같다고 본다(프로젝트가 채운 값).
- 띄어쓰기만 다른 것은 같다고 본다.

판정 규칙(판정은 적용 / 프로젝트 유지 / 합침 / 불확실 중 하나):

- 템플릿이 그대로인 절 → 대상 아님(표에 적지 않는다).
- 템플릿이 바뀌었고 프로젝트 절이 옛 템플릿과 같다 → **적용**.
- 템플릿이 바뀌었고 프로젝트 절도 옛 템플릿과 다르다 → 근거를 찾는다(#42 결정 6).
  - 찾는 순서: `git log origin/main --format=%H -- <파일>` → `gh api repos/<o>/<r>/commits/<sha>/pulls --jq '.[] | {number, body}'` → PR 본문의 `Refs #N` → 그 이슈 본문과 결정 코멘트. 소유 계정이 쓴 글만 근거로 쓴다.
  - 겹치지 않고 양쪽이 더하기만 한 변경 → **합침**.
  - 프로젝트가 의도해서 다르게 했다는 근거가 있다 → **프로젝트 유지**.
  - 근거가 없거나 뜻이 갈린다 → **불확실**.
- 템플릿이 절을 지웠다 → 프로젝트 절이 옛 템플릿과 같으면 지움을 **적용**, 다르면 **불확실**.
- 템플릿에서 파일이 지워졌다(`removed`) → 같은 규칙을 파일 단위로 쓴다. 프로젝트 사본이 옛 템플릿과 같을 때만 지우고, 다르면 불확실(#67 결정 7). 이름 바뀜(`renamed`)의 옛 경로에는 이 규칙을 쓰지 않는다.
- 템플릿 파일의 이름이 바뀌었다(`renamed`, 3번에서 쌍으로 센 것) → 옛 템플릿은 `<옛 경로>?ref=<base>`, 새 템플릿은 `<새 경로>?ref=<target>`로 읽는다.
  - 두 경로가 대응표에서 같은 프로젝트 경로로 가면 내용이 바뀐 파일과 같게 절 단위로 판정한다(내용이 같으면 대상 아님).
  - 두 경로가 대응표에서 다른 프로젝트 경로로 가면(예: role 템플릿 이름이 바뀌어 `.claude/agents/<role>.md`의 이름도 바뀜) 프로젝트 파일을 지우거나 옮기지 않고 **불확실**로 사람에게 묻는다.
  - 한쪽만 대응표에 있으면(대응표 안으로 들어오거나 밖으로 나감) **불확실**.
  - 두 경로 모두 대응표 밖이면 "플러그인 업데이트로 반영되는 것" 줄에 `<옛 경로> → <새 경로>`로 적는다.
- 템플릿에 파일이 새로 생겼다(`added`, 옛 ref에서는 404) → 대응표에 있는 경로면 프로젝트에 같은 파일이 없을 때만 **적용**(만들기), 있으면 불확실. 새 role 템플릿은 보고만 한다.
- 프로젝트에만 있는 절·키 → 항상 유지(표에 적지 않는다).
- frontmatter `tools:` → 새 템플릿 값과 **똑같이** 맞춘다(#42 결정 4, #67 결정 2). 프로젝트가 더한 도구가 빠지면 그 도구와, 그 도구를 더한 근거 이슈(위 순서로 찾은 것)를 판정표와 PR 본문에 드러낸다.
- 새 템플릿의 자리표시자에 넣을 값을 프로젝트 파일에서 찾지 못한다 → 불확실. 자리표시자를 글자 그대로 옮기지 않는다.

## 7. 판정표 코멘트

**파일을 고치기 전에** sync 이슈에 올린다. 초안은 `local/comments/<N>-sync.md`에 쓰고 `node <S> gh issue comment <N> -R <o>/<r> -F local/comments/<N>-sync.md`로 올린다. 첫 줄이 `대상 SHA:`이고, 루틴이면 첫 줄 `[루틴]` 다음 줄이 `대상 SHA:`다(맨 위 "판정표 코멘트" 정의).

```
대상 SHA: <target>

- 기준(base): <base> · 이 세션 설치본: <12자 또는 미정> · compare: ahead · 브랜치: chore/autelon-sync-<target>
- 프로젝트: 설립 | 도입 | 불확실 (근거: 기준 버전 파일 첫 판 note)
- 크기: 대상 파일 <n>개, 종류 <role / 그 밖의 파일> → 이어 감 | 사람에게 물음 | 사람 답: 이어 감 (<결정 코멘트 링크>)
- 경고: <compare와 tree 비교가 다르면>

| 템플릿 파일 | 절·키 | 프로젝트 경로 | 템플릿 변경 요약 | 프로젝트 상태 | 판정 | 이유·근거 | 분류 때 blob SHA |
| ----------- | ----- | ------------- | ---------------- | ------------- | ---- | --------- | ---------------- |

플러그인 업데이트로 반영되는 것: <경로 한 줄씩>
보고만 · 새 role 제안, 대응표 밖의 새 템플릿: <있으면>
보고만 · 도입 프로젝트의 CI 차이: <도입 프로젝트이고 ci.yml 템플릿이 바뀌었으면 요약>
보고만 · 도입 프로젝트 git-rules의 세 절 밖 차이: <도입 프로젝트이고 git-rules 템플릿의 그 밖 절(예: 머지 명령)이 바뀌었으면 요약>
보고만 · GitHub 설정·루틴(10번): <라벨 비교 결과, 루틴 지시문 변경 여부>
```

- 템플릿 원문은 길게 옮기지 않고 경로와 SHA로 가리킨다. 이유·근거에는 PR·이슈 번호를 적는다.
- 올리기 전에 빠짐 검사를 한다. 3번에서 고른 모든 대상이 표의 행(적용 / 프로젝트 유지 / 합침 / 불확실과 이유)이나 보고 줄(보고만, 플러그인 업데이트로 반영) 중 한 곳에 있어야 한다.
- 불확실이 하나라도 있으면 파일을 고치지 않고 PR도 만들지 않는다. 일부만 맞추고 기준 SHA를 올리는 PR은 만들지 않는다(남은 차이가 다음 compare에서 빠지기 때문이다).
  - 사람이 연 세션: AskUserQuestion으로 항목마다 묻는다. 선택지는 적용 / 프로젝트 유지 / 합침 안(합친 글 요약)이다. 답은 sync 이슈에 결정 코멘트로 남기고, 판정이 바뀐 표를 새 판정표 코멘트로 다시 올린다(첫 줄의 대상 SHA는 그대로). 가장 마지막 판정표가 기준이다.
  - 루틴: 항목마다 질문, 선택지, 각 선택의 결과를 코멘트로 남기고 `agent:needs-user`로 바꾼 뒤 끝낸다. 사람이 답하고 `agent:ready`로 바꾸면 다음 실행이 그 답을 결정 코멘트로 남기고, 판정이 바뀐 표를 새 판정표 코멘트로 올린 뒤(첫 줄의 대상 SHA는 그대로) 이어 간다. 일부 항목에만 답했으면 답한 항목은 같은 방법으로 결정 코멘트와 새 판정표에 반영하고(다시 묻지 않는다), 답이 없는 항목의 질문을 다시 적어 `agent:needs-user`로 넘긴다. 답이 하나도 없으면(라벨만 바뀜) 같은 질문을 다시 적어 `agent:needs-user`로 넘긴다.
- 다음 실행에서 이어 갈 때: 마지막 판정표와 그 뒤의 결정 코멘트를 읽는다. 표의 blob SHA를 `git rev-parse origin/main:<경로>`와 비교해 하나라도 다르면 6번부터 다시 분류해 새 판정표를 올린다. 이 이슈의 sync 브랜치가 이미 있으면 8번은 모드 `다시 만들기`로 한다(9번 "브랜치 다시 만들기").

## 8. 적용과 PR

모든 행이 적용 / 프로젝트 유지 / 합침으로 정해진 뒤에만 한다.

1. 판정표의 blob SHA를 `origin/main`과 다시 비교한다. 다르면 6번으로 돌아간다. 그리고 모드를 정한다: `origin/chore/autelon-sync-<target>`이 없으면 `새로`, 있으면 `다시 만들기`이고 그 브랜치의 지금 head sha(`git rev-parse origin/chore/autelon-sync-<target>`)를 같이 준다. 리뷰 수정을 같은 브랜치에 더할 때만 `이어서`다(9번).
2. 옮길 행을 만든다. 적용·합침 행마다 파일, 위치(절 제목 줄 전체 또는 키), 동작, **바꿀 글 전문**을 정확히 적는다. 합침은 director가 합친 글 전문을 쓴다. 자리표시자는 프로젝트 값으로 채운 글로 넣는다. 커밋은 템플릿 파일 단위로 나눈다(리뷰가 템플릿 파일마다 변경을 따로 볼 수 있게). 판정이 바뀐 행은 커밋을 되돌리지 않고 9번 "브랜치 다시 만들기"로 뺀다. 마지막 커밋은 `.claude/autelon-sync.json`을 `pluginSha` = `<target>`, `syncedAt` = 오늘 `YYYY-MM-DD`, `note` = `#<N>`으로 바꾸는 행이다(파일 전문을 준다).
3. `autelon:sync-editor`를 부른다. 지시문에 넣을 것: 저장소, sync 이슈 번호, 브랜치 `chore/autelon-sync-<target>`, 모드(`새로` / `이어서` / `다시 만들기`와 예상 head sha), worktree 이름(예: `sync-<target>`), 옮길 행과 커밋 묶음·커밋 제목(`다시 만들기`면 마지막 판정표의 모든 적용·합침 행과 기준 버전 파일 행), 프로젝트 커밋 규칙(`docs/git-rules.md`), author 모델명과 공동 작성자 줄, 검증 명령, 검사 스크립트 경로와 director "개인 리소스 정보"의 커밋 전 두 검사 명령. director "모든 role 공통"의 출력·코멘트 항목은 넣지 않는다(공용 role이고 응답으로 돌려준다).
4. 응답을 판정표와 맞춰 본다. 건너뛴 행이 있으면 PR을 만들지 않는다. 그 행을 다시 분류하거나 불확실로 사람에게 묻는다(7번).
   - sync-editor가 멈췄다고 응답하면(남은 worktree, 로컬 브랜치와 origin이 다름, 예상 head sha가 다름, 검사 실패, push 거절 등) PR을 만들거나 고치지 않는다. 같은 실행에서 다시 부르지 않는다. 응답의 이유와 남은 worktree·브랜치를 sync 이슈에 코멘트로 남기고 `agent:needs-user`로 넘긴다. 사람이 정리하고 `agent:ready`로 바꾸면 다음 실행이 1번부터 다시 한다.
5. 9번의 검증 체크리스트를 돈다. 통과하면 PR을 연다. 이 브랜치의 열린 PR이 이미 있으면(`다시 만들기`) 새로 열지 않고 그 PR에서 이어 간다. draft와 `gh pr ready`는 쓰지 않는다(`pr ready`는 검사 스크립트가 받지 않는다).
   ```
   node <S> gh pr create -R <o>/<r> --head chore/autelon-sync-<target> --title "<프로젝트 커밋 규칙을 따른 제목, 대상 SHA 포함>" -F local/prs/sync-<target>.md
   ```
   PR 본문: `Refs #<N>`(`Closes`는 쓰지 않는다), 판정표 요약(적용·합침 행), 바꾸지 않은 행(프로젝트 유지)과 이유, `tools:`에서 빠지는 도구와 근거 이슈, 관문 파일을 바꾸는지(9번), 사람이 할 일(10번 보고).

## 9. 적용 뒤 검증과 머지

`git fetch origin` 뒤 다음을 모두 확인한다. 리뷰 지시문에도 필수 점검으로 넣는다.

- `git merge-base --is-ancestor origin/main origin/chore/autelon-sync-<target>`가 성공하는지 본다(브랜치가 지금 main 위에 있다). 실패하면 아래 "브랜치 다시 만들기"의 조건을 본다.
- `git diff --name-only origin/main...origin/chore/autelon-sync-<target>`가 판정표의 프로젝트 경로와 `.claude/autelon-sync.json` 안에만 있다.
- "프로젝트 유지"로 둔 절과 프로젝트에만 있는 절이 그대로다.
- 적용한 절이 대상 템플릿의 절과 같다(채운 자리표시자 값은 빼고 본다).
- `tools:`가 판정표의 기대값과 같다.
- `.claude/autelon-sync.json`의 `pluginSha`가 `<target>`이다.
- diff에 `{{`가 0건이다.

그다음 프로젝트의 리뷰(`docs/git-rules.md`의 리뷰어)와 `autelon:security-reviewer` 판정을 같은 head sha로 받는다. 판정·수정 반복을 Workflow로 돌릴지는 director 규칙을 따른다. 수정할 것이 나오면 director가 고칠 행을 정해 sync-editor를 다시 부르고(모드 `이어서`, 같은 브랜치에 이어서 커밋), 새 head로 검증·판정을 다시 받는다. 이미 옮긴 행을 되돌려야 하면(판정이 바뀐 행) 아래 "브랜치 다시 만들기"로 한다.

**브랜치 다시 만들기**: PR을 연 뒤 main이 움직이면 브랜치가 옛 main 위에 남는다. 다음 경우에는 director가 마지막 판정표로 sync-editor에게 브랜치를 `origin/main` 위에 처음부터 다시 만들게 한다(8번 3, 모드 `다시 만들기`). 작업 브랜치의 rebase와 `--force-with-lease`는 조직 `.github` 저장소의 `git-workflow.md`가 허용하는 일이다. sync-editor는 이 모드에서만 예상 head sha를 붙인 `--force-with-lease`로 push한다. PR 번호는 그대로 두고, 새 head로 위 검증과 두 판정을 다시 받는다.

- 판정표의 blob SHA가 `origin/main`과 다르다 → 6번부터 다시 분류해 새 판정표를 올린 뒤 다시 만든다. 불확실이 생기면 7번대로 사람에게 묻고 다시 만들지 않는다.
- blob SHA는 같은데 브랜치가 지금 main 위에 없고(위 `--is-ancestor` 실패) `gh pr view <PR> -R <o>/<r> --json mergeStateStatus --jq .mergeStateStatus`가 `BEHIND`나 `DIRTY`다 → 같은 판정표로 다시 만든다. 그 밖이면(머지 큐가 최신 main과 합쳐 검사하는 저장소 등) 다시 만들지 않는다.
- 판정이 바뀌어 이미 옮긴 행을 되돌려야 한다 → 새 판정표를 올린 뒤 다시 만든다.

**머지를 누가 정하나** (#67 결정 4):

- sync PR이 관문 파일을 바꾸면 리뷰·보안 검토를 모두 통과해도 **사람이 머지를 정한다.** 관문 파일: `.claude/agents/`, `docs/git-rules.md`, CI(`.github/workflows/`), `.claude/settings.json`.
  - 사람이 연 세션: AskUserQuestion으로 "머지한다 / 머지하지 않는다(이유)"를 묻고 답을 결정 코멘트로 남긴다. "머지한다"면 **director가** 아래 "머지 명령"을 낸다. 사람이 직접 머지해도 된다(다음 실행의 1번 (a)가 알아본다).
  - 루틴: PR 링크, 리뷰한 head sha, 두 판정 결과를 코멘트로 남기고 `agent:needs-user`로 바꾼 뒤 끝낸다. 루틴은 이 PR의 머지 명령을 내지 않고 **사람이 머지한다.** 코멘트에 사람이 할 일을 적는다: "PR을 머지했으면 이 이슈에 `머지함` 한 줄 코멘트를 남기고 `agent:ready`로 바꿔 주세요. 머지하지 않기로 했으면 이유를 코멘트로 남기고 `agent:ready`로 바꿔 주세요."
  - 그 뒤의 실행: 1번 (a)가 머지를 확인하면 11번으로 간다(코멘트 없이 라벨만 바뀌어도 같다). 머지되지 않았고 사람이 머지하지 않기로 답했으면 그 답을 결정 코멘트로 남기고, PR을 닫지 않고 이슈를 `agent:needs-user`로 둔다(다음 일은 사람이 정한다). 머지되지 않았고 답도 없으면 위 요청을 다시 적어 `agent:needs-user`로 넘긴다.
  - 루틴 지시문 4번의 "승인 답이면 task를 닫는다"는 sync 이슈에 쓰지 않는다. sync 이슈는 11번에서만 닫는다.
- 관문 파일을 바꾸지 않는 sync PR(예: `CLAUDE.md`, `.gitignore`, 기준 버전 파일만)은 프로젝트 리뷰어 설정대로 머지한다.
- 머지 직전에 판정표의 blob SHA를 `origin/main`과 한 번 더 비교한다. 다르면 머지하지 않고 위 "브랜치 다시 만들기"대로 6번부터 다시 한다.
- **머지 명령**: 프로젝트 `docs/git-rules.md`에 적힌 머지 명령을 쓴다(설립 프로젝트는 "머지 명령" 절). 그 문서에 머지 명령이 없으면 조직 `.github` 저장소 `git-workflow.md` "에이전트의 PR 절차" 3번의 명령을 쓴다(머지 큐가 있으면 `gh pr merge <PR>`, 없으면 `gh pr merge <PR> --auto --<병합 방식>`). 어느 쪽이든 리뷰한 head sha로 `--match-head-commit`을 붙이고, `--admin`은 쓰지 않는다.

## 10. GitHub 설정과 루틴 (보고만)

저장소 PR 밖의 일이다. 이 단계에서는 비교해서 판정표와 마무리 코멘트에 보고만 하고, 아무것도 바꾸지 않는다. 더하기와 사람 확인 이슈는 B 단계(autelon/company#74)에서 정한다.

- 라벨: `gh label list -R <o>/<r> --json name --jq '.[].name'`을 대상 SHA의 `plugin/playbooks/issues.md` 2절 "라벨"(6번의 raw 읽기 명령)과 비교해 빠진 라벨을 적는다. 라벨을 만들거나 고치지 않는다.
- Project 필드·Status 선택지·화면·워크플로: 이 단계에서는 비교하지 않는다. `playbooks/issues.md`가 바뀌었으면 "Project 설정 확인 필요"로만 적는다.
- 루틴: 3번에서 `plugin/templates/routine/prompt.md`가 바뀌었으면 "루틴 지시문 다시 등록 필요"로 적는다. 다시 등록은 사람이 승인한 뒤 `playbooks/routine.md` "바꿀 때"대로 한다. 이 스킬은 예약 작업을 고치지 않는다.

## 11. 마무리

머지되면(사람이 머지했으면 다음 실행의 1번 (a)에서 여기로 온다):

1. sync 이슈에 결과 코멘트를 남긴다: PR 번호, 머지 커밋, 새 `pluginSha`, 판정 수(적용·합침·프로젝트 유지), 10번에서 보고한 사람이 할 일.
2. `gh issue close <N> -R <o>/<r> --reason completed`로 닫는다(`--comment` 없이). 처리 중에 더 새 `설치 SHA:` 줄이 붙었어도 닫는다. 다음 세션의 버전 비교가 새 기준으로 새 sync 이슈를 만든다.

## 하지 않는 것

- 플러그인을 업데이트하지 않는다(사람이 한다).
- 다른 저장소와 이미 열린 이슈의 본문을 고치지 않는다. 템플릿의 결함이 보이면 autelon/company에 새 이슈로 알린다(director "다른 프로젝트에 전달").
- 프로젝트에만 있는 절·키·파일을 지우지 않는다. 템플릿이 없는 role은 손대지 않는다.
- 불확실이 남은 채로 파일을 고치거나 PR을 만들지 않는다. 일부만 맞추고 기준 SHA를 올리지 않는다.
- `ahead`가 아닌 대상으로 맞추지 않는다(옛 템플릿으로 되돌리지 않는다).
- 라벨, Project 선택지·필드·화면을 만들거나 바꾸지 않는다. 루틴을 다시 등록하지 않는다.
- director가 직접 프로젝트 파일을 고치거나 sync 브랜치에 push하지 않는다(sync-editor가 옮기고 다시 만든다).

## 확인한 것과 못 한 것

- **[확인]** 2026-10-05, autelon/company에서 읽기 명령으로:
  - `contents/<경로>?ref=<12자>`에 `Accept: application/vnd.github.raw`를 주면 그 SHA의 원문이 온다. 그 SHA에 없는 경로는 404다.
  - 이름이 바뀐 파일: compare가 `status: renamed`와 `previous_filename`을 주고, 옛 경로를 옛 12자 ref로 읽을 수 있다(`plugin/templates/prd.md` → `plugin/templates/issues/prd.md`).
  - compare 응답의 `files[]`에 `filename`, `status`, `previous_filename`, `sha`, `patch` 등이 있고 최상위에 `status`, `ahead_by`가 있다.
  - `git/trees/<12자>?recursive=1`이 `truncated`와 경로마다 blob sha를 준다.
  - `commits/<sha>/pulls`가 그 커밋을 담은 PR(번호, 본문)을 준다(merge commit 방식의 브랜치 커밋으로 확인).
  - `gh pr list --state merged --head <브랜치> --json number,mergeCommit`이 머지된 PR과 머지 커밋을 준다.
  - 검사 스크립트 gh 모드가 `gh pr create`의 `--head`(`-H`)를 받는다. `gh pr ready`는 받지 않는다(스크립트의 인자 판정 함수를 직접 불러 확인).
- **[미확인]**
  - compare의 파일 수 상한과 `patch`가 빠지는 조건. tree 비교로 대비한다.
  - 프로젝트 저장소(설립 때 main에 직접 넣은 커밋 포함)에서 `commits/<sha>/pulls`로 근거 PR이 찾아지는가. 못 찾으면 근거 없음이 되어 불확실로 간다.
  - 실제 설립·도입 프로젝트에서 기준 버전 파일 첫 판의 `note` 읽기(4번).
  - sync-editor가 여러 실행에 걸쳐 같은 브랜치에 이어서 커밋하는 동작, 모드 `다시 만들기`(`git worktree add -B`와 `--force-with-lease`)의 동작, 플러그인 agent가 프로젝트 루트에서 `git worktree add`로 만든 폴더 안에서만 고치는지.
  - 프로젝트 저장소의 규칙(머지 큐, up to date)에서 `mergeStateStatus`가 실제로 `BEHIND`·`DIRTY`로 나오는 경우.
  - 무인 루틴에서 director 말고 다른 플러그인 스킬(이 스킬)을 불러 쓸 수 있는가.
  - 절 단위 판정의 실제 정확도. 실제 프로젝트 파일로 돌려 보지 않았다.
