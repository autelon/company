---
name: sync-project
description: autelon 플러그인이 바뀌었을 때 프로젝트에 복사된 파일(role, CLAUDE.md의 autelon 절, docs/git-rules.md, CI, .gitignore, 설정)을 새 템플릿에 맞춘다. director가 제목이 "autelon sync:"로 시작하는 sync 이슈(기준 버전 정하기 포함)와 그 단계 이슈를 처리할 때 사용. 템플릿 변경을 절 단위로 판정해 이슈에 먼저 올리고, 모두 정해지면 sync-editor에게 옮기게 해 기준 버전 파일과 함께 PR 하나로 올린다.
---

# 플러그인 버전 맞추기 (sync)

director 세션(사람이 연 세션과 루틴 모두)이 sync 이슈를 처리할 때 이 스킬을 따른다. 판단은 director가 하고, 파일 수정은 공용 role `autelon:sync-editor`가 판정표의 행을 옮기기만 한다(autelon/company#67 결정 1). 근거: autelon/company#42(3-way 판단, 필수 영역은 frontmatter `tools:`, role 수정 PR의 이유 이슈), #66(`ahead`가 아니면 맞추지 않음), #67(이 스킬의 설계와 결정).

- 검사 스크립트: `${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.mjs` (아래 `<S>`)
- 결정 코멘트 템플릿: `${CLAUDE_PLUGIN_ROOT}/templates/issues/comment-decision.md`
- `<o>/<r>`는 프로젝트 저장소, `<N>`은 sync 이슈 번호, `<base>`는 기록 SHA, `<target>`은 대상 SHA(둘 다 12자, 정하는 법은 1번 처음), `<role>`은 role 이름이다.
- `<me>`는 지금 gh 계정이다: `gh api user --jq .login`. 루틴의 `--author @me`와 같은 계정이고, 저장소 소유자(조직 이름)가 아니다. 이 문서에서 "소유 계정이 쓴 코멘트"는 `user.login`이 `<me>`인 코멘트다.
- **판정표 코멘트**: `<me>`가 쓴 코멘트 중 첫 줄(루틴이면 `[루틴]` 다음 줄)이 `대상 SHA: <12자>`로 시작하는 것. 여러 개면 가장 마지막 것이 기준이다(7번).
- **GitHub에 쓰는 일(코멘트, 이슈·라벨 만들기, 라벨 바꾸기, PR, 닫기)은 모두 director가 Bash에서 `node <S> gh ...`로 한다.** 스크립트나 node가 child_process로 부르는 `gh`는 PreToolUse 훅을 거치지 않기 때문이다. 글이 없는 명령(`--add-label`, `close`)만 스크립트 없이 실행한다.
- 루틴이 쓰는 코멘트는 첫 줄을 `[루틴]`으로 시작한다(director "이슈 작업 루프").
- **sync 이슈와 그 단계 이슈의 사람 답 처리와 PR·머지는 이 스킬이 정한다.** 루틴 지시문의 4번 답 처리와 "PR" 절보다 앞선다(director "이슈 작업 루프"의 sync 이슈 항목). 어느 코멘트가 사람의 답인지는 루틴 지시문 4번의 기준(`[루틴]` 코멘트, role 결과 코멘트, `보낸 곳:` 코멘트는 답이 아니다)을 그대로 쓴다. 여기에 더해, 첫 줄이 `설치 SHA: `, `대상 SHA: `, `단계 이슈: `, `사람 확인 이슈: `, `push head: `로 시작하는 코멘트와 결정 코멘트(첫 줄 `**결정**`)도 답이 아니다. 사람이 연 director 세션은 `[루틴]` 없이 이 줄들을 쓰기 때문이다(director "시작할 때" 7번 4, 이 스킬의 기록 코멘트).

표기: **[확인]** 실행으로 확인함 / **[미확인]** 아직 확인하지 못함.

## 0. 언제 부르나

- 제목이 `autelon sync: <기록 SHA> 이후`이고 `agent:ready`인 열린 sync 이슈를 처리할 때.
- 그 sync 이슈를 쪼갠 **단계 이슈**를 처리할 때. 제목이 `sync <i>/<n> <내용> (<대상 SHA>)`이고, 본문의 `이어지는 이슈: #<N>`이 `<me>`가 연 열린 sync 이슈를 가리키는 `agent:ready` 이슈다. 처리 순서는 5번 "단계 이슈를 처리할 때"다. `#<N>`이 열린 sync 이슈가 아니면 고치지 않고 이유를 코멘트로 남긴 뒤 `agent:needs-user`로 넘긴다.
- 10번의 사람 확인 이슈(제목 `sync 설정 확인 (<대상 SHA>)`)는 사람이 연 director 세션이 10번 "처리"대로 한다. 루틴은 라벨이 `agent:ready`여도 처리하지 않고 건너뛴다(라벨을 바꾸지 않고 코멘트도 남기지 않는다).
- `autelon sync: 기준 버전 정하기` 이슈를 처리할 때(사람이 답하고 `agent:ready`로 바꿨거나, 사람이 연 세션이 그 이슈를 다룰 때). 처리 순서는 아래 1~11이 아니라 12번이다(기록 SHA가 없다).
- 처리 순서는 아래 1~11이다. 한 번의 실행에서 가능한 데까지 가고, 멈추는 곳마다 이유를 sync 이슈에 남긴다. 다음 실행은 1번부터 다시 시작해 남긴 기록(판정표, 결정 코멘트, 브랜치, PR)을 보고 이어 간다.

## 1. 입구 검사

매 실행마다 처음에 한다. 하나라도 어긋나면 파일을 고치지 않는다. 이유를 코멘트로 남기고 `agent:ready`를 `agent:needs-user`로 바꾼 뒤 이 이슈를 끝낸다.

단계 이슈(0번)를 처리할 때도 각 단계를 시작할 때마다 이 검사를 다시 한다. 이때 표, 설치 SHA 줄, 판정표는 그 단계 이슈가 아니라 본문의 `이어지는 이슈: #<N>`(sync 이슈)에서 읽고, 어긋나면 그 단계 이슈를 `agent:needs-user`로 넘긴다. 쪼갠 sync 이슈는 라벨 없는 묶음이라 director "시작할 때" 7번 4가 `ahead`가 아닌 줄을 더해도 라벨을 바꾸지 않으므로, 여기서 다시 봐야 옛 템플릿으로 내려 맞추지 않는다.

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
| `templates/routine/prompt.md`                                             | 등록된 루틴 지시문          | 10번(사람 확인 이슈)                                                                                                    |
| `playbooks/issues.md` 2절                                                 | 라벨·Project                | 10번(빠진 라벨은 사람이 연 세션이 만든다. 그 밖은 사람 확인 이슈)                                                       |
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

## 5. 크기 판정과 단계 쪼개기

고칠 대상 파일 수와 종류(role 파일 / 그 밖의 프로젝트 파일)를 센다. `.claude/autelon-sync.json`은 sync마다 늘 바뀌므로 세지 않는다. 보고만인 대상도 세지 않는다. 잠정 기준은 대상 파일 4개 이상이거나 두 종류가 다 있는 경우다(#67 결정 6: 잠정값으로 시작해 첫 sync 결과로 조정한다).

- 기준 안이면 쪼개지 않고 이 실행에서 이어 간다.
- 기준을 넘으면:
  - 사람이 연 세션: AskUserQuestion으로 "이 세션에서 끝까지 이어 간다 / 단계 이슈로 쪼갠다"를 묻는다. 답은 결정 코멘트로 남긴다. 이어 가면 쪼개지 않은 것과 같다.
  - 루틴: "이어 간다" 결정 코멘트(아래 줄)가 없으면 묻지 않고 쪼갠다. 루틴은 실행마다 한 단계씩 한다(director "이슈 작업 루프"의 "큰 일은 단계로 쪼개", #57).
  - 같은 대상 SHA에 "이어 간다" 결정 코멘트가 있으면 다음 실행부터는 다시 묻지 않고, **루틴도 쪼개지 않고** 그 결정대로 이어 간다(사람이 연 세션이 PR 전에 멈춘 뒤 루틴이 받는 경우). 판정표 머리의 크기 줄에 `사람 답: 이어 감 (<결정 코멘트 링크>)`을 적는다. 다시 분류해(7·9번) 대상 파일 수가 그 결정 때보다 늘었으면 다시 묻는다(루틴은 질문과 두 선택지를 코멘트로 남기고 `agent:needs-user`로 넘긴다).
- 쪼개기로 했어도 6·7번(분류와 판정표)은 sync 이슈에서 이 실행이 한다(첫 단계). 불확실이 있으면 7번대로 멈추고, 단계 이슈는 판정표의 모든 행이 정해진 뒤에 8번 대신 아래 "단계 이슈 만들기"로 만든다.
- 쪼개도 브랜치는 `chore/autelon-sync-<target>` 하나, PR은 마지막 단계에서 하나다(#67 완료 조건, #57 "같은 브랜치에서 이어 간다"). 단계마다 PR을 열지 않는다. 일부만 맞춘 상태가 main에 들어가기 때문이다.

### 단계 나누기

- 적용·합침 행이 있는 대상 파일을 종류별로 묶는다. role 파일 단계를 먼저, 그 밖의 프로젝트 파일 단계를 뒤에 둔다. 한 단계의 대상 파일은 3개까지다(한 단계가 위 잠정 기준 안에 들게). "프로젝트 유지" 행만 있는 파일과 보고만 대상은 단계에 넣지 않는다. 바뀐 것이 없는 단계는 만들지 않는다.
- 마지막 단계가 기준 버전 파일 커밋, 9번 검증, PR, 리뷰·머지 판단까지 맡는다. 앞 단계는 같은 브랜치에 커밋·push만 한다.
- 판정표의 `단계` 열에 행마다 `<i>/<n>`을 적는다(`n`은 만든 단계 이슈 수. 분류하는 sync 이슈는 세지 않는다). 쪼개지 않거나 아직 정해지지 않은 행은 `-`다.
- **[미확인]** 파일 3개라는 단계 크기와 role 먼저인 순서는 잠정값이다. 실제 sync에서 한 단계가 role 한 번의 호출로 끝나는지 보고 조정한다.

### 단계 이슈 만들기

판정표의 모든 행이 정해진 뒤(불확실 없음), 8번 대신 한다.

1. 이미 만든 단계 이슈가 있는지 본다. sync 이슈의 가장 마지막 `단계 이슈:` 코멘트(아래 3)의 이슈 상태를 읽는다(`gh issue view <M> -R <o>/<r> --json state,stateReason`).
   - 열린 것이 있고 `not planned`로 닫힌 것이 없으면 새로 만들지 않고 그 단계 이슈로 이어 간다(sync 이슈에 `agent:ready`가 남아 있으면 뗀다).
   - 열린 것과 `not planned`로 닫힌 것이 함께 있으면(사람이 단계 하나만 반려한 경우) 새로 만들지 않는다. sync 이슈에 아래 "단계 이슈의 정리 요청"을 코멘트로 남기고 `agent:needs-user`로 넘긴다.
   - 모두 닫혔으면(사람이 정리하고 다시 분류하게 한 경우) 새로 만든다. 코멘트가 없어도 앞 실행이 만들다 끊겼을 수 있으므로 `gh issue list -R <o>/<r> --author @me --state open --search 'in:title "<target>"' --json number,title,body`에서 제목이 단계 이슈 형식(`sync <숫자>/<숫자> `로 시작, 정규식 `^sync [0-9]+/[0-9]+ `)이고 본문에 `이어지는 이슈: #<N>`이 있는 이슈를 찾는다(10번의 사람 확인 이슈 `sync 설정 확인 (…)`은 이 형식이 아니다). 있으면 새로 만들지 않고 이유를 코멘트로 남긴 뒤 sync 이슈를 `agent:needs-user`로 넘긴다(사람이 정리한다). **[미확인]** 막 만든 이슈가 검색 색인에 바로 보이는지.
2. 단계 `1`부터 `n`까지 차례로 만든다(타입 Task). 본문은 `local/issues/sync-<target>-<i>.md`에 쓴다.
   ```
   node <S> gh issue create -R <o>/<r> --type Task --title "sync 1/<n> <내용> (<target>)" -F local/issues/sync-<target>-1.md --label agent:ready
   node <S> gh issue create -R <o>/<r> --type Task --title "sync <i>/<n> <내용> (<target>)" -F local/issues/sync-<target>-<i>.md --blocked-by <앞 단계 번호>
   ```
   - 첫 단계에만 `agent:ready`를 붙이고, 둘째 단계부터는 라벨 없이 앞 단계를 `--blocked-by`로 건다.
   - 제목의 `<내용>`은 `role 파일` 또는 `프로젝트 파일`이고, 마지막 단계는 `프로젝트 파일·기준 버전`(role 단계가 마지막이면 `role 파일·기준 버전`)이다. **제목을 `autelon sync:`로 시작하지 않는다.** director "시작할 때" 7번이 이 접두어로 열린 sync 이슈를 하나만 찾기 때문이다.
   - 본문은 `templates/issues/task.md`의 절(현재 결론, 배경, 목표, 완료 조건, 하지 말 것)을 쓰고 다음을 넣는다: `이어지는 이슈: #<N>`, base, target, 브랜치 `chore/autelon-sync-<target>`, 판정표 코멘트 링크, 이 단계가 맡는 행(판정표 `단계` 열이 `<i>/<n>`인 행), "`autelon:sync-project` 스킬 5번 '단계 이슈를 처리할 때'로 처리한다", 마지막 단계면 "기준 버전 파일 커밋과 PR, 머지 판단까지". 그리고 사람이 이 이슈를 직접 닫을 때 할 일을 적는다: "이 단계 이슈를 `not planned`로 닫으면 남은 단계 이슈도 `not planned`로 닫고, sync 이슈 `#<N>`을 다시 분류하게 하려면 `agent:ready`, 그만두려면 `agent:needs-user`로 바꿔 주세요. sync 이슈는 라벨 없는 묶음이라 바꾸지 않으면 아무도 처리하지 않습니다."
3. sync 이슈에 `단계 이슈: #<1단계>, #<2단계>, …` 코멘트를 남기고(루틴이면 첫 줄 `[루틴]`), sync 이슈의 `agent:ready`를 뗀다(`gh issue edit <N> -R <o>/<r> --remove-label agent:ready`). 이제 sync 이슈는 라벨 없는 묶음이다.
4. 이 실행의 sync 이슈 처리는 여기서 끝낸다. 루틴은 실행 중에 만든 이슈를 다음 실행에서 처리한다(director "이슈 작업 루프"의 작업 범위). 사람이 연 세션은 이어서 첫 단계 이슈를 처리해도 된다.

### 단계 이슈를 처리할 때

`<i>`는 이 단계 번호, `<N>`은 본문의 `이어지는 이슈`다.

1. 1번 입구 검사를 sync 이슈 `<N>` 기준으로 다시 한다(1번 첫 문단). (d)에서 열린 sync PR이 있을 때: 마지막 단계면 아래 2·3을 한 뒤 9번부터 이어 가고(9번에서 쪼갠 경우의 갈래는 아래 7), 마지막이 아니면 멈춘다(앞 단계에서 PR이 열렸으면 안 된다).
2. sync 이슈의 가장 마지막 `단계 이슈:` 코멘트에서 이 단계가 들어 있는지 확인하고(없으면 옛 단계 이슈다. 고치지 않고 `agent:needs-user`) 앞 단계 번호를 읽어, 앞 단계가 모두 `completed`로 닫혔는지 본다(`gh issue view <M> -R <o>/<r> --json state,stateReason`). 아니면 고치지 않고 이 단계 이슈를 `agent:needs-user`로 넘긴다.
3. sync 이슈의 마지막 판정표에서 모든 행의 blob SHA를 `git rev-parse origin/main:<경로>`와 비교한다. 하나라도 다르면 고치지 않는다. 단계를 다시 짜야 하므로 이 단계 이슈를 `agent:needs-user`로 넘긴다(아래 9). 사람이 정리 요청의 둘째 갈래대로 정리하면 다음 실행이 sync 이슈에서 6번부터 다시 분류하고 새 단계 이슈를 만든다(7번 "다음 실행에서 이어 갈 때". 브랜치가 이미 있으므로 새 첫 단계는 아래 4의 `다시 만들기`).
4. 모드를 정한다.
   - 첫 단계: `origin/chore/autelon-sync-<target>`이 없으면 `새로`, 있으면 `다시 만들기`(그 브랜치의 지금 head sha와 같이).
   - 둘째 단계부터: 앞 단계가 결과 코멘트에 남긴 `push head:` 값(`<prev>`)이 `git rev-parse origin/chore/autelon-sync-<target>`과 같으면 `이어서`.
   - 다르면 이 단계의 앞선 시도가 push만 하고 `push head:`를 남기지 못한 것인지 본다(아래 6의 검증 실패, 8번 4의 건너뛴 행이나 멈춤 응답, 코멘트 전에 실행이 끊김). `git merge-base --is-ancestor <prev> origin/chore/autelon-sync-<target>`가 성공하고 `git diff --name-only <prev> origin/chore/autelon-sync-<target>`의 경로가 모두 이 단계가 맡은 행의 프로젝트 경로 안에 있으면 앞선 시도로 보고 `다시 만들기`(그 브랜치의 지금 head sha와 같이)로 한다.
   - 그 밖이면 단계 사이에 다른 누가 브랜치를 바꾼 것이다. 덮어쓰지 않고 이 단계 이슈를 `agent:needs-user`로 넘긴다(아래 9).
   - `다시 만들기`로 줄 행은 1단계부터 이 단계까지의 모든 적용·합침 행이다(브랜치를 `origin/main` 위에 처음부터 다시 만들기 때문이다).
5. 8번 2~4대로 이 단계의 행으로 `autelon:sync-editor`를 부르고 응답을 맞춰 본다. 마지막 단계면 기준 버전 파일 행을 더한다. 멈춤 응답이면 8번 4대로 하되 코멘트와 `agent:needs-user`는 이 단계 이슈에 한다.
6. 마지막이 아닌 단계: 9번 검증 체크리스트를 1단계부터 이 단계까지의 행으로 돈다(`git diff --name-only`가 그 행들의 경로 안에만 있다, 옮긴 절이 대상 템플릿과 같다, `tools:`, `{{` 0건. `pluginSha`는 보지 않는다). 통과하면 이 단계 이슈에 결과 코멘트를 남긴다: 첫 줄(루틴이면 `[루틴]` 다음 줄) `push head: <sha>`, 옮긴 행, 실행한 검사. 그다음 이 단계 이슈를 `--reason completed`로 닫고 다음 단계 이슈에 `agent:ready`를 붙인다(`gh issue edit <다음> -R <o>/<r> --add-label agent:ready`). 검증에 걸리면 닫지 않고 이유를 남긴 뒤 `agent:needs-user`로 넘긴다.
7. 마지막 단계: 8번 5(PR)와 9번(검증, 리뷰·보안 검토, 머지)을 한다. 9번의 관문 sync PR 요청 코멘트와 라벨 바꾸기는 이 단계 이슈에 한다. 머지되면 11번으로 간다. 9번 "브랜치 다시 만들기"와 "머지 직전"의 갈래는 쪼갠 경우 이렇게 한다.
   - 판정표의 blob SHA가 `origin/main`과 다르거나, 판정이 바뀌어 이미 옮긴 행을 되돌려야 한다 → 6번부터 다시 분류하지 않고 다시 만들거나 머지하지도 않는다. 위 3과 같이 이 단계 이슈를 `agent:needs-user`로 넘긴다(아래 9). 새 판정표의 `단계` 열과 늘어난 행을 맡을 단계는 사람이 정리한 뒤 sync 이슈에서 다시 정한다.
   - blob SHA는 같고 main만 움직였다(9번의 `BEHIND`·`DIRTY` 갈래) → 같은 판정표로 `다시 만들기`를 한다. 행은 1단계부터 마지막 단계까지의 모든 적용·합침 행과 기준 버전 파일 행이다.
8. 단계 이슈가 반려(`not planned`)로 닫혔으면 다음 단계를 열지 않고 sync 이슈를 `agent:needs-user`로 둔다(director "이슈 작업 루프"). 닫힌 단계 이슈는 루틴 목록에 없으므로, 사람이 직접 닫을 때는 단계 이슈 본문의 안내(위 "단계 이슈 만들기" 2)대로 사람이 sync 이슈 라벨을 바꾼다. 그 뒤 sync 이슈가 `agent:ready`로 처리될 때 열린 단계와 반려된 단계가 섞여 있으면 "단계 이슈 만들기" 1이 정리 요청을 남긴다. 리뷰 수정이 커서 남은 수정을 하위 이슈로 넘길 때도 같은 브랜치와 같은 PR을 쓴다(같은 규칙).
9. 이 절에서 단계 이슈를 `agent:needs-user`로 넘길 때는(관문 sync PR의 머지 요청은 빼고. 그것은 9번대로 한다) 이유와 함께 아래 "단계 이슈의 정리 요청"을 코멘트에 넣는다. 사람이 그 단계 이슈를 `agent:ready`로 돌리면 다음 실행은 답 코멘트가 있으면 결정 코멘트로 남긴 뒤 이 절 1부터 다시 한다. 같은 이유로 다시 걸리면 정리 요청을 다시 적어 `agent:needs-user`로 넘긴다. director는 단계 이슈를 `not planned`로 닫거나 sync 이슈의 라벨을 바꾸지 않는다(정리는 사람이 한다).

### 단계 이슈의 정리 요청

단계 이슈나 sync 이슈를 `agent:needs-user`로 넘길 때 코멘트에 넣는 글이다. `<남은 단계>`는 sync 이슈의 가장 마지막 `단계 이슈:` 코멘트의 이슈 중 열린 것이다.

```
사람이 할 일(하나를 골라 주세요):
- 원인을 정리했으면(브랜치·worktree 정리, 앞 단계 확인 등) 이 이슈를 `agent:ready`로 바꿔 주세요. 다음 실행이 처음부터 다시 봅니다.
- 처음부터 다시 나누려면 남은 단계 이슈 <남은 단계>를 `not planned`로 닫고 sync 이슈 #<N>을 `agent:ready`로 바꿔 주세요. 다음 실행이 sync 이슈에서 판정표를 다시 보고(프로젝트 파일이 바뀌었으면 다시 분류) 새 단계 이슈를 만듭니다. 브랜치가 이미 있으면 새 첫 단계가 브랜치를 다시 만듭니다.
- sync를 멈춰 두려면 남은 단계 이슈를 `not planned`로 닫고 sync 이슈 #<N>에 `agent:needs-user`를 붙인 뒤 이유를 코멘트로 남겨 주세요.
```

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
- 크기: 대상 파일 <n>개, 종류 <role / 그 밖의 파일> → 이어 감 | 사람에게 물음 | 사람 답: 이어 감 (<결정 코멘트 링크>) | 쪼갬 (<n>단계)
- 경고: <compare와 tree 비교가 다르면>

| 템플릿 파일 | 절·키 | 프로젝트 경로 | 템플릿 변경 요약 | 프로젝트 상태 | 판정 | 이유·근거 | 분류 때 blob SHA | 단계 |
| ----------- | ----- | ------------- | ---------------- | ------------- | ---- | --------- | ---------------- | ---- |

플러그인 업데이트로 반영되는 것: <경로 한 줄씩>
보고만 · 새 role 제안, 대응표 밖의 새 템플릿: <있으면>
보고만 · 도입 프로젝트의 CI 차이: <도입 프로젝트이고 ci.yml 템플릿이 바뀌었으면 요약>
보고만 · 도입 프로젝트 git-rules의 세 절 밖 차이: <도입 프로젝트이고 git-rules 템플릿의 그 밖 절(예: 머지 명령)이 바뀌었으면 요약>
보고만 · GitHub 설정·루틴(10번): <만든 라벨(사람이 연 세션) 또는 빠진 라벨(루틴), Project 차이와 프로젝트 유지로 본 차이, 루틴 지시문 다시 등록 여부, 사람 확인 이슈 번호>
```

- 템플릿 원문은 길게 옮기지 않고 경로와 SHA로 가리킨다. 이유·근거에는 PR·이슈 번호를 적는다.
- 올리기 전에 빠짐 검사를 한다. 3번에서 고른 모든 대상이 표의 행(적용 / 프로젝트 유지 / 합침 / 불확실과 이유)이나 보고 줄(보고만, 플러그인 업데이트로 반영) 중 한 곳에 있어야 한다.
- 불확실이 하나라도 있으면 파일을 고치지 않고 PR도 만들지 않는다. 일부만 맞추고 기준 SHA를 올리는 PR은 만들지 않는다(남은 차이가 다음 compare에서 빠지기 때문이다).
  - 사람이 연 세션: AskUserQuestion으로 항목마다 묻는다. 선택지는 적용 / 프로젝트 유지 / 합침 안(합친 글 요약)이다. 답은 sync 이슈에 결정 코멘트로 남기고, 판정이 바뀐 표를 새 판정표 코멘트로 다시 올린다(첫 줄의 대상 SHA는 그대로). 가장 마지막 판정표가 기준이다.
  - 루틴: 항목마다 질문, 선택지, 각 선택의 결과를 코멘트로 남기고 `agent:needs-user`로 바꾼 뒤 끝낸다. 사람이 답하고 `agent:ready`로 바꾸면 다음 실행이 그 답을 결정 코멘트로 남기고, 판정이 바뀐 표를 새 판정표 코멘트로 올린 뒤(첫 줄의 대상 SHA는 그대로) 이어 간다. 일부 항목에만 답했으면 답한 항목은 같은 방법으로 결정 코멘트와 새 판정표에 반영하고(다시 묻지 않는다), 답이 없는 항목의 질문을 다시 적어 `agent:needs-user`로 넘긴다. 답이 하나도 없으면(라벨만 바뀜) 같은 질문을 다시 적어 `agent:needs-user`로 넘긴다.
- 다음 실행에서 이어 갈 때: 마지막 판정표와 그 뒤의 결정 코멘트를 읽는다. 표의 blob SHA를 `git rev-parse origin/main:<경로>`와 비교해 하나라도 다르면 6번부터 다시 분류해 새 판정표를 올린다. 이 이슈의 sync 브랜치가 이미 있으면 8번은 모드 `다시 만들기`로 한다(9번 "브랜치 다시 만들기").

## 8. 적용과 PR

모든 행이 적용 / 프로젝트 유지 / 합침으로 정해진 뒤에만 한다. 5번에서 쪼개기로 했으면 이 절 대신 5번 "단계 이슈 만들기"를 하고, 각 단계 이슈가 5번 "단계 이슈를 처리할 때"에서 아래 2~5를 쓴다(모드는 그 절의 4).

1. 판정표의 blob SHA를 `origin/main`과 다시 비교한다. 다르면 6번으로 돌아간다. 그리고 모드를 정한다: `origin/chore/autelon-sync-<target>`이 없으면 `새로`, 있으면 `다시 만들기`이고 그 브랜치의 지금 head sha(`git rev-parse origin/chore/autelon-sync-<target>`)를 같이 준다. 리뷰 수정을 같은 브랜치에 더할 때만 `이어서`다(9번).
2. 옮길 행을 만든다. 적용·합침 행마다 파일, 위치(절 제목 줄 전체 또는 키), 동작, **바꿀 글 전문**을 정확히 적는다. 합침은 director가 합친 글 전문을 쓴다. 자리표시자는 프로젝트 값으로 채운 글로 넣는다. 커밋은 템플릿 파일 단위로 나눈다(리뷰가 템플릿 파일마다 변경을 따로 볼 수 있게). 판정이 바뀐 행은 커밋을 되돌리지 않고 9번 "브랜치 다시 만들기"로 뺀다. 마지막 커밋은 `.claude/autelon-sync.json`을 `pluginSha` = `<target>`, `syncedAt` = 오늘 `YYYY-MM-DD`, `note` = `#<N>`으로 바꾸는 행이다(파일 전문을 준다). 쪼갠 경우 이 행은 마지막 단계에서만 넣는다(5번 "단계 이슈를 처리할 때" 5). 앞 단계에는 넣지 않는다.
3. `autelon:sync-editor`를 부른다. 지시문에 넣을 것: 저장소, sync 이슈 번호, 브랜치 `chore/autelon-sync-<target>`, 모드(`새로` / `이어서` / `다시 만들기`와 예상 head sha), worktree 이름(예: `sync-<target>`), 옮길 행과 커밋 묶음·커밋 제목(`다시 만들기`면 마지막 판정표의 모든 적용·합침 행과 기준 버전 파일 행), 프로젝트 커밋 규칙(`docs/git-rules.md`), author 모델명과 공동 작성자 줄, 검증 명령, 검사 스크립트 경로와 director "개인 리소스 정보"의 커밋 전 두 검사 명령. director "모든 role 공통"의 출력·코멘트 항목은 넣지 않는다(공용 role이고 응답으로 돌려준다).
4. 응답을 판정표와 맞춰 본다. 건너뛴 행이 있으면 PR을 만들지 않는다. 그 행을 다시 분류하거나 불확실로 사람에게 묻는다(7번).
   - sync-editor가 멈췄다고 응답하면(남은 worktree, 로컬 브랜치와 origin이 다름, 예상 head sha가 다름, 검사 실패, push 거절 등) PR을 만들거나 고치지 않는다. 같은 실행에서 다시 부르지 않는다. 응답의 이유와 남은 worktree·브랜치를 sync 이슈에 코멘트로 남기고 `agent:needs-user`로 넘긴다. 사람이 정리하고 `agent:ready`로 바꾸면 다음 실행이 1번부터 다시 한다.
5. 9번의 검증 체크리스트를 돈다. 통과하면 PR을 연다. 이 브랜치의 열린 PR이 이미 있으면(`다시 만들기`) 새로 열지 않고 그 PR에서 이어 간다. draft와 `gh pr ready`는 쓰지 않는다(`pr ready`는 검사 스크립트가 받지 않는다).
   ```
   node <S> gh pr create -R <o>/<r> --head chore/autelon-sync-<target> --title "<프로젝트 커밋 규칙을 따른 제목, 대상 SHA 포함>" -F local/prs/sync-<target>.md
   ```
   PR 본문: `Refs #<N>`(`Closes`는 쓰지 않는다), 판정표 요약(적용·합침 행), 바꾸지 않은 행(프로젝트 유지)과 이유, `tools:`에서 빠지는 도구와 근거 이슈, 관문 파일을 바꾸는지(9번), 사람 확인 이슈 번호(10번, 없으면 없음).

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

## 10. GitHub 설정과 루틴

저장소 PR 밖의 일이다. 비교는 7번 판정표를 올리기 전에 하고(쪼갠 경우 sync 이슈에서 한 번), 결과를 판정표의 "GitHub 설정·루틴" 보고 줄에 적는다. 라벨 만들기와 사람 확인 이슈 만들기는 판정표를 올린 뒤에 한다. 이 일은 sync PR과 상관이 없으므로 불확실이 남아 멈추는 실행에서도 한다. 다음 실행이 1번부터 다시 해도 겹치지 않게, 라벨은 빠진 것만 만들고 사람 확인 이슈는 이미 있으면 만들지 않는다.

**라벨**

- 기준: 대상 SHA의 `plugin/playbooks/issues.md` 2절 "라벨" 코드 블록의 `gh label create <이름> … --color <색> --description "<설명>"` 줄(6번의 raw 읽기 명령으로 읽는다).
- 프로젝트: `gh label list -R <o>/<r> --limit 200 --json name --jq '.[].name'`. 이름만 비교한다.
- 사람이 연 세션: 빠진 라벨만 그 줄 그대로(`<S>`, `<o>/<r>`만 채운다) `node <S> gh label create …`로 만든다. 스크립트 없는 `gh label create`는 훅이 막는다. **있는 라벨의 이름·색·설명은 바꾸지 않는다**(달라도 고치지 않고 적지도 않는다). 만든 라벨을 보고 줄에 적는다.
- 루틴: 만들지 않는다(#67 결정 8. 루틴 지시문의 "저장소 설정을 바꾸지 않는다"를 해석에 기대지 않는다). 빠진 라벨을 아래 사람 확인 이슈의 항목으로 넘긴다.

**Project 필드·Status 선택지·화면·워크플로** (사람이 연 세션도 보고만)

- `<P>`는 프로젝트 `CLAUDE.md`의 "기록" 표에 적힌 Project 번호, `<조직>`은 저장소의 조직이다. 번호가 없으면 "Project 번호 없음"을 항목으로 넘긴다.
- GraphQL로 한 번 읽는다. `gh project field-list` 같은 `gh project` 하위 명령은 쓰지 않는다(호출 하나에 약 100포인트, `playbooks/issues.md` 0절).
  ```
  gh api graphql -f query='{ organization(login:"<조직>"){ projectV2(number:<P>){ fields(first:50){ nodes{ ... on ProjectV2FieldCommon { name dataType } ... on ProjectV2SingleSelectField { options { name } } } } views(first:20){ nodes{ name layout verticalGroupByFields(first:5){ nodes{ ... on ProjectV2FieldCommon { name } } } } } workflows(first:20){ nodes{ name enabled } } } } }'
  ```
- 대상 SHA의 `issues.md` 2절 "Project"와 비교한다.
  - 필드: `Role`(단일 선택, 선택지에 `director`가 있다. 나머지 선택지는 프로젝트 role이라 비교하지 않는다), `Size`(`small`, `large`), `Start date`·`Target date`(날짜).
  - `Status` 선택지: "Status 선택지" 절의 이름 목록.
  - 화면: 표, 열 기준이 `Status`인 보드, 열 기준이 `Role`인 보드, 로드맵. 이름이 아니라 `layout`과 `verticalGroupByFields`로 본다.
  - 워크플로: "기본 워크플로" 표의 켬·끔과 `enabled`. 대상 값(Status = `backlog` 등)은 API로 읽을 수 없다. 3번 범위에서 `issues.md`가 바뀌었으면 "웹 워크플로 화면에서 대상 값 확인"을 항목으로 넣는다.
- 프로젝트 `CLAUDE.md`에 다르게 둔 이유가 적힌 차이(`issues.md` 2절: 프로젝트가 다르게 켜면 그 이유를 `CLAUDE.md`에 적는다)는 "프로젝트 유지"로 보고 줄에만 적고 사람 확인 이슈에 넣지 않는다. 이유가 없는 차이는 사람 확인 이슈 항목이다.
- 아무것도 바꾸지 않는다. Status 선택지는 넘긴 목록이 전체가 되어 기존 선택지와 워크플로 대상이 지워질 수 있고(`issues.md` 2절 [확인]), 화면의 열 기준과 워크플로는 웹 설정이 필요하다.

**루틴 지시문**: 3번 범위에서 `plugin/templates/routine/prompt.md`가 바뀌었으면 "루틴 지시문 다시 등록"을 항목으로 넣는다. 다시 등록은 사람이 승인한 뒤 `playbooks/routine.md` "바꿀 때"대로 한다. 이 스킬은 예약 작업을 고치지 않는다.

**사람 확인 이슈**: 위 항목(루틴에서 빠진 라벨, Project 번호 없음, 이유 없는 Project 차이, 워크플로 대상 값 확인, 루틴 지시문 다시 등록)이 하나라도 있으면 사람 확인 이슈 하나로 넘긴다. 없으면 만들지 않는다.

1. 이미 있는지 본다. sync 이슈에 `사람 확인 이슈: #<M>` 코멘트가 있으면 새로 만들지 않는다. 코멘트가 없어도 앞 실행이 이슈를 만든 뒤 코멘트 전에 끊겼을 수 있으므로 `gh issue list -R <o>/<r> --author @me --state all --search 'in:title "sync 설정 확인 (<target>)"' --json number,title,body,state`에서 제목이 정확히 `sync 설정 확인 (<target>)`이고 본문에 `이어지는 이슈: #<N>`이 있는 이슈를 찾는다. 있으면 새로 만들지 않고 아래 3의 코멘트만 남긴다. **[미확인]** 막 만든 이슈가 검색 색인에 바로 보이는지. 그 이슈가 열려 있고 이번에 새 항목이 생겼으면 그 이슈에 코멘트로 더한다(루틴이면 첫 줄 `[루틴]`).
2. 만든다(타입 Task). 본문은 `local/issues/sync-<target>-check.md`에 쓴다.
   ```
   node <S> gh issue create -R <o>/<r> --type Task --title "sync 설정 확인 (<target>)" -F local/issues/sync-<target>-check.md --label agent:needs-user
   ```
   - 제목은 일반 task 제목이고 `autelon sync:`로 시작하지 않는다(5번의 단계 이슈와 같은 이유).
   - 본문은 `templates/issues/task.md`의 절을 쓰고 다음을 넣는다: `이어지는 이슈: #<N>`, 항목마다 무엇이 다른지와 할 일, 참고할 절(라벨은 `issues.md` 2절 "라벨"의 명령, Project는 2절과 "웹 설정", 루틴은 `routine.md` "바꿀 때"), "사람이 연 director 세션이 처리한다(루틴은 건너뛴다)", "이 이슈는 sync PR을 막지 않는다".
3. sync 이슈에 `사람 확인 이슈: #<M>` 한 줄 코멘트를 남긴다(루틴이면 첫 줄 `[루틴]`). 판정표 보고 줄, PR 본문, 11번 결과 코멘트에 이 번호를 적는다.

- 처리: 사람이 연 director 세션이 한다. 웹 설정은 `issues.md` "웹 설정"대로 director가 브라우저 도구로, 라벨은 2절 명령으로, 루틴 재등록은 `routine.md` "바꿀 때"대로 사람이 승인한 뒤에 한다. 끝나면 결과를 코멘트로 남기고 닫는다.
- 이 이슈는 sync PR을 막지 않는다. sync 이슈는 PR이 머지되면 이 이슈가 열려 있어도 11번에서 닫는다.
- **[확인]** 2026-10-05 위 GraphQL을 autelon 조직의 Project 두 개에 읽기로 실행했다: 질의 하나의 `rateLimit { cost }`가 1이고, 필드와 선택지, 화면의 `layout`·열 기준, 워크플로 `enabled`가 나온다. **[미확인]** 실제 sync에서 이 비교와 사람 확인 이슈를 만든 적은 없다.

## 11. 마무리

머지되면(사람이 머지했으면 다음 실행의 1번 (a)에서 여기로 온다):

1. sync 이슈에 결과 코멘트를 남긴다: PR 번호, 머지 커밋, 새 `pluginSha`, 판정 수(적용·합침·프로젝트 유지), 10번에서 만든 라벨과 사람 확인 이슈 번호.
2. `gh issue close <N> -R <o>/<r> --reason completed`로 닫는다(`--comment` 없이). 처리 중에 더 새 `설치 SHA:` 줄이 붙었어도 닫는다. 다음 세션의 버전 비교가 새 기준으로 새 sync 이슈를 만든다.
3. 쪼갠 경우에는 마지막 단계 이슈에서 여기로 온다. 마지막 단계 이슈에 PR 번호와 머지 커밋을 적은 결과 코멘트를 남기고(루틴이면 첫 줄 `[루틴]`) `--reason completed`로 먼저 닫은 뒤, 위 1·2를 sync 이슈 `<N>`에 한다.

## 12. 기준 버전 정하기 이슈

기준 버전 파일이 없거나 `pluginSha`가 `미정`이라 director가 만든 `autelon sync: 기준 버전 정하기` 이슈(`agent:needs-user`)의 처리다. 갈래는 이슈 템플릿 "사람에게 묻기"의 셋이다(#67 결정 5): ① 지금 설치 SHA를 기록 ② 사람이 준 SHA를 기록 ③ 그대로 둔다. `<sha>`는 기록할 SHA(12자)다.

1. **이어 가는지 본다.** `<me>`가 쓴 결정 코멘트 중 `기록할 SHA: <12자>` 줄이 있는 가장 마지막 것이 있으면 그 값이 `<sha>`다.
   - `git fetch origin` 뒤 `git show origin/main:.claude/autelon-sync.json`의 `pluginSha`가 `<sha>`이고 `chore/autelon-sync-<sha>` PR이 머지됐으면 6번(마무리)으로 간다.
   - 그 브랜치의 열린 PR이 있으면 5번의 검증·리뷰·머지부터 이어 간다.
   - 결정 코멘트가 없는데 `origin/main`의 `pluginSha`가 이미 12자 SHA면(다른 경로로 기록됨) 고치지 않는다. 그 사실을 코멘트로 남기고 `agent:needs-user`로 넘긴다.
2. **답을 읽는다.** 사람의 답은 맨 위 기준(`[루틴]` 코멘트, role 결과 코멘트, `보낸 곳:` 코멘트는 답이 아니다)으로 고른, `<me>`가 쓴 코멘트다. 사람이 연 세션에서 답이 없으면 AskUserQuestion으로 세 갈래를 묻는다.
   - ①②이고 `origin/main`에 기준 버전 파일이 없으면, 이 프로젝트가 설립(`found-company`)인지 도입(`adopt-project`)인지도 답에 있어야 한다. 이 값을 파일 첫 판의 `note`에 쓴다. 4번은 첫 판의 `note`로 설립·도입을 가리므로, 여기서 `#<N>`을 쓰면 이후 모든 sync가 그 구분을 다시 묻게 된다.
   - 갈래를 정할 수 없거나, ②인데 SHA가 없거나, 위 설립·도입이 없으면 고치지 않는다. 사람이 연 세션은 빠진 것만 AskUserQuestion으로 묻는다. 루틴은 빠진 것을 묻는 코멘트를 남기고 `agent:needs-user`로 넘긴다(답이 하나도 없으면 같은 질문을 다시 적는다).
3. **③ 그대로 둔다**: 답을 결정 코멘트로 남기고, 이슈를 닫지 않고 `agent:needs-user`로 돌린다. 열린 sync 이슈만 찾으므로 닫으면 다음 세션이 같은 이슈를 다시 만든다(`docs/design.md` 2절). 여기서 끝낸다.
4. **①② 기록할 SHA를 정하고 확인한다.**
   - ①: 사람의 답 코멘트보다 **앞에** 있는 가장 마지막 `설치 SHA: ` 줄(1번 (b)와 같이 본문 표와 `<me>`의 코멘트에서)의 값이다. 답 뒤에 붙은 줄은 쓰지 않는다. 사람이 보고 고른 값이 아니기 때문이다. 그보다 새 설치본은 이 기록이 머지된 뒤 다음 세션의 버전 비교가 새 sync 이슈로 다룬다.
   - ②: 사람이 준 SHA의 앞 12자. 16진수 12자 이상이 아니면 다시 묻는다.
   - 확인(둘 다): `gh api repos/autelon/company/commits/<sha> --jq .sha`가 40자 SHA를 준다. `gh api repos/autelon/company/compare/<sha>...main --jq .status`가 `ahead`나 `identical`이다(main의 조상이다. 아니면 다음 버전 비교가 `diverged`가 된다). ②는 `compare/<sha>...<가장 마지막 설치 SHA>`도 `ahead`나 `identical`이어야 한다(설치본보다 새 SHA면 다음 비교가 `behind`가 된다).
   - 걸리면 고치지 않고, 이유와 함께 다시 묻는다(루틴은 `agent:needs-user`).
   - 통과하면 결정 코멘트(`comment-decision.md`)를 남긴다. "후속 조치"에 `기록할 SHA: <sha>`, 파일을 새로 만들면 `첫 판 note: 설립` 또는 `첫 판 note: 도입`, 확인 명령의 결과를 적는다.
5. **기록 PR.** 8번 3·4·5와 9번을 이 PR에 맞춰 쓴다. 판정표와 blob SHA 비교는 없다.
   - `autelon:sync-editor` 지시: 브랜치 `chore/autelon-sync-<sha>`, 모드 `새로`(그 브랜치가 origin에 있는데 열린 PR이 없으면 부르지 않고 사람에게 묻는다), 행 하나. 파일이 없으면 동작 "파일 생성"으로 `{"pluginSha": "<sha>", "syncedAt": "<오늘 YYYY-MM-DD>", "note": "<설립 또는 도입>"}`의 전문(템플릿 `templates/project/autelon-sync.json`의 세 필드와 순서), 파일이 있으면(`pluginSha`가 `미정`) 같은 꼴에 `note` = `#<N>`인 전문으로 바꾼다.
   - 검증: `git diff --name-only origin/main...origin/chore/autelon-sync-<sha>`가 `.claude/autelon-sync.json` 하나뿐이고, 그 파일이 JSON으로 읽히며 필드가 셋, `pluginSha`가 `<sha>`, `note`가 위 값이다.
   - PR: `node <S> gh pr create -R <o>/<r> --head chore/autelon-sync-<sha> --title "<프로젝트 커밋 규칙을 따른 제목, SHA 포함>" -F local/prs/sync-<sha>.md`. 본문: `Refs #<N>`(`Closes`는 쓰지 않는다), 고른 갈래와 `<sha>`, 4번 확인 결과, 새 파일이면 첫 판 `note`.
   - 리뷰·보안 검토를 같은 head sha로 받는다. 기준 버전 파일은 관문 파일이 아니므로 프로젝트 리뷰어 설정대로 머지한다(9번 "머지를 누가 정하나", "머지 명령"). 머지 큐나 auto-merge로 머지가 늦게 끝나면 이슈를 `agent:ready`로 두어 다음 실행이 1번에서 6번으로 가게 한다. 리뷰어가 사람이면 `agent:needs-user`로 넘기고, 머지한 뒤 `agent:ready`로 돌려 달라고 적는다.
6. **마무리.** 머지되면 이슈에 결과 코멘트(PR 번호, 머지 커밋, 기록한 `pluginSha`)를 남기고 `gh issue close <N> -R <o>/<r> --reason completed`로 닫는다. **꼭 닫는다.** 열린 `autelon sync:` 이슈가 있으면 director "시작할 때" 7번이 새 sync 이슈를 만들지 않으므로, 이 이슈가 열려 있으면 기록한 SHA 이후의 sync가 시작되지 않는다. 다음 세션의 버전 비교가 기록한 SHA와 설치 SHA를 비교해 다르면 새 sync 이슈를 만든다.
   - 닫기 전에 관문 sync 줄을 확인한다. 기록한 SHA 이전의 템플릿 변경은 이후 sync 범위에 들지 않으므로(①은 프로젝트 파일이 이미 그 버전에 맞는다고 보는 것이다), 9번 "머지를 누가 정하나"의 규칙이 프로젝트 문서에 없을 수 있다. `<sha>`의 `plugin/templates/project/git-rules.md`(6번의 raw 읽기 명령)의 "머지 조건" 절에 "플러그인 버전 맞추기(sync) PR이 관문 파일" 문단이 있고, `git show origin/main:docs/git-rules.md`에 같은 문단이 없으면 결과 코멘트에 적고 후속 task 이슈를 `agent:needs-user`로 만든다(director "후속 이슈", 본문에 `이어지는 이슈: #<N>`, 넣을 문단, 템플릿 경로와 `<sha>`). `docs/git-rules.md`는 관문 파일이라 그 PR의 머지는 사람이 정한다. 규칙 자체는 이 스킬 9번이 지키므로 이 이슈는 sync를 막지 않는다.

- **[확인]** 2026-10-05 autelon/company에서: `compare/<main의 조상 SHA>...main`이 `ahead`(PR 브랜치 커밋도 머지 뒤에는 조상이라 `ahead`), `compare/<main head>...main`이 `identical`, `commits/<12자>`가 40자 SHA를 준다. **[미확인]** 이 절 전체를 실제 프로젝트에서 돌리지 않았다.

## 하지 않는 것

- 플러그인을 업데이트하지 않는다(사람이 한다).
- 다른 저장소와 이미 열린 이슈의 본문을 고치지 않는다. 템플릿의 결함이 보이면 autelon/company에 새 이슈로 알린다(director "다른 프로젝트에 전달").
- 프로젝트에만 있는 절·키·파일을 지우지 않는다. 템플릿이 없는 role은 손대지 않는다.
- 불확실이 남은 채로 파일을 고치거나 PR을 만들지 않는다. 일부만 맞추고 기준 SHA를 올리지 않는다.
- `ahead`가 아닌 대상으로 맞추지 않는다(옛 템플릿으로 되돌리지 않는다).
- 있는 라벨을 바꾸지 않는다. 라벨은 사람이 연 세션에서 빠진 것만 만든다(루틴은 만들지 않는다). Project 선택지·필드·화면·워크플로를 만들거나 바꾸지 않는다. 루틴을 다시 등록하지 않는다.
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
  - 단계 쪼개기(5번): 실제 sync에서 쪼갠 적이 없다. 단계 크기(파일 3개)와 순서, 단계 이슈를 여러 루틴 실행에 걸쳐 처리하며 `push head:`로 `이어서`를 고르는 흐름, `push head:` 없이 끝난 앞선 시도를 `merge-base --is-ancestor`와 경로로 알아보고 `다시 만들기`로 가는 흐름, 정리 요청을 받은 사람이 단계 이슈를 닫고 sync 이슈 라벨을 바꾼 뒤 새 단계 이슈가 만들어지는 흐름, 단계 이슈를 `--blocked-by`로 만든 뒤 앞 단계를 닫으면 막힘이 풀리는지.
  - 절 단위 판정의 실제 정확도. 실제 프로젝트 파일로 돌려 보지 않았다.
