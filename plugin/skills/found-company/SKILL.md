---
name: found-company
description: 빈 새 프로젝트 repo에 autelon 운영 구조를 세운다. 프로젝트에 필요한 role을 설계해 .claude/agents/에 만들고, 보드·PRD·결정 기록 등 상태 파일과 프로젝트 전용 Notion 페이지·DB, GitHub 저장소를 만든다. "회사 설립", "프로젝트 설립", 아직 board/나 .claude/agents/가 없는 프로젝트에서 director를 시작할 때 사용.
---

# 프로젝트 설립

프로젝트는 서로 독립이다. role, 상태 파일, Notion DB, repo 모두 프로젝트마다 따로 둔다.
이 스킬은 현재 세션의 작업 폴더(프로젝트 repo 루트)에 설립한다. 템플릿은 `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 0. 확인

- 작업 폴더가 git repo인지 확인한다. 아니면 사람에게 `git init` 해도 되는지 묻는다.
- 이미 `board/`나 `.claude/agents/`가 있으면 멈추고 사람에게 알린다. 덮어쓰지 않는다.
- `.claude/settings.json`이 `${CLAUDE_PLUGIN_ROOT}/templates/project/settings.json`처럼 `enabledPlugins`로 `autelon@autelon`을 켜는지 본다. 이 파일에 `extraKnownMarketplaces.autelon`이 있으면 사용자 설정의 마켓플레이스 항목(자동 업데이트 포함)을 덮어쓰므로, 사람에게 알리고 지울지 묻는다. 이 파일은 설립 커밋에 들어간다.

## 1. 프로젝트 정의 받기

AskUserQuestion이나 대화로 다음을 받는다. 추정해서 채우지 않는다.

- 프로젝트 이름 (Notion 페이지 제목, CLAUDE.md 제목)
- 한두 문장 요약: 무엇을 왜 만드는지
- 알고 있는 제약: 플랫폼, 기술 스택 선호, 기한, 사업 목표가 이미 있는지
- GitHub 저장소 이름과 공개 여부 (6단계에서 쓴다). public이어야 머지 큐를 쓸 수 있다.
- PR 리뷰어: `director`(기본값) / `reviewer role` / `사람`. 각각의 뜻은 `${CLAUDE_PLUGIN_ROOT}/templates/project/git-rules.md`의 "PR 리뷰어" 절. `reviewer role`을 고르면 2단계 role 구성에 reviewer를 넣는다.

## 2. role 설계

1. 기본 role 템플릿을 읽는다: `${CLAUDE_PLUGIN_ROOT}/templates/roles/` (po, strategist, designer, developer, reviewer, da).
2. 프로젝트 정의를 보고 role 구성안을 만든다:
   - 기본 role 중 이 프로젝트에 필요 없는 것은 뺀다.
   - 필요한데 없는 role은 새로 정의한다 (예: 게임이면 게임 디자이너, 콘텐츠면 에디터). 기본 템플릿과 같은 형식으로 쓴다.
   - 각 role의 페르소나에 프로젝트 맥락(도메인, 사용자, 제약)을 넣는다. 일반론은 빼고 이 프로젝트에서 판단 기준이 되는 것만 넣는다.
   - 모델은 판단이 무거운 role만 opus, 정해진 규칙대로 하는 role은 sonnet/haiku.
3. 구성안을 표로 보여주고 AskUserQuestion으로 승인받는다: role 이름, 맡는 일, 모델, 기본 템플릿에서 바꾼 점.
4. 승인된 role을 프로젝트 `.claude/agents/<role>.md`로 쓴다. 모두 `memory: project`를 둔다. 첫 줄 주석 `(v0 페르소나 — role 설계 단계에서 개선 예정)`은 유지한다.
5. 공용 role(`autelon:finance`, `autelon:notion-sync`, `autelon:security-reviewer`)은 플러그인에 있으니 만들지 않는다. security-reviewer는 모든 PR에 항상 들어간다(director 스킬의 "코드 변경과 PR").

## 3. 상태 파일

`${CLAUDE_PLUGIN_ROOT}/templates/project/`에서 복사한다.

| 템플릿                          | 프로젝트 경로                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tasks.json`, `milestones.json` | `board/`                                                                                                                 |
| `board-format.md`               | `board/README.md`                                                                                                        |
| `decisions.md`                  | `decisions/log.md`                                                                                                       |
| `sprint.md`                     | `state/sprint.md`                                                                                                        |
| `goals.md`                      | `docs/goals.md`                                                                                                          |
| `git-rules.md`                  | `docs/git-rules.md` — 자리표시자는 6단계에서 채운다                                                                      |
| `ci.yml`                        | `.github/workflows/ci.yml` — `{{GITHUB_ORG}}`를 채운다                                                                   |
| `events.md`                     | `analytics/events.md` (da가 있을 때만)                                                                                   |
| `CLAUDE.template.md`            | `CLAUDE.md` — `{{PROJECT_NAME}}`, `{{PROJECT_SUMMARY}}`를 채운다. 프로젝트 파일 표에서 없는 경로(예: analytics)는 지운다 |

