---
name: adopt-project
description: 이미 진행 중인 프로젝트 repo(코드·CLAUDE.md·문서·GitHub 저장소가 있는 곳)에 autelon 운영 구조를 들인다. 기존 문서와 결정은 덮어쓰지 않고 이어 쓰며, 기존 도메인 문서를 읽고 role을 설계한다. "기존 프로젝트 도입", "autelon으로 가져오기", board/나 .claude/agents/는 없지만 코드와 문서가 이미 있는 프로젝트에서 director를 시작할 때 사용. 빈 새 프로젝트는 found-company를 쓴다.
---

# 기존 프로젝트 도입

found-company는 빈 프로젝트를 세운다. 이 스킬은 이미 코드, 문서, 결정, 작업 방식, GitHub 저장소가 있는 프로젝트에 autelon 구조를 **더한다.**
원칙: 기존 파일을 덮어쓰지 않는다. 기존 문서가 원본이고 autelon 파일은 그것을 가리킨다. 기존 작업 방식은 사람이 정하기 전까지 바꾸지 않는다.
템플릿은 `${CLAUDE_PLUGIN_ROOT}/templates/`. 각 단계에서 만든 파일 목록과 이유를 기록해 두었다가 마지막에 보고한다.

## 0. 확인

- 작업 폴더가 git repo이고 메인 checkout의 기본 브랜치인지 본다(`git status`, `git worktree list`). 도입 작업은 메인 checkout에서 하길 권한다. 작업 폴더가 worktree면 그 안에서 부른 role의 메모리가 그 worktree의 `.claude/agent-memory/`에 생기고, worktree를 지우면 사라진다(logistics-hub 관찰). 커밋하지 않은 변경이 있으면 멈추고 사람에게 알린다.
- 이미 `board/`나 `.claude/agents/`가 있으면 멈추고 사람에게 알린다.
- `.claude/settings.json`이 `enabledPlugins`로 `autelon@autelon`을 켜는지, 이 파일에 `extraKnownMarketplaces.autelon`이 없는지 본다(있으면 사용자 설정의 마켓플레이스 항목을 덮어쓴다. 사람에게 알리고 지울지 묻는다).
- 원격과 main 보호 상태를 본다: `git remote -v`, `gh api repos/<owner>/<repo>`, `gh api repos/<owner>/<repo>/rulesets`. 원격이 있으면 main 보호 여부와 상관없이 이 스킬의 모든 변경은 브랜치와 PR로 올린다(조직 `.github` 저장소의 `git-workflow.md`).
- 프로젝트 자체의 커밋 규칙(예: `docs/git-rules.md`, `commit-msg` 훅)과 검증 명령(예: `pnpm check`)을 찾아 둔다. 6단계에서 따른다.

## 1. 기존 프로젝트 읽기

다음을 읽고 요약을 만든다. 요약은 role 설계와 비교의 근거다. 추정한 것은 추정이라고 표시한다.

- `CLAUDE.md`, `README.md`, `docs/` 전체 목록과 개념·도메인·아키텍처·결정·로드맵에 해당하는 문서
- 작업 방식 문서(예: agent-workflow, git-rules, testing, playbooks)
- 코드 구조(앱·패키지 목록, 각자의 책임), CI 설정
- 최근 커밋과 열린 PR

## 2. 도입 방식 정하기 (사람에게 묻기)

AskUserQuestion으로 받는다. 추정해서 채우지 않는다.

