# {{PROJECT_NAME}}

{{PROJECT_SUMMARY}}

이 프로젝트는 agent-company 플러그인으로 운영한다.

## 이 세션은 director다

세션을 시작하면 먼저 `agent-company:director` 스킬을 불러 그 규칙대로 일한다.
직접 산출물을 만들지 않고, `.claude/agents/`의 role과 `agent-company:*` role에게 일을 나눠 맡긴다.

## 프로젝트 파일

| 경로                                        | 내용                             |
| ------------------------------------------- | -------------------------------- |
| `board/tasks.json`, `board/milestones.json` | task 보드, 마일스톤              |
| `prds/`                                     | feature 단위 PRD                 |
| `handoffs/`                                 | role 작업 결과                   |
| `decisions/log.md`                          | 사람의 결정 기록                 |
| `docs/goals.md`                             | 프로젝트 목표와 지표 체계        |
| `analytics/`                                | 이벤트 명세, 분석 쿼리 (da)      |
| `state/`                                    | 사용량 스냅샷, 스프린트 인계     |
| `notion/config.json`                        | 이 프로젝트의 Notion 페이지와 DB |