빈 폴더 `prds/`, `handoffs/`, `analytics/queries/`(da가 있을 때)에는 `.gitkeep`을 둔다.
`state/quota.json`은 만들지 않는다 (director가 처음 사용량을 확인할 때 생기며, 커밋하지 않는다).

프로젝트 `.gitignore`에 `${CLAUDE_PLUGIN_ROOT}/templates/project/gitignore.template`의 항목을 합친다. 파일이 없으면 만들고, 있으면 없는 줄만 더한다. 항목: `notion/`, `local/`, `.env*`, `state/quota.json`, `.claude/agent-memory/`, `.claude/agent-memory-local/`, `.claude/settings.local.json`, `.claude/worktrees/`. 저장소가 public이면 이것들이 그대로 공개되기 때문이다. role 메모리(`memory: project`)는 프로젝트 `.claude/agent-memory/<role>/`에 생기지만 커밋하지 않는다.

## 4. Notion

claude.ai Notion 커넥터 도구로 만든다.

1. 루트 페이지를 정한다. 플러그인 설정값은 `${user_config.notion_root_page}`이다. 이 값이 비어 있거나 `${user_config`로 시작하는 글자 그대로 남아 있으면 설정되지 않은 것이다. 그때는 AskUserQuestion으로 루트 페이지 URL을 묻는다. 추정하거나 검색해서 고르지 않는다. 다음부터 묻지 않게 하려면 사용자 설정 `~/.claude/settings.json`의 `pluginConfigs["autelon@autelon"].options.notion_root_page`에 넣으면 된다고 사람에게 알린다(넣는 것은 사람이 정한다). 정한 URL은 `notion/config.json`의 `root_page`에 쓴다.
2. 루트 페이지 아래에 프로젝트 이름으로 페이지를 만든다. 본문: "이 페이지는 `<repo 경로>`의 투영이다. 원본은 로컬 파일이고, 여기서 고친 내용은 로컬로 돌아가지 않는다."
3. 그 페이지 아래에 DB 세 개를 만든다. 순서대로 만들고, 앞 DB의 data source ID로 relation을 건다.
   - Milestones: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('planned':gray, 'active':blue, 'done':green), "Target date" DATE)`
   - PRDs: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('draft':gray, 'approved':blue, 'in_dev':yellow, 'released':purple, 'measured':orange, 'closed':green), "Milestone" RELATION('<milestones ds>', DUAL 'PRDs'), "Owner role" SELECT(<프로젝트 role들>))`
     그다음 update-data-source로 `ADD COLUMN "Derived from" RELATION('<prds ds>', DUAL 'Follow-up PRDs' 'follow_up_prds')`
   - Tasks: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('backlog':gray, 'ready':brown, 'in_progress':blue, 'review':yellow, 'awaiting_approval':orange, 'done':green, 'blocked':red, 'rejected':pink), "Role" SELECT(<프로젝트 role + finance, notion-sync>), "PRD" RELATION('<prds ds>', DUAL 'Tasks'), "Size" SELECT('small':gray, 'large':orange), "Handoff" RICH_TEXT, "Updated" DATE)`
4. Tasks에 보드 뷰 두 개: `칸반` (`GROUP BY "Status"`), `role별` (`GROUP BY "Role"`).
5. 루트 페이지 URL, 페이지 URL, DB URL, data source ID, 뷰 ID를 `notion/config.json`에 쓴다. 형식:

```json
{
  "root_page": "...",
  "project_page": "...",
  "data_sources": {
    "milestones": "collection://...",
    "prds": "collection://...",
    "tasks": "collection://..."
  },
  "databases": { "milestones": "...", "prds": "...", "tasks": "..." },
  "views": { "tasks_kanban": "view://...", "tasks_by_role": "view://..." }
}
```

`notion/config.json`과 `notion/ids.json`(항목별 페이지 URL, notion-sync가 쓴다)은 **커밋하지 않는다.** 프로젝트 `.gitignore`에는 3단계에서 기본 무시 항목(`notion/`, `local/` 포함)을 넣었다(director 스킬의 "개인 리소스 정보" 절). 저장소가 public이면 Notion 페이지·DB ID가 공개되기 때문이다. 커밋 메시지, PR, `decisions/log.md`, `CLAUDE.md` 같은 커밋되는 파일에도 Notion URL이나 ID를 적지 않는다.

Notion 단계가 실패하면 상태 파일은 그대로 두고, 실패한 지점과 오류를 `decisions/log.md`와 사람에게 알린다.

## 5. 설립 커밋

- 커밋 전에 `git status`로 `notion/`·`local/`·`state/quota.json`·`.claude/agent-memory/`가 커밋 대상에 없는지, director 스킬의 "개인 리소스 정보" 절의 확인(grep과 눈으로 확인)을 한다. role 페르소나나 결정 기록에서 다른 저장소를 가리킬 때도 로컬 경로가 아니라 저장소 이름으로 쓴다.
- 만든 것을 로컬 `main`에 커밋한다. 아직 원격과 main 보호 규칙이 없어서 직접 커밋할 수 있는 마지막 때다. 프로젝트에 커밋 규칙이 없으면 `chore(repo): autelon 운영 구조 설립` 형식으로 쓰고, 본문에 role 구성과 이유를 적는다.
- worktree에서 설립하지 않는다. 설립 커밋이 main에 들어가야 한다.

## 6. GitHub 저장소

GitHub 조직은 `${user_config.github_org}`이다. 비어 있거나 글자 그대로 남아 있으면 사람에게 묻는다.
`~/.claude/git-workflow.md`가 있으면 먼저 읽고 그 "새 프로젝트를 시작할 때" 절차를 따른다. 아래는 그 절차를 이 스킬에 맞춘 순서다.

1. `gh auth status`로 로그인을 확인한다. 안 되어 있으면 멈추고 사람에게 알린다.
2. 1단계에서 받은 이름·공개 여부로 저장소를 만들고 main을 올린다: `gh repo create <조직>/<이름> --<public|private> --source . --push`. 이미 원격이 있거나 같은 이름의 저장소가 있으면 멈추고 사람에게 묻는다.
3. push로 `ci.yml`이 main에서 한 번 돈다. `gh run list --branch main`으로 `git-policy` 실행이 끝났는지 확인한다. 필수 검사는 그 이름의 검사가 한 번 돈 뒤에 걸어야 PR이 영원히 대기하지 않는다.
4. 표준 적용 스크립트를 찾는다: `~/dev/<조직>/.github/scripts/setup-repo.sh`. 없으면 `gh repo clone <조직>/.github`로 받은 곳의 `scripts/setup-repo.sh`. 표준 값은 그 저장소의 `rulesets/main.json`과 스크립트가 원본이다.
5. **적용 전에 사람의 승인을 받는다.** 스크립트와 `rulesets/main.json`을 읽고, 바뀔 값을 표로 보여 주고 AskUserQuestion으로 묻는다: 저장소 설정(병합 방식, auto-merge, Update branch, 브랜치 자동 삭제), main 규칙(삭제·force push 금지, PR 필수, 필수 검사 이름, 머지 큐 또는 up to date 필수). 필수 검사는 지금은 `git-policy / merge-commits` 하나다.
6. 승인되면 `setup-repo.sh <조직>/<이름> "git-policy / merge-commits"`를 실행하고, `gh api repos/<조직>/<이름>`과 `gh api repos/<조직>/<이름>/rulesets/<id>`로 다시 읽어 실제 값을 확인한다.
7. `docs/git-rules.md`의 자리표시자를 채운다. 최신화는 public이면 "머지 큐", private이면 "up to date 필수". 머지 명령은 머지 큐면 `gh pr merge <PR> --match-head-commit <sha>`, 아니면 `gh pr merge <PR> --auto --merge --match-head-commit <sha>`. main이 보호되었으므로 이 변경부터는 브랜치와 PR로 올린다. 이 첫 PR의 리뷰어도 `docs/git-rules.md`에 정한 리뷰어다. 머지 명령은 같은 head sha에 리뷰 통과와 보안 검토 통과가 둘 다 있을 때만 낸다.

GitHub 단계가 실패하면 로컬 커밋은 그대로 두고, 실패한 지점과 오류를 `decisions/log.md`와 사람에게 알린다.

## 7. 보고

사람에게 보고한다: role 구성, 만든 파일, Notion 페이지 링크, GitHub 저장소와 적용된 규칙, PR 리뷰어, 다음 단계(목표·지표 체계 수립 또는 first-run).