- 기존 결정 기록·목표 문서와 autelon 파일의 관계. director는 `decisions/log.md`와 `docs/goals.md`를 고정 경로로 읽고 쓰므로 두 파일은 **항상 만든다.** 정할 것은 내용이다: `decisions/log.md`는 첫 줄에 기존 결정 문서(예: `docs/04-decisions.md`)를 가리키고 이후 autelon 운영 중의 결정을 쌓는다. `docs/goals.md`는 기존 개념·로드맵 문서(예: `docs/01-concept.md`, `docs/05-roadmap.md`)의 목표와 지표를 요약하고 원문을 가리킨다. 요약 초안을 보여 주고 승인받는다. 그래야 director가 목표 체계를 새로 만들게 하지 않는다.
- 도입 PR의 리뷰어: 도입 PR이 머지되기 전에는 프로젝트 role이 없으므로 reviewer role이 도입 PR을 리뷰할 수 없다. 도입 PR의 리뷰어는 사람 또는 메인 에이전트(작업 세션이 아닌 쪽)로 한다. 작업 세션은 자기 PR을 머지하지 않는다.
- PR 리뷰어(운영 중): 하나를 고른다. 기존 git 규칙 문서가 리뷰어를 정하고 있으면 그것을 보여 주고 유지할지 묻는다.
  - `director`(기본값): director(메인 세션)가 리뷰하고 머지 명령을 낸다.
  - `reviewer role`: director가 `reviewer` role에 리뷰를 맡긴다. reviewer가 통과로 판정하면 그 판정을 PR 코멘트로 남기고, 같은 head sha에 보안 검토 통과가 있으면 머지 명령을 낸다.
  - `사람`: 에이전트는 PR만 올리고 머지 명령을 내지 않는다. director가 사람에게 PR 링크를 알린다.
- Notion을 쓸지. 쓰면 found-company 4단계와 같은 방식으로 만든다(루트 URL은 `${user_config.notion_root_page}`, 비어 있거나 글자 그대로면 묻는다. relation에는 data source UUID만 넣고, 페이지 본문은 저장소를 `<조직>/<이름>`으로 가리킨다). 도입 때 Notion 페이지와 DB는 이 스킬이 직접 만든다(director 규칙의 예외). 만드는 시점은 **도입 PR이 머지된 뒤**다(main의 `.gitignore`에 `notion/`이 들어간 뒤). 그 전에는 `notion/config.json`이 추적되지 않은 파일로 보인다. 머지 전에 꼭 만들어야 하면 `.git/info/exclude`에 `notion/`을 임시로 넣고 머지 뒤에 뺀다.

## 3. role 설계

- 기본 role 템플릿(`${CLAUDE_PLUGIN_ROOT}/templates/roles/`)과 1단계 요약을 보고 구성안을 만든다.
- **도메인 전문가 role**을 도메인 문서에서 끌어낸다. 그 도메인의 실무 책임 단위(예: 물류라면 조달, 창고, 운송, 통관, 역물류, 재고·수요계획, 품질·추적성)마다 필요한지 판단하고, 각 role의 페르소나에 그 프로젝트의 용어·결정·제약을 넣는다. 일반론은 뺀다.
- 기존 문서가 이미 정한 결정은 role이 뒤집지 않는다. 바꿔야 한다고 보면 handoff의 `## 사람에게 묻기`로 올린다.
- 구성안을 표로 보여 주고 AskUserQuestion으로 승인받는다: role 이름, 맡는 일, 근거가 된 문서, 모델.
- 승인된 role을 `.claude/agents/<role>.md`로 쓴다. 모두 `memory: project`. 쓴 뒤 사람에게 `/reload-plugins`를 입력해 달라고 요청한다(같은 세션에서는 reload 전까지 새 role을 부를 수 없다).
- 공용 role(`autelon:finance`, `autelon:notion-sync`, `autelon:security-reviewer`)은 플러그인에 있으니 만들지 않는다. security-reviewer는 4단계에서 어떤 작업 방식을 고르든 모든 PR에 보안 검토로 들어간다. 기존 git 규칙 문서에 이 내용을 더한다.

## 4. 작업 방식 비교 (바꾸지 않고 제안)

- 기존 작업 방식과 `autelon:director` 규칙(board·PRD·handoff·승인 루프·재무·Notion)을 표로 비교한다: 같은 것, 다른 것, 충돌하는 것.
- 선택지를 2~3개 제시하고 각각의 결과(바뀌는 파일, 사람이 할 일)를 적어 AskUserQuestion으로 묻는다. 예: director로 교체 / 기존 방식 유지 + board·role만 추가 / 단계적 전환.
- 정해진 대로만 바꾼다. 기존 작업 방식 문서를 고칠 때는 고치기 전과 후를 보여 준다.

