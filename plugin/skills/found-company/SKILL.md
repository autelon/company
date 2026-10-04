---
name: found-company
description: 빈 새 프로젝트 repo에 autelon 운영 구조를 세운다. 프로젝트에 필요한 role을 설계해 .claude/agents/에 만들고, 목표·규칙 문서와 GitHub 저장소, 기록용 이슈 라벨·Project·마일스톤·현재 스프린트 이슈를 준비한다. "회사 설립", "프로젝트 설립", 아직 .claude/agents/가 없는 프로젝트에서 director를 시작할 때 사용.
---

# 프로젝트 설립

프로젝트는 서로 독립이다. role, 저장소, 이슈, Project 모두 프로젝트마다 따로 둔다.
이 스킬은 현재 세션의 작업 폴더(프로젝트 repo 루트)에 설립한다. 템플릿은 `${CLAUDE_PLUGIN_ROOT}/templates/`, 이슈·Project 명령은 `${CLAUDE_PLUGIN_ROOT}/playbooks/issues.md`(그 안의 `<S>`는 `${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.mjs`).
기록은 GitHub 이슈와 Project에 두고, 저장소에는 "지금 기준" 문서만 둔다(director 스킬 "기록은 어디에 두는가").

## 0. 확인

- 작업 폴더가 git repo인지 확인한다. 아니면 사람에게 `git init` 해도 되는지 묻는다.
- 이미 `.claude/agents/`가 있으면 멈추고 사람에게 알린다. 덮어쓰지 않는다.
- `.claude/settings.json`이 `${CLAUDE_PLUGIN_ROOT}/templates/project/settings.json`처럼 `enabledPlugins`로 `autelon@autelon`을 켜는지 본다. 이 파일에 `extraKnownMarketplaces.autelon`이 있으면 사용자 설정의 마켓플레이스 항목(자동 업데이트 포함)을 덮어쓰므로, 사람에게 알리고 지울지 묻는다. 이 파일은 설립 커밋에 들어간다.
- `gh auth status`로 로그인과 권한을 본다. 6단계(Project)에는 `project` 권한이 필요하다. 없으면 지금 사람에게 알려 둔다(playbook 0절). 권한을 받기 전까지 6단계의 Project 부분만 미룬다.

## 1. 프로젝트 정의 받기

AskUserQuestion이나 대화로 다음을 받는다. 추정해서 채우지 않는다.

- 프로젝트 이름 (CLAUDE.md 제목, Project 제목)
- 한두 문장 요약: 무엇을 왜 만드는지
- 알고 있는 제약: 플랫폼, 기술 스택 선호, 기한, 사업 목표가 이미 있는지
- GitHub 저장소 이름과 공개 여부 (5단계에서 쓴다). public이어야 머지 큐를 쓸 수 있다. 이슈와 코멘트는 저장소 공개 범위를 따르므로, public이면 기록도 공개된다는 것을 함께 알린다.
- PR 리뷰어: 하나를 고른다. `reviewer role`을 고르면 2단계 role 구성에 reviewer를 넣는다.
  - `director`(기본값): director(메인 세션)가 리뷰하고 머지 명령을 낸다.
  - `reviewer role`: director가 `reviewer` role에 리뷰를 맡긴다. reviewer가 통과로 판정하면 그 판정을 PR 코멘트로 남기고, 같은 head sha에 보안 검토 통과가 있으면 머지 명령을 낸다.
  - `사람`: 에이전트는 PR만 올리고 머지 명령을 내지 않는다. director가 사람에게 PR 링크를 알린다.
  - 고른 값과 그 뜻(위 항목의 설명)은 5단계에서 `docs/git-rules.md`의 "PR 리뷰어"에 적는다(`{{REVIEWER}}`, `{{REVIEWER_MEANING}}`). 바꿀 때는 그 절을 고치고 결정 이슈로 남긴다. 보안 검토는 어느 쪽을 골라도 항상 한다.

## 2. role 설계

