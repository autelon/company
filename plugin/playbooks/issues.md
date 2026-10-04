# 이슈·Project 운영 명령

director 스킬, found-company, adopt-project가 가리키는 명령 모음이다. 규칙(누가 무엇을 쓰는가)은 director 스킬에 있고, 여기에는 **어떻게**만 적는다.
아래 `<S>`는 개인 정보 검사 스크립트(`plugin/scripts/privacy-check.mjs`)의 경로다. 스킬은 `${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.mjs`로 받는다. 이 파일 안에서는 치환되지 않으니 스킬에서 받은 값을 쓴다. `<o>/<r>`는 프로젝트 저장소, `<P>`는 프로젝트의 Project 번호(프로젝트 `CLAUDE.md`에 적는다).

표기: **[확인]** 실행·문서로 확인함 / **[미확인]** poker 시험 운영에서 확인할 것

## 0. 권한

- 이슈·라벨·마일스톤은 지금 토큰의 `repo` 권한으로 된다.
- `gh project`는 토큰에 `project` 권한이 필요하다. `gh auth status`의 Token scopes에 `project`가 없으면 멈추고 사람에게 알린다. 사람이 허락하면 에이전트가 `gh auth refresh -h github.com -s project`를 실행하고, 사람은 브라우저에서 승인만 한다. 사용자는 CLI를 직접 입력하지 않는다.
- `gh issue create --project`, `gh issue edit --add-project`가 `project` 권한 없이 되는지 **[미확인]**.

## 1. 쓰기는 모두 검사 스크립트를 거친다

이슈·PR의 제목·본문·코멘트를 올리거나 고치는 명령은 `gh` 앞에 `node <S>`를 붙인다. 스크립트가 제목과 본문 파일을 검사하고 통과할 때만 그 `gh` 명령을 실행한다.

```
node <S> gh issue comment <N> -R <o>/<r> -F local/comments/<N>-<role>.md
node <S> gh issue create -R <o>/<r> --type Task --title "<제목>" -F local/issues/<이름>.md
node <S> gh issue edit <N> -R <o>/<r> -F local/issues/<N>.md
```

- 본문은 파일로 넘긴다(`-F`). 표준 입력(`-F -`), `-e/--editor`, `-w/--web`, `-T/--template`, `-f/--fill*`, `--recover`, `--delete-last`, 묶어 쓴 짧은 플래그(`-dw`)는 거절된다. create·comment는 본문이, create는 제목(`-t`)도 없으면 거절된다(커밋 메시지나 대화형 입력에서 채워지지 않게). 파일은 커밋하지 않는 `local/` 아래에 쓴다(`local/comments/`, `local/issues/`).
- 라벨·마일스톤·상태만 바꾸는 명령(`--add-label`, `close`)은 글이 없으니 스크립트 없이 실행해도 된다.
- 걸리면 위치와 종류만 찍고 올리지 않는다. 값을 고쳐 다시 실행한다. 패턴 설명이 필요한 글은 "사용자 홈 경로"처럼 말로 쓴다.
- 이미 올라간 본문·코멘트를 고쳐도 GitHub의 편집 이력에 이전 내용이 남는 것으로 안다. 누가 그 이력을 볼 수 있는지, 이력에서 지울 수 있는지는 **[미확인]**. 그래서 올리기 전에 막는다.

## 2. 설립·도입 때 준비 (한 번)

### 이슈 타입

- `gh api orgs/<조직>/issue-types --jq '.[].name'`으로 Task·Bug·Feature가 있는지 본다. autelon 조직에는 셋이 있다 **[확인]** 2026-10-04. 없으면 조직 설정을 바꾸지 말고 사람에게 알린다.
- 쓰는 법: task = Task, PRD = Feature, 결정 = Task + `decision` 라벨.

### 라벨

```
gh label create decision  -R <o>/<r> --color 5319E7 --description "어느 이슈에도 속하지 않는 결정"
gh label create sprint    -R <o>/<r> --color 0E8A16 --description "현재 스프린트(director 인계)"
gh label create first-run -R <o>/<r> --color FBCA04 --description "설립·도입 뒤 첫 점검"
gh label create agent:ready      -R <o>/<r> --color 1D76DB --description "루틴이 처리할 이슈"
gh label create agent:needs-user -R <o>/<r> --color D93F0B --description "사람의 결정이 필요함(루틴은 건너뜀)"
```

- `agent:ready`·`agent:needs-user`는 이슈 작업 루프의 라벨이다(director 스킬 "이슈 작업 루프", `playbooks/routine.md`). 라벨이 없는 이슈는 사람이 쓰는 중인 초안으로 본다. 사람이 `agent:needs-user` 이슈에 답하면 `agent:ready`로 바꾼다.

### Project (프로젝트마다 하나)

```
gh project create --owner <조직> --title "<저장소 이름>" --format json --jq .number   # → <P>
gh project link <P> --owner <조직> --repo <o>/<r>
gh project field-create <P> --owner <조직> --name Role --data-type SINGLE_SELECT --single-select-options "<프로젝트 role들, 쉼표로>"
gh project field-create <P> --owner <조직> --name Size --data-type SINGLE_SELECT --single-select-options "small,large"
gh project field-create <P> --owner <조직> --name "Start date" --data-type DATE
gh project field-create <P> --owner <조직> --name "Target date" --data-type DATE
```