## 5. 파일 추가

`${CLAUDE_PLUGIN_ROOT}/templates/project/`에서 **없는 것만** 만든다.

- `board/`(tasks.json, milestones.json, README.md), `prds/`, `handoffs/`, `state/sprint.md`: 없으면 만든다.
- `decisions/log.md`, `docs/goals.md`: 2단계에서 승인한 내용으로 만든다(이미 같은 경로에 파일이 있으면 덮어쓰지 않고 사람에게 묻는다).
- `.claude/settings.json`: `"enabledPlugins": {"autelon@autelon": true}`가 없으면 넣는다. 파일이 있으면 다른 키는 그대로 두고 이 항목만 더한다. 전역에서는 꺼 두고 프로젝트에서만 켜는 구조라 이 항목이 없으면 다음 세션에서 플러그인이 로드되지 않는다.
- `CLAUDE.md`: 덮어쓰지 않는다. 끝에 "autelon 운영" 절을 덧붙인다. 내용은 4단계에서 정한 작업 방식을 따른다.
  - director로 운영하기로 했으면: 세션 시작 시 `autelon:director` 스킬을 부른다.
  - 기존 방식을 유지하기로 했으면: director 스킬을 부르지 않고 기존 작업 방식 문서를 따른다고 적는다. role·board를 어떻게 쓰는지는 4단계에서 정한 대로 적는다.
  - 단계적 전환이면: 지금 단계와 다음 단계로 넘어가는 조건을 적는다.
  - 공통: autelon 파일 표(board, prds, handoffs, state, notion, local)와 기존 문서와의 관계.
- `docs/git-rules.md`가 이미 있으면 PR 리뷰어 절과 보안 검토·머지 조건만 확인·추가한다. 없으면 `${CLAUDE_PLUGIN_ROOT}/templates/project/git-rules.md`를 쓰고 자리표시자를 모두 채운다: `{{REVIEWER}}`와 `{{REVIEWER_MEANING}}`(2단계에서 고른 리뷰어와 그 뜻), `{{MERGE_COMMAND}}`(머지 큐면 `gh pr merge <PR> --match-head-commit <sha>`, 아니면 `gh pr merge <PR> --auto --merge --match-head-commit <sha>`), 저장소 표의 값.
- CI·저장소 설정은 이미 있으면 바꾸지 않는다. 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`와 다르면 차이를 보고만 한다. 로컬에 클론이 없으면 `gh repo clone <조직>/.github`로 임시 폴더에 받는다. 설정 스크립트는 같은 저장소의 `scripts/setup-repo.sh`다.
- `.gitignore`에 `${CLAUDE_PLUGIN_ROOT}/templates/project/gitignore.template`의 항목을 합친다(없는 줄만 더한다). `notion/`, `local/`, `.env*`, `state/quota.json`, role 메모리(`.claude/agent-memory/`) 등이 들어 있다.

## 6. 커밋과 PR

- 프로젝트의 커밋 규칙과 검증 명령(0단계에서 찾은 것)을 따른다. 새로 만든 파일도 포맷 검사 대상이다.
- 개인 리소스 정보 확인: director 스킬의 "개인 리소스 정보" 절의 확인(내용 grep, 작성자·`Co-Authored-By` 확인)이 비어 있어야 한다. 도입 PR의 push 범위 커밋과 `git config user.email`도 본다.
- 브랜치와 PR로 올린다. 리뷰어는 2단계에서 정한 대로 하고, 보안 검토는 `autelon:security-reviewer`가 한다. 작업한 세션은 자기 PR을 머지하지 않는다.

## 7. 보고

사람에게 보고한다: 1단계 요약, role 구성과 근거, 작업 방식 비교와 정한 것, 만든 파일과 만들지 않은 파일(이유), PR, 다음 단계(first-run, 목표·지표 또는 이미 있는 로드맵 이어가기). `/reload-plugins`를 입력해 달라는 요청을 넣는다. first-run은 `docs/first-run.md`가 없으면 director가 시작 때 진행한다.