1. 기본 role 템플릿을 읽는다: `${CLAUDE_PLUGIN_ROOT}/templates/roles/` (po, strategist, designer, developer, reviewer, da).
2. 프로젝트 정의를 보고 role 구성안을 만든다:
   - 기본 role 중 이 프로젝트에 필요 없는 것은 뺀다.
   - 필요한데 없는 role은 새로 정의한다 (예: 게임이면 게임 디자이너, 콘텐츠면 에디터). 기본 템플릿과 같은 형식으로 쓴다.
   - 각 role의 페르소나에 프로젝트 맥락(도메인, 사용자, 제약)을 넣는다. 일반론은 빼고 이 프로젝트에서 판단 기준이 되는 것만 넣는다.
   - 모델은 판단이 무거운 role만 opus, 정해진 규칙대로 하는 role은 sonnet/haiku.
3. 구성안을 표로 보여주고 AskUserQuestion으로 승인받는다: role 이름, 맡는 일, 모델, 기본 템플릿에서 바꾼 점.
4. 승인된 role을 프로젝트 `.claude/agents/<role>.md`로 쓴다. 모두 `memory: project`를 둔다. 첫 줄 주석 `(v0 페르소나 — role 설계 단계에서 개선 예정)`은 유지한다.
5. 공용 role(`autelon:finance`, `autelon:security-reviewer`)은 플러그인에 있으니 만들지 않는다. security-reviewer는 모든 PR에 항상 들어간다(director 스킬의 "코드 변경과 PR").
6. 프로젝트 role을 쓰기 전에 사람에게 `/reload-plugins`를 입력해 달라고 요청한다. 내장 명령이라 Claude가 실행할 수 없고, 같은 세션에서 방금 만든 role을 부르면 `Agent type '<role>' not found`가 난다(2026-10-04 poker 관찰). reload 뒤에 role을 부를 수 있는지 확인한다.

## 3. 저장소 파일

`${CLAUDE_PLUGIN_ROOT}/templates/project/`에서 복사한다. 저장소에는 agent가 매 세션 읽는 "지금 기준" 문서만 둔다. 보드·PRD·결정·인계는 6단계에서 이슈로 준비한다.

| 템플릿               | 프로젝트 경로                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goals.md`           | `docs/goals.md`                                                                                                                                                                                     |
| `git-rules.md`       | `docs/git-rules.md` — 자리표시자는 5단계에서 채운다                                                                                                                                                 |
| `ci.yml`             | `.github/workflows/ci.yml` — `{{GITHUB_ORG}}`를 채운다                                                                                                                                              |
| `events.md`          | `analytics/events.md` (da가 있을 때만)                                                                                                                                                              |
| `CLAUDE.template.md` | `CLAUDE.md` — `{{PROJECT_NAME}}`, `{{PROJECT_SUMMARY}}`, `{{GITHUB_REPO}}`, `{{GITHUB_REPO_NAME}}`를 채운다. `{{PROJECT_NUMBER}}`는 6단계에서 채운다. 파일 표에서 없는 경로(예: analytics)는 지운다 |

빈 폴더 `analytics/queries/`(da가 있을 때)에는 `.gitkeep`을 둔다.
`state/quota.json`은 만들지 않는다 (director가 처음 사용량을 확인할 때 생기며, 커밋하지 않는다).

프로젝트 `.gitignore`에 `${CLAUDE_PLUGIN_ROOT}/templates/project/gitignore.template`의 항목을 합친다. 파일이 없으면 만들고, 있으면 없는 줄만 더한다. 항목: `notion/`, `local/`, `.env*`, `state/quota.json`, `.claude/agent-memory/`, `.claude/agent-memory-local/`, `.claude/settings.local.json`, `.claude/worktrees/`. 저장소가 public이면 이것들이 그대로 공개되기 때문이다. `local/`에는 이슈 본문·코멘트 초안과 이슈 백업이 생긴다. role 메모리(`memory: project`)는 프로젝트 `.claude/agent-memory/<role>/`에 생기지만 커밋하지 않는다.

## 4. 설립 커밋

- 커밋 전에 `git status`로 `local/`·`state/quota.json`·`.claude/agent-memory/`가 커밋 대상에 없는지, director 스킬의 "개인 리소스 정보" 절의 확인(내용 검사 스크립트, 작성자 확인, 눈으로 확인)을 한다. role 페르소나에서 다른 저장소를 가리킬 때도 로컬 경로가 아니라 저장소 이름으로 쓴다.
- 만든 것을 로컬 `main`에 커밋한다. 아직 원격과 main 보호 규칙이 없어서 직접 커밋할 수 있는 마지막 때다. 프로젝트에 커밋 규칙이 없으면 `chore(repo): autelon 운영 구조 설립` 형식으로 쓰고, 본문에 role 구성과 이유를 적는다.
- worktree에서 설립하지 않는다. 설립 커밋이 main에 들어가야 한다.

## 5. GitHub 저장소

GitHub 조직은 `${user_config.github_org}`이다. 비어 있거나 글자 그대로 남아 있으면 사람에게 묻는다. manifest의 `default`는 치환에 쓰이지 않아 값이 글자 그대로 남는다(2026-10-04 관찰). 값을 사용자 설정 `pluginConfigs["autelon@autelon"].options.github_org`에 넣으면 묻지 않는다(넣는 것은 사람이 정한다).
표준 문서는 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`다. 먼저 읽고 그 "새 프로젝트를 시작할 때" 절차를 따른다. 로컬에 클론이 없으면 `gh repo clone <조직>/.github`로 임시 폴더에 받는다. 아래는 그 절차를 이 스킬에 맞춘 순서다.