- `Status`는 Project의 기본 필드를 쓴다. 선택지를 `backlog, ready, in_progress, review, awaiting_approval, blocked, done, rejected`로 바꿔야 하는데, `gh project`에는 기본 필드의 선택지를 고치는 명령이 없다 **[확인]** gh 2.102.0 도움말. GraphQL `updateProjectV2Field`로 되는지 **[미확인]**. 안 되면 사람에게 웹 화면에서 한 번 바꿔 달라고 요청한다.
- 화면(view): 표, `Status`별 보드, `Role`별 보드, 로드맵(`Start date`·`Target date`, 마일스톤). 화면을 API로 만들 수 있는지 **[미확인]**. 안 되면 사람에게 웹 화면에서 만들어 달라고 요청한다.
- 내장 자동화(닫힘 → `Status=done`, 저장소에서 자동 추가)는 웹 화면에서 켠다(문서 기준). 자동 추가를 켜지 않으면 이슈를 만들 때 `--project "<저장소 이름>"`을 붙인다.
- Free 조직에서 조직 Project를 쓸 수 있는지 문서 문장을 찾지 못했다 **[미확인]**. autelon 조직은 Free이고 `has_organization_projects`는 true다 **[확인]** 2026-10-04.
- Project 번호 `<P>`는 개인 정보가 아니다. 프로젝트 `CLAUDE.md`의 "기록" 표에 적는다.

### 마일스톤

`gh`에 마일스톤 명령이 없어 API를 쓴다.

```
gh api repos/<o>/<r>/milestones -f title="M-01 <이름>" -f due_on="2026-11-01T00:00:00Z" -f description="<한 줄>"
```

### 고정 이슈

- 현재 스프린트: `templates/issues/sprint.md`로 만들고 `--label sprint`, 그다음 `gh issue pin <N> -R <o>/<r>`. 저장소당 고정 이슈는 3개까지다(문서 기준).
- first-run: `templates/issues/first-run.md`로 만들고 `--label first-run`.

## 3. 운영 명령

### 읽기

| 알고 싶은 것              | 명령                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| 현재 스프린트 인계        | `gh issue list -R <o>/<r> --label sprint --state open --json number,body`                       |
| first-run을 했는가        | `gh issue list -R <o>/<r> --label first-run --state all --json number,state` (비어 있으면 아직) |
| 보드 전체                 | `gh project item-list <P> --owner <조직> --format json --limit 1000`                            |
| 이슈 본문(현재 결론)      | `gh issue view <N> -R <o>/<r> --json title,body,labels,milestone,parent,subIssues,blockedBy`    |
| 경위(코멘트)              | `gh issue view <N> -R <o>/<r> --comments`                                                       |
| 결정 이슈                 | `gh issue list -R <o>/<r> --label decision --state all`                                         |
| 루틴 처리 대상            | `gh issue list -R <o>/<r> --author @me --label agent:ready --state open`                        |
| 사람의 답을 기다리는 이슈 | `gh issue list -R <o>/<r> --label agent:needs-user --state open`                                |
| 여러 프로젝트 (루트 세션) | `gh search issues --owner <조직> --state open`                                                  |

`gh project item-list`의 JSON에서 필드 값이 어떤 키로 나오는지 **[미확인]**. 처음 쓸 때 출력을 보고 이 표를 고친다.

### task 만들기

```
node <S> gh issue create -R <o>/<r> --type Task --title "<제목>" -F local/issues/<이름>.md \
  --parent <PRD 이슈 번호> --milestone "M-01 <이름>" --blocked-by <N> --project "<저장소 이름>"
```

`--parent`, `--blocked-by`, `--type`, `--project`는 gh 2.102.0 `gh issue create --help`에 있다 **[확인]**. 실제 동작은 **[미확인]**.

### Project 필드 고치기

`gh project item-edit`는 ID가 필요하다.

```
gh project view <P> --owner <조직> --format json --jq .id                       # project-id
gh project field-list <P> --owner <조직> --format json                          # field id, 선택지 id
gh project item-list <P> --owner <조직> --format json --limit 1000 \
  --jq '.items[] | select(.content.number == <N>) | .id'                         # item id
gh project item-edit --id <item id> --project-id <project-id> --field-id <field id> --single-select-option-id <선택지 id>
gh project item-edit --id <item id> --project-id <project-id> --field-id <field id> --date 2026-11-01
```

ID는 조회해서 쓰고 파일에 저장하지 않는다.

### 닫기

- 끝남: `gh issue close <N> -R <o>/<r> --reason completed`
- 반려: `gh issue close <N> -R <o>/<r> --reason "not planned"`
- 닫을 때 남길 말이 있으면 먼저 검사 스크립트로 코멘트를 올린다(`gh issue close --comment`는 검사를 거치지 않으니 쓰지 않는다).

## 4. 백업 (작업 단위 종료 때)

저장소를 지우면 이슈와 코멘트가 함께 사라진다. 그래서 작업 단위가 끝날 때마다 로컬 `local/backup/`(커밋하지 않음)에 받는다.

```
d=local/backup/$(date +%Y-%m-%d); mkdir -p "$d"
gh api "repos/<o>/<r>/issues?state=all&per_page=100" --paginate --slurp > "$d/issues.json"
gh api "repos/<o>/<r>/issues/comments?per_page=100" --paginate --slurp > "$d/comments.json"
gh api "repos/<o>/<r>/milestones?state=all&per_page=100" --paginate --slurp > "$d/milestones.json"
gh project item-list <P> --owner <조직> --format json --limit 1000 > "$d/project.json"
```

- `issues` 응답에는 PR도 섞여 있다(`pull_request` 키). 그대로 둔다.
- `gh issue list`는 기본 30개까지만 가져오므로 백업에 쓰지 않는다.
- 하위 이슈·의존 관계가 REST 응답에 들어 있는지 **[미확인]**. 없으면 `gh issue list --state all --limit 1000 --json number,parent,subIssues,blockedBy`를 더한다.
