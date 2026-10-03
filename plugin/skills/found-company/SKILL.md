---
name: found-company
description: 새 프로젝트 repo에 agent-company 운영 구조를 세운다. 프로젝트에 필요한 role을 설계해 .claude/agents/에 만들고, 보드·PRD·결정 기록 등 상태 파일과 프로젝트 전용 Notion 페이지·DB를 만든다. "회사 설립", "프로젝트 설립", 아직 board/나 .claude/agents/가 없는 프로젝트에서 director를 시작할 때 사용.
---

# 프로젝트 설립

프로젝트는 서로 독립이다. role, 상태 파일, Notion DB, repo 모두 프로젝트마다 따로 둔다.
이 스킬은 현재 세션의 작업 폴더(프로젝트 repo 루트)에 설립한다. 템플릿은 `${CLAUDE_PLUGIN_ROOT}/templates/`.

## 0. 확인

- 작업 폴더가 git repo인지 확인한다. 아니면 사람에게 `git init` 해도 되는지 묻는다.
- 이미 `board/`나 `.claude/agents/`가 있으면 멈추고 사람에게 알린다. 덮어쓰지 않는다.

## 1. 프로젝트 정의 받기

AskUserQuestion이나 대화로 다음을 받는다. 추정해서 채우지 않는다.

- 프로젝트 이름 (Notion 페이지 제목, CLAUDE.md 제목)
- 한두 문장 요약: 무엇을 왜 만드는지
- 알고 있는 제약: 플랫폼, 기술 스택 선호, 기한, 사업 목표가 이미 있는지

## 2. role 설계

1. 기본 role 템플릿을 읽는다: `${CLAUDE_PLUGIN_ROOT}/templates/roles/` (po, strategist, designer, developer, reviewer, da).
2. 프로젝트 정의를 보고 role 구성안을 만든다:
   - 기본 role 중 이 프로젝트에 필요 없는 것은 뺀다.
   - 필요한데 없는 role은 새로 정의한다 (예: 게임이면 게임 디자이너, 콘텐츠면 에디터). 기본 템플릿과 같은 형식으로 쓴다.
   - 각 role의 페르소나에 프로젝트 맥락(도메인, 사용자, 제약)을 넣는다. 일반론은 빼고 이 프로젝트에서 판단 기준이 되는 것만 넣는다.
   - 모델은 판단이 무거운 role만 opus, 정해진 규칙대로 하는 role은 sonnet/haiku.
3. 구성안을 표로 보여주고 AskUserQuestion으로 승인받는다: role 이름, 맡는 일, 모델, 기본 템플릿에서 바꾼 점.
4. 승인된 role을 프로젝트 `.claude/agents/<role>.md`로 쓴다. 모두 `memory: project`를 둔다. 첫 줄 주석 `(v0 페르소나 — role 설계 단계에서 개선 예정)`은 유지한다.
5. 공용 role(`agent-company:finance`, `agent-company:notion-sync`)은 플러그인에 있으니 만들지 않는다.

## 3. 상태 파일

`${CLAUDE_PLUGIN_ROOT}/templates/project/`에서 복사한다.

| 템플릿                          | 프로젝트 경로                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tasks.json`, `milestones.json` | `board/`                                                                                                                 |
| `board-format.md`               | `board/README.md`                                                                                                        |
| `decisions.md`                  | `decisions/log.md`                                                                                                       |
| `sprint.md`                     | `state/sprint.md`                                                                                                        |
| `goals.md`                      | `docs/goals.md`                                                                                                          |
| `events.md`                     | `analytics/events.md` (da가 있을 때만)                                                                                   |
| `CLAUDE.template.md`            | `CLAUDE.md` — `{{PROJECT_NAME}}`, `{{PROJECT_SUMMARY}}`를 채운다. 프로젝트 파일 표에서 없는 경로(예: analytics)는 지운다 |

빈 폴더 `prds/`, `handoffs/`, `analytics/queries/`(da가 있을 때)에는 `.gitkeep`을 둔다.
`state/quota.json`은 만들지 않는다 (director가 처음 사용량을 확인할 때 생긴다).

## 4. Notion

claude.ai Notion 커넥터 도구로 만든다.

1. 루트 페이지 `${user_config.notion_root_page}` 아래에 프로젝트 이름으로 페이지를 만든다. 본문: "이 페이지는 `<repo 경로>`의 투영이다. 원본은 로컬 파일이고, 여기서 고친 내용은 로컬로 돌아가지 않는다."
2. 그 페이지 아래에 DB 세 개를 만든다. 순서대로 만들고, 앞 DB의 data source ID로 relation을 건다.
   - Milestones: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('planned':gray, 'active':blue, 'done':green), "Target date" DATE)`
   - PRDs: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('draft':gray, 'approved':blue, 'in_dev':yellow, 'released':purple, 'measured':orange, 'closed':green), "Milestone" RELATION('<milestones ds>', DUAL 'PRDs'), "Owner role" SELECT(<프로젝트 role들>))`
     그다음 update-data-source로 `ADD COLUMN "Derived from" RELATION('<prds ds>', DUAL 'Follow-up PRDs' 'follow_up_prds')`
   - Tasks: `CREATE TABLE ("Name" TITLE, "Local ID" RICH_TEXT, "Status" SELECT('backlog':gray, 'ready':brown, 'in_progress':blue, 'review':yellow, 'awaiting_approval':orange, 'done':green, 'blocked':red, 'rejected':pink), "Role" SELECT(<프로젝트 role + finance, notion-sync>), "PRD" RELATION('<prds ds>', DUAL 'Tasks'), "Size" SELECT('small':gray, 'large':orange), "Handoff" RICH_TEXT, "Updated" DATE)`
3. Tasks에 보드 뷰 두 개: `칸반` (`GROUP BY "Status"`), `role별` (`GROUP BY "Role"`).
4. 페이지 URL, DB URL, data source ID, 뷰 ID를 `notion/config.json`에 쓴다. 형식:

```json
{
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

Notion 단계가 실패하면 상태 파일은 그대로 두고, 실패한 지점과 오류를 `decisions/log.md`와 사람에게 알린다.

## 5. 마무리

- `.claude/settings.json`이 이 플러그인을 켜고 있는지 확인한다 (이 스킬이 돌고 있다면 이미 켜져 있다).
- 만든 것을 커밋한다. 프로젝트에 커밋 규칙이 없으면 `chore(repo): agent-company 운영 구조 설립` 형식으로 쓰고, 본문에 role 구성과 이유를 적는다.
- 사람에게 보고한다: role 구성, 만든 파일, Notion 페이지 링크, 다음 단계(목표·지표 체계 수립 또는 first-run).
