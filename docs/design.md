# agent-company 설계

role 단위로 일을 나눠 맡기는 멀티 에이전트 오케스트레이션. Claude Code 공식 기능만으로 구성하고, 직접 만드는 코드는 최소로 둔다.

표기: **[확인]** 문서·실행으로 확인함 / **[추정]** 근거는 있으나 확인 안 함 / **[미확인]** 모름, 구현 시 확인

## 1. 구조 (B안: director + role subagent)

```
사람 ──(폰 푸시·승인 / claude.ai/code / Notion 열람)──┐
                                                    │
director 세션 (Desktop Code 탭, Remote Control 켬)  ◀┘
  │  task 분해·배정, 승인 요청, 재무 신호 확인, 보드 기록
  ├─▶ po        (subagent, 새 context)
  ├─▶ designer  (subagent, 새 context)
  ├─▶ developer (subagent, 새 context, worktree 격리)
  ├─▶ reviewer  (subagent, 새 context)
  ├─▶ strategist (subagent, 전체 목표·지표 체계, PRD 지표 검토)
  ├─▶ da        (subagent, 지표 정의·이벤트 명세·분석 쿼리·성과측정)
  ├─▶ finance   (subagent, 한도 임박 시)
  └─▶ notion-sync (subagent, 체크포인트마다 Notion 반영)

로컬 파일 = 원본 (board/, prds/, handoffs/, decisions/, state/)
Notion     = 사람이 보는 투영(projection)
```

- role = `.claude/agents/<role>.md` 하나. 각 호출은 빈 context에서 시작한다. **[확인]** "Each subagent starts with a fresh, isolated context window." (sub-agents 문서)
- role 장기 기억 = `memory: project` → `.claude/agent-memory/<role>/MEMORY.md` 앞 200줄/25KB 자동 로드. **[확인]**
- subagent는 AskUserQuestion을 못 쓴다. 사람에게 묻는 건 director만 한다. **[확인]**
- 권한 요청·질문은 Remote Control + "Push when actions required"로 폰에 온다. 답할 때까지 열려 있다. **[확인]**
- director도 오래 쓰지 않는다. 스프린트가 끝나면 상태를 파일에 남기고 종료하고, 다음 director가 파일을 읽고 이어간다.

## 2. 파일 규칙

| 경로                                        | 내용                                                                        | 쓰는 쪽                                           |
| ------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| `board/tasks.json`                          | task 보드 (상태, 담당 role, PRD, 마일스톤)                                  | **director만**                                    |
| `board/milestones.json`                     | 마일스톤                                                                    | **director만**                                    |
| `prds/PRD-NNN-<slug>.md`                    | feature 단위 PRD (frontmatter + 섹션)                                       | 섹션 담당 role이 handoff로 제출 → director가 반영 |
| `handoffs/<task-id>.md`                     | role의 작업 결과·요청·질문. director가 **절대 경로**로 지정 (worktree 대응) | 해당 task 담당 role만                             |
| `decisions/log.md`                          | 승인/반려, 사람 결정 기록                                                   | director만                                        |
| `docs/goals.md`                             | 프로젝트 목표, north star, 하위 지표                                        | director만 (strategist 제안 → 사람 확정)          |
| `analytics/events.md`, `analytics/queries/` | 이벤트 수집 명세, 지표별 분석 쿼리                                          | da만                                              |
| `state/quota.json`                          | 최근 사용량 스냅샷 (`get_usage`의 `plan` 객체 원본)                         | director                                          |
| `state/sprint.md`                           | 현재 스프린트 요약, 다음 director 인계                                      | director만                                        |

동시 쓰기 금지 원칙: 공유 파일은 director만 쓴다. role은 자기 handoff 파일만 쓴다. 그래서 여러 role이 병렬로 돌아도 충돌하지 않는다.

task 상태: `backlog → ready → in_progress → review → awaiting_approval → done` (+ `blocked`, `rejected`)

## 3. 승인/개입 지점

1. **handoff 승인/반려** (필수): role 결과가 들어오면 director가 AskUserQuestion으로 묻는다. 결과는 `decisions/log.md`에 남는다.
2. **role의 질문·결정 요청**: role은 handoff의 `## 사람에게 묻기` 섹션에 적고 종료한다. director가 모아서 묻는다.
3. **권한 요청**: Claude Code 기본 권한 프롬프트 → 폰 푸시.
4. **후속 액션 → 새 PRD**: director가 제안하고 사람이 동의한 것만 생성한다 (`derived_from` 연결).

## 4. 재무팀 (토큰 한도 관리)

- 사용량 출처
  - Desktop 앱: director가 `get_usage` (ccd_session_mgmt)를 호출한다. **[확인]** 이 세션에서 실제로 호출함
  - CLI: statusline JSON `rate_limits.five_hour/seven_day.used_percentage, resets_at`. **[확인]** 문서. 단 Desktop Code 탭에서 statusline 스크립트가 도는지는 **[미확인]** → 지금은 만들지 않음
- director는 `get_usage` 결과의 `plan` 객체를 가공 없이 `state/quota.json`에 저장한다. 숫자를 LLM이 옮겨 적지 않기 위해서다.
- 판정은 규칙 스크립트(`scripts/finance-check.mjs`)로 한다. LLM은 정리 계획·보고만 맡는다.

