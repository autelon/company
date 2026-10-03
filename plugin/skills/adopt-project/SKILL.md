---
name: adopt-project
description: 이미 진행 중인 프로젝트 repo(코드·CLAUDE.md·문서·GitHub 저장소가 있는 곳)에 autelon 운영 구조를 들인다. 기존 문서와 결정은 덮어쓰지 않고 이어 쓰며, 기존 도메인 문서를 읽고 role을 설계한다. "기존 프로젝트 도입", "autelon으로 가져오기", board/나 .claude/agents/는 없지만 코드와 문서가 이미 있는 프로젝트에서 director를 시작할 때 사용. 빈 새 프로젝트는 found-company를 쓴다.
---

# 기존 프로젝트 도입

found-company는 빈 프로젝트를 세운다. 이 스킬은 이미 코드, 문서, 결정, 작업 방식, GitHub 저장소가 있는 프로젝트에 autelon 구조를 **더한다.**
원칙: 기존 파일을 덮어쓰지 않는다. 기존 문서가 원본이고 autelon 파일은 그것을 가리킨다. 기존 작업 방식은 사람이 정하기 전까지 바꾸지 않는다.
템플릿은 `${CLAUDE_PLUGIN_ROOT}/templates/`. 각 단계에서 만든 파일 목록과 이유를 기록해 두었다가 마지막에 보고한다.

## 0. 확인

- 작업 폴더가 git repo이고 메인 checkout의 기본 브랜치인지 본다(`git status`, `git worktree list`). 커밋하지 않은 변경이 있으면 멈추고 사람에게 알린다.
- 이미 `board/`나 `.claude/agents/`가 있으면 멈추고 사람에게 알린다.
- `.claude/settings.json`이 `enabledPlugins`로 `autelon@autelon`을 켜는지, 이 파일에 `extraKnownMarketplaces.autelon`이 없는지 본다(있으면 사용자 설정의 마켓플레이스 항목을 덮어쓴다. 사람에게 알리고 지울지 묻는다).
- 원격과 main 보호 상태를 본다: `git remote -v`, `gh api repos/<owner>/<repo>`, `gh api repos/<owner>/<repo>/rulesets`. main이 보호되어 있으면 이 스킬의 모든 변경은 브랜치와 PR로 올린다.

## 1. 기존 프로젝트 읽기

다음을 읽고 요약을 만든다. 요약은 role 설계와 비교의 근거다. 추정한 것은 추정이라고 표시한다.

- `CLAUDE.md`, `README.md`, `docs/` 전체 목록과 개념·도메인·아키텍처·결정·로드맵에 해당하는 문서
- 작업 방식 문서(예: agent-workflow, git-rules, testing, playbooks)
- 코드 구조(앱·패키지 목록, 각자의 책임), CI 설정
- 최근 커밋과 열린 PR

## 2. 도입 방식 정하기 (사람에게 묻기)

AskUserQuestion으로 받는다. 추정해서 채우지 않는다.

- 기존 결정 기록·목표 문서를 그대로 원본으로 쓸지. 기본: 기존 문서를 원본으로 두고 autelon 파일(`decisions/log.md`, `docs/goals.md`)은 만들지 않거나 기존 문서를 가리키는 한 줄만 둔다.
- PR 리뷰어: `director`(기본값) / `reviewer role` / `사람` (`${CLAUDE_PLUGIN_ROOT}/templates/project/git-rules.md`의 "PR 리뷰어" 절). 기존 git 규칙 문서가 리뷰어를 정하고 있으면 그것을 보여 주고 유지할지 묻는다.
- Notion을 쓸지. 쓰면 found-company 4단계와 같은 방식으로 만든다(루트 URL은 `${user_config.notion_root_page}`, 비어 있거나 글자 그대로면 묻는다).

## 3. role 설계

- 기본 role 템플릿(`${CLAUDE_PLUGIN_ROOT}/templates/roles/`)과 1단계 요약을 보고 구성안을 만든다.
- **도메인 전문가 role**을 도메인 문서에서 끌어낸다. 그 도메인의 실무 책임 단위(예: 물류라면 조달, 창고, 운송, 통관, 역물류, 재고·수요계획, 품질·추적성)마다 필요한지 판단하고, 각 role의 페르소나에 그 프로젝트의 용어·결정·제약을 넣는다. 일반론은 뺀다.
- 기존 문서가 이미 정한 결정은 role이 뒤집지 않는다. 바꿔야 한다고 보면 handoff의 `## 사람에게 묻기`로 올린다.
- 구성안을 표로 보여 주고 AskUserQuestion으로 승인받는다: role 이름, 맡는 일, 근거가 된 문서, 모델.
- 승인된 role을 `.claude/agents/<role>.md`로 쓴다. 모두 `memory: project`.

## 4. 작업 방식 비교 (바꾸지 않고 제안)

- 기존 작업 방식과 `autelon:director` 규칙(board·PRD·handoff·승인 루프·재무·Notion)을 표로 비교한다: 같은 것, 다른 것, 충돌하는 것.
- 선택지를 2~3개 제시하고 각각의 결과(바뀌는 파일, 사람이 할 일)를 적어 AskUserQuestion으로 묻는다. 예: director로 교체 / 기존 방식 유지 + board·role만 추가 / 단계적 전환.
- 정해진 대로만 바꾼다. 기존 작업 방식 문서를 고칠 때는 고치기 전과 후를 보여 준다.

## 5. 파일 추가

`${CLAUDE_PLUGIN_ROOT}/templates/project/`에서 **없는 것만** 만든다.

- `board/`(tasks.json, milestones.json, README.md), `prds/`, `handoffs/`, `state/sprint.md`: 없으면 만든다.
- `decisions/log.md`, `docs/goals.md`: 2단계 답에 따른다.
- `CLAUDE.md`: 덮어쓰지 않는다. 끝에 "autelon 운영" 절을 덧붙인다: 세션 시작 시 `autelon:director` 스킬을 부른다, autelon 파일 표(board, prds, handoffs, state, notion, local), 기존 문서와의 관계.
- `docs/git-rules.md`가 이미 있으면 PR 리뷰어 절만 확인·추가한다. 없으면 템플릿을 쓴다.
- CI·저장소 설정은 이미 있으면 바꾸지 않는다. `~/.claude/git-workflow.md`와 다르면 차이를 보고만 한다.
- `.gitignore`에 `notion/`과 `local/`을 넣는다.

## 6. 커밋과 PR

- 개인 리소스 정보 확인: `git diff --cached | grep -n -E 'notion\.(com|so)|/Users/'`가 비어 있어야 한다(director 스킬의 "개인 리소스 정보" 절).
- main이 보호되어 있으면 브랜치와 PR로 올린다. 리뷰어는 2단계에서 정한 대로 한다. 작업한 세션은 자기 PR을 머지하지 않는다.

## 7. 보고

사람에게 보고한다: 1단계 요약, role 구성과 근거, 작업 방식 비교와 정한 것, 만든 파일과 만들지 않은 파일(이유), PR, 다음 단계(first-run, 목표·지표 또는 이미 있는 로드맵 이어가기).
