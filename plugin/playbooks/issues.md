# 이슈·Project 운영 명령

director 스킬, found-company, adopt-project가 가리키는 명령 모음이다. 규칙(누가 무엇을 쓰는가)은 director 스킬에 있고, 여기에는 **어떻게**만 적는다.
아래 `<S>`는 개인 정보 검사 스크립트(`plugin/scripts/privacy-check.mjs`)의 경로다. 스킬은 `${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.mjs`로 받는다. 이 파일 안에서는 치환되지 않으니 스킬에서 받은 값을 쓴다. `<o>/<r>`는 프로젝트 저장소, `<P>`는 프로젝트의 Project 번호(프로젝트 `CLAUDE.md`에 적는다).

표기: **[확인]** 실행·문서로 확인함 / **[미확인]** 아직 확인하지 못함. 처음 실제로 쓰는 프로젝트가 확인하고 결과를 autelon/company 이슈로 알린다. poker 기록 이전(2026-10-04, autelon/company#30)과 logistics-hub 기록 이전(2026-10-04, autelon/company#43)에서 확인한 것은 [확인]으로 바꿨다.

## 0. 권한과 API 한도

- 이슈·라벨·마일스톤은 지금 토큰의 `repo` 권한으로 된다.
- `gh project`는 토큰에 `project` 권한이 필요하다. `gh auth status`의 Token scopes에 `project`가 없으면 멈추고 사람에게 알린다. 사람이 허락하면 에이전트가 `gh auth refresh -h github.com -s project`를 실행하고, 사람은 브라우저에서 승인만 한다. 사용자는 CLI를 직접 입력하지 않는다.
- `gh issue create --project`는 `project` 권한이 있는 토큰으로 된다 **[확인]** poker. `project` 권한 없이 되는지는 **[미확인]**(poker·logistics-hub 모두 권한이 먼저 있었다).
- GraphQL 한도는 시간당 5,000 포인트다(GitHub 문서). 한도가 토큰 단위인지 계정 단위인지는 **[미확인]**이다. 적어도 한 기기의 세션들은 같은 gh 토큰을 쓰므로 이 한도를 같이 쓴다. **`gh project` 하위 명령(`item-edit`, `item-list`, `field-list` 등)은 호출 한 번에 약 100 포인트를 쓴다.** 같은 일을 GraphQL로 직접 부르면(3절 "Project 필드 고치기"의 id 방식) 1 포인트 안팎이다.
  - 근거: logistics-hub 이전(2026-10-04, autelon/company#43)에서 `gh project` 하위 명령 호출 앞뒤의 `rateLimit { used }` 차이가 약 100~103이었고, `item-edit --url` 40번 남짓에 한 시간 한도가 바닥났다. 그 측정에는 같은 계정의 다른 세션 사용이 섞였을 수 있다. 같은 날 poker Project를 읽기만 해서 다시 쟀다: `gh project field-list` 약 100(앞뒤 차이), 필드·선택지 id를 읽는 GraphQL과 이슈의 Project 항목 id를 읽는 GraphQL은 각각 `rateLimit { cost }` 1. id 방식 mutation도 거의 들지 않았다(logistics-hub).
  - 가늠: GraphQL 포인트 ≈ 100 × (`gh project` 하위 명령 호출 수) + 1 × (직접 부른 GraphQL 수). 예: 이슈 40개에 필드 두 개씩을 `item-edit`로 고치면 약 8,000 포인트로 한 시간 한도를 넘고, id 방식이면 항목 id 조회를 더해도 120 안팎이다. `gh issue`·`gh pr` 명령이 GraphQL을 얼마나 쓰는지는 **[미확인]**이다.
  - 지금 남은 양: `gh api graphql -f query='{ rateLimit { used remaining resetAt } }'`. GraphQL 질의에 `rateLimit { cost }`를 넣으면 그 질의의 비용만 나온다(다른 세션 사용이 섞이지 않는다).

## 1. 쓰기는 모두 검사 스크립트를 거친다

공개되는 글을 쓰는 명령은 `gh` 앞에 `node <S>`를 붙인다. 스크립트가 글을 검사하고 통과할 때만 그 `gh` 명령을 그대로 실행한다. 받는 명령은 이슈·PR의 create·edit·comment, 라벨 만들기·고치기, 마일스톤 만들기·고치기, 이슈 코멘트 고치기다(autelon/company#27).

```
node <S> gh issue comment <N> -R <o>/<r> -F local/comments/<N>-<role>.md
node <S> gh issue create -R <o>/<r> --type Task --title "<제목>" -F local/issues/<이름>.md
node <S> gh issue edit <N> -R <o>/<r> -F local/issues/<N>.md
node <S> gh label create <이름> -R <o>/<r> --color <색> --description "<설명>"
node <S> gh api repos/<o>/<r>/milestones -f title="<제목>" -f description="<설명>"
node <S> gh api -X PATCH repos/<o>/<r>/issues/comments/<코멘트 id> -F body=@local/comments/<파일>.md
```

- 본문은 파일로 넘긴다(`-F`). 표준 입력(`-F -`), `-e/--editor`, `-w/--web`, `-T/--template`, `-f/--fill*`, `--recover`, `--delete-last`, 묶어 쓴 짧은 플래그(`-dw`)는 거절된다. create·comment는 본문이, create는 제목(`-t`)도 없으면 거절된다(커밋 메시지나 대화형 입력에서 채워지지 않게). 파일은 커밋하지 않는 `local/` 아래에 쓴다(`local/comments/`, `local/issues/`).
- 이슈에 라벨·마일스톤을 달거나 상태만 바꾸는 명령(`--add-label`, `close`)은 글이 없으니 스크립트 없이 실행해도 된다.
- 라벨(`gh label create|edit`)은 이름·새 이름·설명을 검사한다. 받는 플래그는 `-c/--color`, `-d/--description`, `-n/--name`(edit), `-f/--force`(create), `-R/--repo`뿐이다.
- `gh api`는 두 가지만 받는다: 마일스톤 만들기(`POST repos/<o>/<r>/milestones`)·고치기(`-X PATCH .../milestones/<번호>`), 이슈 코멘트 고치기(`-X PATCH repos/<o>/<r>/issues/comments/<id>`). 받는 플래그는 `-X`, `-f/--raw-field`, `-F/--field`, `-q/--jq`, `--silent`이고 필드 값을 모두 검사한다. 본문은 `-F body=@<파일>`로 넘긴다(표준 입력 `@-`, `--input`은 거절된다). 그 밖의 `gh api` 쓰기(GraphQL 포함)는 받지 않는다.
- 마지막이 아닌 코멘트를 고칠 때: `gh api repos/<o>/<r>/issues/<N>/comments --jq '.[] | {id, created_at}'`로 코멘트 id를 찾고, 고친 글을 `local/comments/`에 써서 위 `-X PATCH` 명령으로 올린다. 마지막 코멘트는 `gh issue comment --edit-last -F`로도 된다.
- 스크립트가 받지 않는 글은 Project·화면·Status 선택지 이름뿐이다(`gh project`, GraphQL). 이 playbook의 고정 문구만 쓰고, 다른 이름이 필요하면 올리기 전에 `node <S> scan <파일>`(또는 표준 입력 `-`)에 넣어 통과를 확인한다.
- 플러그인의 PreToolUse 훅(`hooks/hooks.json`)이 스크립트를 거치지 않은 gh 글쓰기를 막는다: `gh issue|pr create|comment`, 제목·본문이 있는 `edit`, `close --comment`, 본문이 있는 `pr review`, 제목·본문이 있는 `pr merge`, `gh label create|edit`, 제목·노트가 있는 `gh release create|edit`, 글이 담긴 REST 자원(코멘트·리뷰·마일스톤·라벨·릴리스, 제목·본문 필드가 있는 이슈·PR)에 쓰는 `gh api`, 글을 쓰는 GraphQL mutation. `timeout`·`nice`·`env` 같은 감싸는 명령과 하위 명령 앞의 `-R`도 걷어 내고 본다. 막힌 이유에 다음 할 일이 나온다: 스크립트가 받는 호출이면 같은 인자로 `node <S> gh ...`, 받지 않는 호출이면 그 안내(예: 코멘트를 먼저 올리고 `close`는 `--comment` 없이)를 따르고, 길이 없으면 다른 방법을 찾지 말고 사람에게 알린다. `gh api graphql --input <파일>`은 파일을 읽어 mutation을 보므로(같은 명령 안의 `cd`는 따라간다) 파일을 못 읽으면 막힌다. 훅은 명령 문자열을 단순하게 나눠 보므로 변수에 담은 명령, `eval`, `bash -c` 안의 명령은 잡지 못한다. 실수 방지 장치이고 규칙은 그대로다.
- **도움말은 `gh help <명령>`이나 `gh <명령> --help`(`-h`)로 본다**(예: `gh help issue create`, `gh issue create --help`). 훅은 명령에 그대로 적힌 글자를 기준으로, 하위 명령 뒤에 도움말 플래그, 위치 인자, `-R`/`--repo`만 있으면 통과시킨다. 위치 인자와 `-R` 값은 셸이 펼치지 않는 글자(영숫자와 `. _ / : @ + = -`)여야 한다. 다른 플래그와 섞거나(`gh issue create -t x --help`), 변수·중괄호·글롭(`$V`, `{a,b}`, `*`)이 든 단어가 있거나, 명령 안에 `$(`·백틱이 있거나, `xargs`로 부르면 글쓰기로 보고 막는다. 값을 받는 플래그 뒤의 `--help`(`--title --help`)는 그 플래그의 값이 되고, 펼친 뒤에 `--help=false`가 붙으면 명령이 실행되기 때문이다(autelon/company#55).
- **훅이 읽을 파일은 먼저 써 두고 다음 명령에서 넘긴다.** 훅은 명령을 실행하기 전에 판정하므로, 같은 명령 안에서 heredoc 등으로 파일을 쓰고 `gh api graphql --input <그 파일>`을 실행하면 파일을 못 읽어 막힌다 **[확인]** logistics-hub(autelon/company#40 코멘트). 파일 쓰기와 실행을 두 번의 명령으로 나누면 통과한다.
- 걸리면 위치와 종류만 찍고 올리지 않는다. 값을 고쳐 다시 실행한다. 패턴 설명이 필요한 글은 "사용자 홈 경로"처럼 말로 쓴다.
- 이미 올라간 코멘트를 고쳐도 편집 이력에 이전 내용이 남고, 저장소 읽기 권한이 있는 누구나(public이면 모두) 그 이력을 볼 수 있다. 이력에서 지우는 것은 작성자와 write 권한자가 웹에서만 할 수 있다(GraphQL에 이력 삭제 mutation이 없다) **[확인]** GitHub 문서 "Tracking changes in a comment". 이슈 본문도 편집 이력이 남는다 **[확인]** autelon/poker#9 의 GraphQL `userContentEdits`. 본문 이력을 누가 볼 수 있는지는 문서가 따로 말하지 않는다. 코멘트와 같다고 본다 **[추정]**. 그래서 올리기 전에 막는다.

## 2. 설립·도입 때 준비 (한 번)

### 이슈 타입

- `gh api orgs/<조직>/issue-types --jq '.[].name'`으로 Task·Bug·Feature가 있는지 본다. autelon 조직에는 셋이 있다 **[확인]** 2026-10-04. 없으면 조직 설정을 바꾸지 말고 사람에게 알린다.
- 쓰는 법: task = Task, PRD = Feature, 결정 = Task + `decision` 라벨.

### 라벨

```
node <S> gh label create decision  -R <o>/<r> --color 5319E7 --description "어느 이슈에도 속하지 않는 결정"
node <S> gh label create sprint    -R <o>/<r> --color 0E8A16 --description "현재 스프린트(director 인계)"
node <S> gh label create first-run -R <o>/<r> --color FBCA04 --description "설립·도입 뒤 첫 점검"
node <S> gh label create agent:ready      -R <o>/<r> --color 1D76DB --description "루틴이 처리할 이슈"
node <S> gh label create agent:needs-user -R <o>/<r> --color D93F0B --description "사람의 결정이 필요함(루틴은 건너뜀)"
```

- `agent:ready`·`agent:needs-user`는 이슈 작업 루프의 라벨이다(director 스킬 "이슈 작업 루프", `playbooks/routine.md`). 라벨이 없는 이슈는 사람이 쓰는 중인 초안으로 본다. 사람이 `agent:needs-user` 이슈에 답하면 `agent:ready`로 바꾼다.

### Project (프로젝트마다 하나)

```
gh project create --owner <조직> --title "<저장소 이름>" --format json --jq .number   # → <P>
gh project link <P> --owner <조직> --repo <o>/<r>
gh project field-create <P> --owner <조직> --name Role --data-type SINGLE_SELECT --single-select-options "director,<프로젝트 role들, 쉼표로>"
gh project field-create <P> --owner <조직> --name Size --data-type SINGLE_SELECT --single-select-options "small,large"
gh project field-create <P> --owner <조직> --name "Start date" --data-type DATE
gh project field-create <P> --owner <조직> --name "Target date" --data-type DATE
```

- Free 조직에서 조직 Project를 만들고 저장소에 연결할 수 있다 **[확인]** poker(`gh project create --owner autelon`, `gh project link`).
- `gh project create`로 만든 Project는 private이다(`gh project view <P> --owner <조직> --format json`의 `public: false`) **[확인]** logistics-hub. poker Project도 지금 private이다. 공개 범위는 바꾸지 않는다(아래 "웹 설정"). Project가 private이어도 항목(이슈)은 원래 저장소 권한을 따르므로, public 저장소의 이슈는 그대로 공개된다(GitHub 문서, `docs/design.md` 5절).
- `Role`에는 프로젝트 role과 `director`를 넣는다. 결정·first-run·스프린트 이슈처럼 role에게 맡기지 않는 이슈의 담당이 director라서, 넣지 않으면 그 항목의 `Role`이 비어 Role 보드에서 빠진다(poker에서 더함).

#### Status 선택지

`Status`는 Project의 기본 필드(선택지 Todo, In Progress, Done)를 쓴다. 선택지를 `backlog, ready, in_progress, review, awaiting_approval, blocked, done, rejected`로 바꾼다. `gh project`에는 기본 필드 선택지를 고치는 명령이 없어 GraphQL `updateProjectV2Field`를 쓴다 **[확인]** poker.

- 넘긴 목록이 선택지 전체가 된다. **`id`를 함께 넘긴 선택지는 id와 항목 값이 그대로인 채 이름만 바뀌고**, id 없이 넘긴 선택지는 새로 생기고, 목록에 없는 기존 선택지는 지워진다 **[확인]** poker(autelon/company#31).
- 그래서 기본 선택지 셋은 id를 유지한 채 이름을 바꾸고(Todo → `backlog`, In Progress → `in_progress`, Done → `done`), 나머지 다섯은 id 없이 더한다. 기본 워크플로(아래)가 기본 선택지를 가리키므로, 이름만 넘겨 통째로 바꾸면 워크플로의 대상이 지워진다(poker에서 여섯 개 모두 "A value is required"가 됐다).
- id를 유지해 이름만 바꾸면 기본 워크플로는 바뀐 이름의 선택지를 계속 가리킨다 **[확인]** logistics-hub: 바꾸기 전 Item added → Todo, Item closed → Done, Pull request linked → In Progress, Pull request merged → Done, Auto-close issue → Done이던 대상이 바꾼 뒤 각각 `backlog`, `done`, `in_progress`, `done`, `done`으로 보였고 "A value is required" 경고는 없었다. 그래도 바꾼 뒤 웹 워크플로 화면에서 대상 값을 확인한다("웹 설정").

```
FID=$(gh project field-list <P> --owner <조직> --format json --jq '.fields[] | select(.name=="Status").id')
gh api graphql -f query='query($f:ID!){ node(id:$f){ ... on ProjectV2SingleSelectField { options { id name } } } }' -f f="$FID"
# 위 출력의 id로 local/status-options.json 을 쓴다(커밋하지 않음). 선택지마다 name, color, description 이 필요하다.
# {"query":"mutation($f:ID!,$o:[ProjectV2SingleSelectFieldOptionInput!]){ updateProjectV2Field(input:{fieldId:$f, singleSelectOptions:$o}){ projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } } } }",
#  "variables":{"f":"<FID>","o":[
#   {"id":"<Todo id>","name":"backlog","color":"GRAY","description":""},
#   {"name":"ready","color":"BLUE","description":""},
#   {"id":"<In Progress id>","name":"in_progress","color":"YELLOW","description":""},
#   {"name":"review","color":"ORANGE","description":""},
#   {"name":"awaiting_approval","color":"PURPLE","description":""},
#   {"name":"blocked","color":"RED","description":""},
#   {"id":"<Done id>","name":"done","color":"GREEN","description":""},
#   {"name":"rejected","color":"PINK","description":""}]}}
gh api graphql --input local/status-options.json
```

- 셸 따옴표 문제를 피하려고 JSON 파일을 `--input`으로 넘긴다(poker에서 이렇게 실행). 파일은 먼저 써 두고 `gh api graphql --input`은 따로 실행한다(같은 명령에서 쓰면 훅이 막는다. 1절). 출력의 8개 이름과, 기본 셋의 id가 바꾸기 전과 같은지 확인한다.
- 선택지 이름은 위 고정 문구만 쓴다(검사 스크립트를 거치지 않는 글이다. 1절).

#### 화면(view)

- 표, `Status`별 보드, `Role`별 보드, 로드맵(`Start date`·`Target date`, 마일스톤).
- GraphQL `createProjectV2View`(이름, 레이아웃 TABLE·BOARD·ROADMAP)로 만들 수 있다 **[확인]** poker. 입력의 설정은 보이는 필드(`visibleFieldIds`)뿐이라 **보드의 열 기준 필드와 로드맵 날짜 필드는 director가 브라우저 도구로 웹 화면에서 정한다**(아래 "웹 설정"). 새 보드의 열 기준은 Status다. 새 Project의 기본 "View 1"은 `deleteProjectV2View`로 지운다.
- 저장 뒤 아래로 확인한다(보드의 `verticalGroupByFields`에 열 기준 필드가 나온다) **[확인]** 2026-10-04 poker Project.

```
gh api graphql -f query='{ organization(login:"<조직>"){ projectV2(number:<P>){ views(first:20){ nodes{ name layout verticalGroupByFields(first:5){ nodes{ ... on ProjectV2FieldCommon { name } } } } } } } }'
```

- 화면 이름은 위 고정 문구만 쓴다.

#### 기본 워크플로 (웹에서 켠다, 아래 "웹 설정")

워크플로는 API로 켜거나 고칠 수 없다. 조회는 되지만 mutation은 `deleteProjectV2Workflow`뿐이다 **[확인]** poker. 새 Project가 어떤 워크플로를 켠 채로 시작하는지는 일정하지 않다: poker는 Auto-add sub-issues 하나, logistics-hub는 여섯 개(Auto-add sub-issues, Auto-close issue, Item added, Item closed, Pull request linked, Pull request merged)가 켜진 채로 시작했다 **[확인]** 2026-10-04. 그래서 **Project를 만든 직후 아래 GraphQL로 `enabled`를 읽고**, 기준표와 다른 것을 director가 브라우저 도구로 끄거나 켠다. 바꾼 뒤 같은 GraphQL로 다시 확인한다 **[확인]** 2026-10-04 poker·logistics-hub Project(대상 값은 나오지 않는다).

- 순서: Project를 만든 직후 `enabled`를 읽고 웹 워크플로 화면에서 켜진 워크플로의 대상 값을 봐 둔다 → Status 선택지를 바꾼다(위) → 웹 설정에서 기준표대로 끄고 켜고 대상 값을 고른다(기준값 `backlog` 등은 선택지를 바꾼 뒤에야 있다). 봐 둔 대상과 비교하면 id 유지 이름 변경 뒤 대상이 그대로인지 바로 알 수 있다(logistics-hub에서 이렇게 확인했다).

```
gh api graphql -f query='{ organization(login:"<조직>"){ projectV2(number:<P>){ workflows(first:20){ nodes{ name enabled } } } } }'
```

| 워크플로                       | 기준값                                       | 이유                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item added to project          | 켬, Status = `backlog`                       | 새 항목이 Status 없이 남지 않게                                                                                                                                                                 |
| Item closed                    | 켬, Status = `done`                          | 닫힌 이슈가 열린 상태로 보이지 않게. 닫힘 사유를 가리지 않으므로 반려 task는 닫은 뒤 `rejected`로 고친다(3절 "닫기")                                                                            |
| Auto-close issue               | 켬 (Status가 `done`이 되면 이슈를 닫는다)    | director는 사람의 승인 뒤에만 `done`을 쓴다. `done`으로 바꾸면 이슈가 completed로 닫힌다                                                                                                        |
| Auto-add sub-issues to project | 켬                                           | PRD의 하위 task가 빠지지 않게                                                                                                                                                                   |
| Pull request linked to issue   | 끔                                           | GitHub은 PR 본문의 닫기 키워드(`Closes #N` 등)나 웹의 Development 칸으로만 PR과 이슈를 연결한다. 이 플러그인은 `Refs #N`만 쓰므로 연결이 생기지 않는다                                          |
| Pull request merged            | 끔                                           | task의 `done`은 사람의 승인 뒤 director가 정한다. 사람이 웹에서 PR을 이슈에 연결하면 머지만으로 `done`(Auto-close가 켜져 있으면 닫힘)이 될 수 있다 **[미확인]** 연결된 이슈 항목에도 적용되는지 |
| Auto-add to project (저장소)   | 선택. 켜지 않으면 이슈를 만들 때 `--project` | 사람이 정한다                                                                                                                                                                                   |

- poker는 사람의 지시로 여섯 개를 모두 켜고 "Pull request linked to issue"를 `review`로 골랐다(autelon/company#31 코멘트). 위 표는 플러그인 규칙(`Refs #N`, 승인 뒤 `done`)에 맞춘 기준값이고, 프로젝트가 다르게 켜면 그 이유를 프로젝트 `CLAUDE.md`에 적는다.

#### 웹 설정 (브라우저 도구)

API로 정할 수 없는 Project 설정(보드 열 기준, 로드맵 날짜 필드, 기본 워크플로)은 **director가 브라우저 도구로 직접 설정한다.** 사람에게 미루지 않는다(사용자 결정 2026-10-04).

- 브라우저: 사람의 로그인 세션이 있는 브라우저 도구(Claude in Chrome 등)를 쓴다. 사용자 환경에 브라우저를 열고 확장을 연결하는 스킬이 있으면 먼저 그것을 쓴다. 브라우저 도구가 없거나 연결되지 않을 때만 사람에게 아래 조작을 그대로(화면, 메뉴, 고를 값) 안내한다.
- 주소: `https://github.com/orgs/<조직>/projects/<P>`. 워크플로는 Project 메뉴의 Workflows 화면이다.
- 화면: Status 보드와 Role 보드는 열 기준 필드를 각각 `Status`, `Role`로, 로드맵은 날짜 필드를 `Start date`·`Target date`로 고른다. **"Save view"를 누른 뒤 뜨는 "Save display options?" 확인 창까지 눌러야 저장된다**(poker에서 한 번 저장이 빠졌다. autelon/logistics-hub#7). 저장 뒤 위 화면 GraphQL로 `verticalGroupByFields`를 확인한다.
- 워크플로: 위 표대로 켜고 대상 값을 고른 뒤 저장한다.
- **Status 선택지를 바꾼 뒤에는 워크플로 화면을 연다.** 선택지를 지우거나 새로 만들면 워크플로의 대상이 지워져 "A value is required" 경고가 뜬다(poker, autelon/company#31). 경고가 있는 워크플로는 대상 값을 다시 고른다. id를 유지해 이름만 바꾼 경우에도 대상이 그대로인지 이 화면에서 확인한다(logistics-hub에서는 그대로였다).
- 화면의 메뉴 이름은 poker에서 본 화면(워크플로의 "Set value", 화면의 "Save view")과 GitHub 문서 기준이다. 화면이 바뀌었으면 본 대로 하고 이 절을 고치는 이슈를 autelon/company에 남긴다.
- 웹에서 바꾸는 값은 위 고정 값뿐이다. 다른 설정(공개 범위, 권한, 저장소 설정)은 바꾸지 않고, 로그인·토큰·계정 설정 화면은 열지 않는다. 글(제목·본문·코멘트)은 웹으로 쓰지 않는다(1절).
- 루틴(무인 실행)에서는 웹 설정을 하지 않는다. 필요하면 `agent:needs-user`로 넘기고 사람이 연 director 세션에서 한다.

#### 기타

- Project 번호 `<P>`는 개인 정보가 아니다. 프로젝트 `CLAUDE.md`의 "기록" 표에 적는다.

### 마일스톤

`gh`에 마일스톤 명령이 없어 API를 쓴다. 제목·설명이 공개되므로 검사 스크립트로 올린다(1절).

```
node <S> gh api repos/<o>/<r>/milestones -f title="M-01 <이름>" -f due_on="2026-11-01T00:00:00Z" -f description="<한 줄>"
node <S> gh api -X PATCH repos/<o>/<r>/milestones/<번호> -f state=closed
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

`gh project item-list` JSON에서 단일 선택 필드는 필드 이름의 소문자 키로 나온다(`status`, `role`, `size`). 항목 id는 `id`, 이슈 번호는 `content.number`다 **[확인]** poker. 날짜 필드의 키도 필드 이름의 소문자이고 공백은 그대로다(`"start date"`, `"target date"`). 값이 없으면 키가 없다 **[확인]** logistics-hub.

- item-list JSON을 셸 변수에 담아 `echo "$J" | jq`로 넘기지 않는다. zsh의 `echo`가 본문 속 `\n`을 풀어 jq가 깨진다(poker). `--jq`를 쓰거나 파일로 받는다.

### task 만들기

```
node <S> gh issue create -R <o>/<r> --type Task --title "<제목>" -F local/issues/<이름>.md \
  --parent <PRD 이슈 번호> --milestone "M-01 <이름>" --blocked-by <N> --project "<저장소 이름>"
```

`--type`, `--project`는 실제로 된다 **[확인]** poker. `--blocked-by`도 되고, 쉼표로 여럿(`--blocked-by <N>,<M>`)을 줄 수 있다. 결과는 `gh issue view <N> --json blockedBy`에 나온다 **[확인]** logistics-hub. `--parent`는 도움말에만 확인했고 실제 동작과 Project 항목 반영은 **[미확인]**(poker·logistics-hub 모두 PRD가 없었다).

### Project 필드 고치기

두 가지 방식이 있다. 호출 하나의 GraphQL 비용이 크게 다르다(0절).

| 방식               | 쓸 때                                                          | 비용(호출 하나) |
| ------------------ | -------------------------------------------------------------- | --------------- |
| 이름 (`item-edit`) | 몇 개만 고칠 때(task 하나의 상태 바꾸기 등)                    | 약 100 포인트   |
| id (GraphQL)       | 여러 이슈를 한꺼번에 고칠 때(기록 이전, 스프린트 일괄 정리 등) | 1 포인트 안팎   |

**이름 방식**: ID 없이 이름으로 고친다 **[확인]** gh 2.102.0, poker(단일 선택 필드), logistics-hub(날짜 필드).

```
gh project item-edit <P> --owner <조직> --url https://github.com/<o>/<r>/issues/<N> --field Status --value in_progress
gh project item-edit <P> --owner <조직> --url https://github.com/<o>/<r>/issues/<N> --field "Start date" --date 2026-11-01
```

- 이슈 하나에 한 번에 필드 하나만 고친다(도움말).
- 날짜 필드도 이름으로 고친다. 값을 지우려면 `--clear`를 쓴다 **[확인]** logistics-hub.

**id 방식**: Project·필드·선택지 id는 작업을 시작할 때 한 번 받아 `local/`(커밋하지 않음) 파일에 두고, 항목 id는 이슈마다 받는다. 두 조회 모두 `rateLimit { cost }` 1이다 **[확인]** 2026-10-04 poker Project 읽기 전용 조회.

```
# 한 번: Project id, 필드 id, 단일 선택 필드의 선택지 id
gh api graphql -f query='{ organization(login:"<조직>"){ projectV2(number:<P>){ id fields(first:50){ nodes{ ... on ProjectV2FieldCommon { id name } ... on ProjectV2SingleSelectField { options { id name } } } } } } }' > local/project-ids.json
# 이슈마다: 이 Project의 항목 id
gh api graphql -f query='{ repository(owner:"<o>", name:"<r>"){ issue(number:<N>){ projectItems(first:10){ nodes{ id project{ number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number==<P>) | .id'
# 단일 선택 필드(Status, Role, Size)
gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){ updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){ projectV2Item{ id } } }' -f p=<Project id> -f i=<항목 id> -f f=<필드 id> -f o=<선택지 id>
# 날짜 필드(Start date, Target date)
gh api graphql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$d:Date!){ updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{date:$d}}){ projectV2Item{ id } } }' -f p=<Project id> -f i=<항목 id> -f f=<필드 id> -f d=2026-11-01
```

- `updateProjectV2ItemFieldValue`로 고치면 비용이 거의 들지 않는다 **[확인]** logistics-hub(autelon/company#43). 입력 필드 이름은 GraphQL 스키마 조회로 확인했고, 위 명령 꼴은 훅이 통과시킨다(글을 쓰는 mutation이 아니다. 1절). 위 명령을 이 꼴 그대로 실행한 것은 **[미확인]**.
- id는 개인 정보가 아니지만 커밋하지 않는 `local/`에만 둔다(`local/status-options.json`과 같다).
- 고친 뒤 값은 아래 조회(이슈 하나, `rateLimit { cost }` 1)나 item-list 한 번(약 100 포인트)으로 확인한다. 아래 조회는 단일 선택 필드 값이 나오는 것을 확인했다 **[확인]** 2026-10-04 poker 이슈 읽기 전용 조회. 날짜 값이 있는 항목에서 `date`가 나오는지는 **[미확인]**(조회한 항목에 날짜 값이 없었다).

```
gh api graphql -f query='{ repository(owner:"<o>", name:"<r>"){ issue(number:<N>){ projectItems(first:10){ nodes{ project{ number } fieldValues(first:20){ nodes{ ... on ProjectV2ItemFieldSingleSelectValue { name field{ ... on ProjectV2FieldCommon { name } } } ... on ProjectV2ItemFieldDateValue { date field{ ... on ProjectV2FieldCommon { name } } } } } } } } } }'
```

- Project에 들어 있지 않은 이슈는 항목 조회가 비어 나온다. 먼저 `gh project item-add <P> --owner <조직> --url <이슈 URL>`로 넣는다(이슈를 만들 때는 `--project`).

### 닫기

- 끝남: `gh issue close <N> -R <o>/<r> --reason completed`
- 반려: `gh issue close <N> -R <o>/<r> --reason "not planned"`. 그다음 Status를 `rejected`로 고친다. 기본 워크플로 "Item closed"는 트리거에 닫힘 사유를 고르는 칸이 없어(poker 웹 화면), 먼저 `rejected`로 바꾸고 닫으면 `done`으로 덮일 것으로 본다 **[추정]**. 닫은 뒤에 고치면 어느 쪽이든 `rejected`로 남는다. 고친 뒤 item-list로 `rejected`인지 확인한다(워크플로가 늦게 돌아 다시 덮는지 **[미확인]**).
- 끝남은 Status를 `done`으로 바꾸기만 해도 Auto-close issue 워크플로가 completed로 닫는다(켜져 있을 때). 그때 `gh issue close`는 필요 없다. 거꾸로 `gh issue close --reason completed`로 닫으면 Item closed 워크플로가 Status를 `done`으로 바꾼다 **[확인]** logistics-hub(Status로 닫은 이슈 5개, close로 닫은 이슈 2개).
- 닫을 때 남길 말이 있으면 먼저 검사 스크립트로 코멘트를 올린다(`gh issue close --comment`는 검사를 거치지 않으니 쓰지 않는다).

## 4. 백업 (작업 단위 종료 때)

저장소를 지우면 이슈와 코멘트가 함께 사라진다. 그래서 작업 단위가 끝날 때마다 로컬 `local/backup/`(커밋하지 않음)에 받는다.

```
d=local/backup/$(date +%Y-%m-%d); mkdir -p "$d"
gh api "repos/<o>/<r>/issues?state=all&per_page=100" --paginate --slurp > "$d/issues.json"
gh api "repos/<o>/<r>/issues/comments?per_page=100" --paginate --slurp > "$d/comments.json"
gh api "repos/<o>/<r>/milestones?state=all&per_page=100" --paginate --slurp > "$d/milestones.json"
gh project item-list <P> --owner <조직> --format json --limit 1000 > "$d/project.json"
gh issue list -R <o>/<r> --state all --limit 1000 --json number,parent,subIssues,blockedBy > "$d/relations.json"
```

- `issues` 응답에는 PR도 섞여 있다(`pull_request` 키). 그대로 둔다.
- REST 이슈 응답에는 하위 이슈·의존 관계가 개수 요약(`sub_issues_summary`, `issue_dependencies_summary`)과 `parent_issue_url`로만 들어 있다 **[확인]** poker. 그래서 관계 목록은 `relations.json`으로 따로 받는다(`gh issue list --json`의 `parent`, `subIssues`, `blockedBy`. 동작 **[확인]** poker).
- `gh issue list`는 기본 30개까지만 가져오므로 `--limit 1000`을 꼭 붙인다. 이슈가 1,000개를 넘으면 나눠 받는다. 본문·코멘트 백업은 페이지를 끝까지 넘기는 REST로 받는다.
- 의존 관계는 `relations.json`에 목록으로 들어간다. `blockedBy`가 `{nodes:[{number, …}], totalCount}`로 나온다 **[확인]** logistics-hub(의존 4건 모두). 부모 관계(`parent`, `subIssues`)가 실제로 들어가는지는 **[미확인]**(부모 관계가 있는 저장소에서 아직 받지 않았다).