1. `gh auth status`로 로그인을 확인한다. 안 되어 있으면 멈추고 사람에게 알린다.
2. **push 전에 작성자 정보를 점검한다.** `git config user.email`이 개인 메일(`@gmail.` 등)이 아닌지 본다. 로컬 `main` 모든 커밋의 author·committer와 `Co-Authored-By:` 줄을 director 스킬 "개인 리소스 정보" 절의 작성자 확인 명령(범위는 `HEAD`)으로 본다. 허용 주소(GitHub noreply, `noreply@anthropic.com`) 밖의 이메일이 나오면 push하지 않고 사람에게 알린다. 공동 작성자 줄은 GitHub noreply 주소(`<id>+<계정>@users.noreply.github.com`)로 쓴다. 이미 커밋에 개인 주소가 들어갔으면 push 전이므로, 사람의 확인을 받아 git 설정을 바꾸고 히스토리를 다시 쓴다.
3. **push 전에 보안 검토를 받는다.** 첫 push는 PR이 아니라서 검토를 거치지 않으므로, `autelon:security-reviewer`에게 로컬 `main`의 전체 히스토리(`git log -p`의 모든 커밋과 커밋 메시지)를 검토시킨다. "통과"가 나오기 전에는 push하지 않는다. 수정 필요면 push 전이므로 히스토리를 고친 뒤 다시 검토받는다. push한 뒤에는 브랜치를 다시 써도 지워지지 않는다.
4. 1단계에서 받은 이름·공개 여부로 저장소를 만들고 main을 올린다: `gh repo create <조직>/<이름> --<public|private> --source . --push`. 이미 원격이 있거나 같은 이름의 저장소가 있으면 멈추고 사람에게 묻는다.
5. push로 `ci.yml`이 main에서 한 번 돈다. `gh run list --branch main`으로 `git-policy` 실행이 끝났는지 확인한다. 필수 검사는 그 이름의 검사가 한 번 돈 뒤에 걸어야 PR이 영원히 대기하지 않는다.
6. 표준 적용 스크립트는 조직 `.github` 저장소의 `scripts/setup-repo.sh`다(위에서 받은 클론). 표준 값은 그 저장소의 `rulesets/main.json`과 스크립트가 원본이다.
7. **적용 전에 사람의 승인을 받는다.** 스크립트와 `rulesets/main.json`을 읽고, 바뀔 값을 표로 보여 주고 AskUserQuestion으로 묻는다: 저장소 설정(병합 방식, auto-merge, Update branch, 브랜치 자동 삭제), main 규칙(삭제·force push 금지, PR 필수, 필수 검사 이름, 머지 큐 또는 up to date 필수). 필수 검사는 지금은 `git-policy / merge-commits` 하나다.
8. 승인되면 `setup-repo.sh <조직>/<이름> "git-policy / merge-commits"`를 실행하고, `gh api repos/<조직>/<이름>`과 `gh api repos/<조직>/<이름>/rulesets/<id>`로 다시 읽어 실제 값을 확인한다.
9. `docs/git-rules.md`의 자리표시자를 채운다. 최신화는 public이면 "머지 큐", private이면 "up to date 필수". `{{MERGE_COMMAND}}`는 머지 큐면 `gh pr merge <PR> --match-head-commit <sha>`, 아니면 `gh pr merge <PR> --auto --merge --match-head-commit <sha>`(백틱 없이 명령만). main이 보호되었으므로 이 변경부터는 브랜치와 PR로 올린다. 이 첫 PR의 리뷰어도 `docs/git-rules.md`에 정한 리뷰어다. 머지 명령은 같은 head sha에 리뷰 통과와 보안 검토 통과가 둘 다 있을 때만 낸다.