| 5시간 사용률 | 신호                             | director 행동                                                                                         |
| ------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| < 70%        | `GO`                             | 정상 배정                                                                                             |
| 70–85%       | `CAUTION`                        | 큰 task(예상 대형) 새로 시작 안 함, 작은 task만                                                       |
| ≥ 85%        | `WRAP_UP`                        | 새 task 금지. 진행 중 task는 handoff 남기고 마무리. finance가 재개 계획 작성. `resets_at`에 재개 예약 |
| 주간 ≥ 85%   | `weekly_low: true` (별도 플래그) | 최상위 모델 role(po, reviewer)은 판단 작업만, 나머지는 sonnet/haiku                                   |

- 재개 예약 방식: **[미확인]** 후보는 scheduled-tasks MCP, CronCreate. 구현할 때 확인한다.
- 한도를 실제로 넘었을 때 subagent/세션의 동작: **[미확인]** 일부러 재현하지 않는다. 처음 발생하면 `decisions/log.md`에 관찰 기록.

## 5. Notion (사람이 보는 화면)

원칙

- 로컬 파일이 원본, Notion은 투영. **role/director는 Notion을 읽고 판단하지 않는다.** (양방향 충돌 해결을 만들지 않기 위해)
- 동기화는 체크포인트에서만: task 상태 변경 묶음, handoff 승인, 스프린트 종료.
- 동기화는 `notion-sync` subagent(haiku)만 한다. Notion MCP 도구를 director와 다른 role의 context에 두지 않기 위해서다. 그래서 다른 role은 `tools:`를 명시해 MCP 도구를 상속하지 않게 한다.
- **[미확인]** Notion MCP가 DB 생성, relation 속성, 보드 뷰 생성까지 되는지. 인증 후 도구 목록을 보고 스키마를 확정한다.
- **[미확인]** subagent `mcpServers`에 이미 설치된 플러그인 MCP를 이름으로 참조할 수 있는지. 확인 전까지 notion-sync 정의에 넣지 않음.
- Notion → 로컬 역방향은 없다. 승인은 AskUserQuestion·푸시로만 받는다. (사용자 결정 2026-10-03)

DB 스키마 (초안)

**Milestones**

| 속성        | 타입                         | 로컬                    |
| ----------- | ---------------------------- | ----------------------- |
| Name        | title                        | milestones.json `title` |
| Status      | select (planned/active/done) | `status`                |
| Target date | date                         | `target`                |
| PRDs        | relation → PRDs              | 역산                    |
| Local ID    | text                         | `id` (M-01)             |

**PRDs** (feature 단위, 페이지 본문 = PRD 섹션)

| 속성         | 타입                                                    | 로컬                |
| ------------ | ------------------------------------------------------- | ------------------- |
| Name         | title                                                   | frontmatter `title` |
| ID           | text                                                    | `id` (PRD-001)      |
| Status       | select (draft/approved/in_dev/released/measured/closed) | `status`            |
| Milestone    | relation → Milestones                                   | `milestone`         |
| Derived from | relation → PRDs                                         | `derived_from`      |
| Tasks        | relation → Tasks                                        | 역산                |
| Owner role   | select                                                  | `owner`             |

**Tasks** (보드 뷰 = 칸반, Status 기준 그룹)

| 속성    | 타입                      | 로컬               |
| ------- | ------------------------- | ------------------ |
| Name    | title                     | tasks.json `title` |
| ID      | text                      | `id` (T-0001)      |
| Status  | select (task 상태 그대로) | `status`           |
| Role    | select                    | `role`             |
| PRD     | relation → PRDs           | `prd`              |
| Handoff | url/text                  | `handoff` 경로     |
| Updated | date                      | `updated_at`       |

로컬 각 항목은 `notion_id`, `last_synced`를 가진다. notion-sync는 `updated_at > last_synced`인 것만 반영한다.

## 6. PRD 템플릿

`templates/prd.md` 참고. 섹션별 담당:

| 섹션          | 담당                                                           |
| ------------- | -------------------------------------------------------------- |
| 목표          | po                                                             |
| 성공지표      | po 제안 → strategist 검토 → da 측정 가능하게 (비즈니스 지표만) |
| 디자인 변경안 | designer                                                       |
| 개발사항      | developer                                                      |
| 결과          | developer + reviewer                                           |
| 성과측정 분석 | da 쿼리 실행·숫자 → po 해석                                    |
| 후속 액션     | po 제안 → 사람 합의 → 합의된 것만 새 PRD + `derived_from`      |

## 7. 남은 확인 항목

- [ ] Notion MCP 인증 후 도구 목록 확인 → 스키마 확정
- [ ] subagent `mcpServers`로 플러그인 MCP 참조 가능 여부
- [ ] 재개 예약 방식 (scheduled-tasks / CronCreate)
- [ ] Desktop Code 탭에서 statusline 동작 여부 (필요해질 때)
- [x] 성공지표·성과측정 = 비즈니스 관점, PRD마다 다름, 전체 목표에 연결 (사용자 결정 2026-10-03)
- [ ] 분석 데이터를 어디에 쌓을지 (da가 선택지 제시 → 사람 결정)
- [ ] subagent에 전역 CLAUDE.md가 로드되는지 (지금은 문제 아님)
- [x] `isolation: worktree`일 때 worktree 생성 위치: `.claude/worktrees/` (logistics-hub에서 실제로 생긴 위치로 확인)
- [ ] worktree 안에서 `memory: project`의 `.claude/agent-memory/` 경로가 메인 checkout과 worktree 중 어디로 가는지
- [ ] worktree를 쓰려면 첫 커밋이 있어야 함