GitHub 단계가 실패하면 로컬 커밋은 그대로 두고, 실패한 지점과 오류를 사람에게 알린다.

## 6. 이슈·Project 준비

저장소가 생긴 뒤에 한다. 명령은 playbook 2절. 이슈에 올리는 글은 모두 검사 스크립트를 거친다.

1. 이슈 타입 Task·Feature가 조직에 있는지 본다. 없으면 조직 설정을 바꾸지 말고 사람에게 알린다.
2. 라벨 `decision`, `sprint`, `first-run`, `agent:ready`, `agent:needs-user`를 만든다.
3. Project를 만든다(`project` 권한이 있을 때): 제목은 저장소 이름, 저장소에 연결, 필드 `Role`(`director`와 2단계에서 승인한 role, 쉼표로), `Size`(small, large), `Start date`, `Target date`. 기본 `Status` 선택지(id를 유지한 채 이름만 바꾼다)와 화면은 API로 만든다(playbook 2절). 보드 열 기준·로드맵 날짜 필드와 기본 워크플로(playbook 2절 표)는 API로 정할 수 없어 사람에게 웹 화면에서 해 달라고 요청한다.
4. Project 번호를 `CLAUDE.md`의 `{{PROJECT_NUMBER}}`에 채운다. 권한이 없어 미뤘으면 `미정`으로 두고 보고에 적는다.
5. 1단계에서 기한이 나왔으면 마일스톤을 만든다. 없으면 만들지 않는다(director가 첫 PRD 때 만든다).
6. 현재 스프린트 이슈(`templates/issues/sprint.md`, Task, `sprint` 라벨)를 만들고 고정한다. first-run 이슈(`templates/issues/first-run.md`, Task, `first-run` 라벨)를 만든다.
7. 설립 중에 사람이 한 결정(role 구성, 리뷰어, 공개 여부)을 결정 이슈 하나(`templates/issues/decision.md`, Task, `decision` 라벨)에 남긴다.
8. `CLAUDE.md`를 고쳤으면 브랜치와 PR로 올린다(main은 이미 보호됐다). 5단계 9번의 PR과 합쳐도 된다.

이 단계가 실패하면 만든 것과 실패한 지점, 오류를 사람에게 알린다. 만든 이슈·Project를 지우지 않는다(지우는 것은 사람이 정한다).

## 7. 보고

사람에게 보고한다: role 구성, 만든 파일, GitHub 저장소와 적용된 규칙, PR 리뷰어, 만든 라벨·Project·이슈(번호), 사람이 웹 화면에서 해야 할 일(보드 열 기준, 로드맵 날짜 필드, 기본 워크플로. playbook 2절), 다음 단계(목표·지표 체계 수립 또는 first-run, 이슈 작업 루프를 쓸 때는 루틴 등록 `${CLAUDE_PLUGIN_ROOT}/playbooks/routine.md`).

보고에 `/reload-plugins`를 입력해 달라는 요청을 넣는다. 프로젝트 role은 reload 뒤에 부를 수 있다. first-run은 director가 시작 때 진행한다(`${CLAUDE_PLUGIN_ROOT}/playbooks/first-run.md`).
