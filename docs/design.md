# autelon 설계

role 단위로 일을 나눠 맡기는 멀티 에이전트 오케스트레이션. Claude Code 공식 기능만으로 구성하고, 직접 만드는 코드는 최소로 둔다.

표기: **[확인]** 문서·실행으로 확인함 / **[추정]** 근거는 있으나 확인 안 함 / **[미확인]** 모름, 구현 시 확인

## 0. 배포 구조: 플러그인 + 프로젝트별 독립 repo

- 이름: 플러그인·마켓플레이스는 `autelon`, 이 리포는 GitHub `autelon/company`(로컬 `~/dev/autelon/company`). 처음 이름은 agent-company였고 2026-10-03에 바꿨다. (사용자 결정)
- autelon은 여러 프로젝트에 계속 적용한다. 프로젝트끼리는 role, 상태 파일, Notion DB, repo가 모두 독립이다. (사용자 결정 2026-10-03)
- 그래서 이 리포는 Claude Code 플러그인(`plugin/`)이다. 프로젝트 repo의 `.claude/settings.json`이 `extraKnownMarketplaces`와 `enabledPlugins`로 이 플러그인을 켠다. 전역 설정에는 켜지 않는다. **[확인]** settings-reference 문서
- 프로젝트는 플러그인을 **GitHub 원격 저장소에서 설치한다**: 마켓플레이스 소스 `{"source": "github", "repo": "autelon/company", "ref": "main"}`. 로컬 경로(directory 소스)를 가리키지 않는다. (사용자 결정 2026-10-03)
  - 처음에는 directory 소스였다. poker에서 directory 소스 + 프로젝트 settings만으로는 Desktop Code 세션에 플러그인이 로드되지 않았다(`claude plugin marketplace list` → "No marketplaces configured", `claude plugin list` → "No plugins installed"). **[확인]** 2026-10-03 poker 세션 관찰. 원인은 **[미확인]**.
  - 문서: settings가 선언했지만 `known_marketplaces.json`에 없는 마켓플레이스는 "clones it, then reloads plugins and downloads enabled plugins that aren't cached yet". 프로젝트 scope 플러그인은 workspace trust 확인 뒤에만 로드된다. **[확인]** plugins/loading 문서. Desktop Code 탭에서 이 자동 설치가 일어나는지는 **[미확인]** 문서에 없음.
  - 자동 설치가 안 되면 프로젝트 폴더에서 `claude plugin marketplace add autelon/company` → `claude plugin install autelon@autelon --scope project`. **[확인]** plugins/install 문서. 사용자 설정(`~/.claude/plugins/`)이 바뀌므로 사람이 정한다.
- 업데이트: `plugin.json`에 `version`을 두지 않는다. 그러면 커밋마다 버전이 바뀌어 main 커밋이 새 버전이 된다. **[확인]** plugins/loading 문서 (사용자 결정 2026-10-03). 공식이 아닌 마켓플레이스는 자동 업데이트가 기본으로 꺼져 있어서 프로젝트에서 `claude plugin update autelon@autelon`으로 받는다. **[확인]** 문서
- 플러그인 개발: 고친 내용은 main에 머지되고 프로젝트에서 업데이트해야 반영된다. 머지 전 확인은 이 리포에서 `--plugin-dir ./plugin`. **[확인]** plugins/install 문서
- `plugin.json`의 `defaultEnabled: false`는 `enabledPlugins`에 값이 없을 때 꺼진 채로 시작한다는 뜻이다. **[확인]** manifest-reference 문서. 프로젝트 settings의 `true`가 이것을 이기는지는 문서에 명시되지 않음 **[미확인]**.
- 플러그인이 주는 것: `found-company` 스킬(설립), `director` 스킬(운영 규칙), 공용 role `autelon:finance`·`autelon:notion-sync`, 템플릿, 재무 스크립트.
- 프로젝트가 가지는 것: 프로젝트 role(`.claude/agents/`, 설립 때 기본 템플릿을 프로젝트에 맞게 고쳐 만든다), 상태 파일 전부, `notion/config.json`, 코드.
- 프로젝트 저장소: 설립 때 found-company가 GitHub 조직(플러그인 `userConfig.github_org`, 기본 `autelon`)에 만들고 `~/.claude/git-workflow.md`와 조직 `.github` 저장소의 `setup-repo.sh`로 main 보호를 적용한다. 적용 전에 바뀔 값을 사람에게 보여 주고 승인받는다. (사용자 결정 2026-10-03)
- PR 리뷰어는 프로젝트마다 정해 프로젝트 `docs/git-rules.md`에 적는다. `director`(기본값) / `reviewer role` / `사람`. 리뷰어가 머지 명령을 낸다. (사용자 결정 2026-10-03)
- Notion 루트 페이지는 플러그인 기본값에 두지 않는다. 플러그인 리포가 public이라 URL이 공개되기 때문이다. 설정값이 없으면 found-company가 사람에게 묻고 프로젝트 `notion/config.json`에 쓴다. (사용자 결정 2026-10-03)
  - userConfig에 값이 없을 때 `${user_config.*}`가 무엇으로 치환되는지 **[미확인]** 문서에 없음. 그래서 빈 값과 치환되지 않은 글자 둘 다 "설정 안 됨"으로 본다.
  - `pluginConfigs`(userConfig 값)는 사용자·관리 설정에서만 읽고 프로젝트 settings에서는 무시한다. **[확인]** settings-reference 문서
- role 개선의 두 층
  - 프로젝트 안의 학습: role의 `memory: project` → 프로젝트 `.claude/agent-memory/`
  - 프로젝트를 넘는 개선: `plugin/templates/roles/`를 고쳐 커밋 → 다음에 설립하는 프로젝트부터 반영
- director 규칙은 플러그인 `settings.agent`(메인 대화를 director agent로 띄우기)로 넣지 않고 스킬로 둔다. 문서상 agent를 메인으로 쓰면 그 agent 프롬프트가 Claude Code 기본 시스템 프롬프트를 **통째로 대체**한다. **[확인]** sub-agents 문서. 기본 도구 사용 지침을 잃을 위험이 있어, 프로젝트 CLAUDE.md가 세션 시작 시 `autelon:director` 스킬을 부르게 했다.
- 플러그인 agent는 `permissionMode`, `hooks`, `mcpServers`를 무시하고 `memory`, `isolation`, `tools`, `model`, `skills`, `omitClaudeMd`는 지원한다. **[확인]** plugins/components 문서

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

- 아래 그림의 role 구성은 기본 템플릿이다. 실제 구성은 프로젝트마다 설립 때 정한다.
- role = 프로젝트 `.claude/agents/<role>.md` 하나 (공용 role은 플러그인 `agents/`). 각 호출은 빈 context에서 시작한다. **[확인]** "Each subagent starts with a fresh, isolated context window." (sub-agents 문서)
- role 장기 기억 = `memory: project` → `.claude/agent-memory/<role>/MEMORY.md` 앞 200줄/25KB 자동 로드. **[확인]**
- subagent는 AskUserQuestion을 못 쓴다. 사람에게 묻는 건 director만 한다. **[확인]**
- 권한 요청·질문은 Remote Control + "Push when actions required"로 폰에 온다. 답할 때까지 열려 있다. **[확인]**
- director도 오래 쓰지 않는다. 스프린트가 끝나면 상태를 파일에 남기고 종료하고, 다음 director가 파일을 읽고 이어간다.

## 2. 파일 규칙 (모두 프로젝트 repo 안)

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
- 판정은 규칙 스크립트(`plugin/scripts/finance-check.mjs`, 프로젝트 루트에서 실행)로 한다. LLM은 정리 계획·보고만 맡는다.

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

- 프로젝트마다 루트 페이지(플러그인 `userConfig.notion_root_page`) 아래에 프로젝트 페이지와 DB 세 개를 따로 만든다. `found-company` 스킬이 만들고 ID를 프로젝트 `notion/config.json`에 쓴다.
- 2026-10-03에 루트 페이지 바로 아래 만든 DB 세 개는 스키마 검증용이었다. 구조가 프로젝트별로 바뀌어 더는 쓰지 않는다 (사람이 지워도 된다).

- 로컬 파일이 원본, Notion은 투영. **role/director는 Notion을 읽고 판단하지 않는다.** (양방향 충돌 해결을 만들지 않기 위해)
- 동기화는 체크포인트에서만: task 상태 변경 묶음, handoff 승인, 스프린트 종료.
- 동기화는 `notion-sync` subagent(haiku)만 한다. Notion MCP 도구를 director와 다른 role의 context에 두지 않기 위해서다. 그래서 다른 role은 `tools:`를 명시해 MCP 도구를 상속하지 않게 한다.
- **[확인]** claude.ai Notion 커넥터로 DB 생성(SQL DDL), 양방향 relation, 자기 참조 relation, 보드 뷰 생성까지 된다. 2026-10-03 실제로 만들었다. 위치와 ID는 프로젝트 `notion/config.json`.
- Tasks DB에 보드 뷰 두 개: `칸반`(Status별), `role별`(Role별). role별 보드가 후순위로 미룬 "role 단위 보기"의 최소판이다.
- **[미확인]** subagent(notion-sync)가 claude.ai 커넥터 도구를 상속받아 쓸 수 있는지. notion-sync는 `tools:`를 지정하지 않아 모든 도구를 상속하게 했다. `plugin/playbooks/first-run.md` 4단계에서 확인.
- Notion → 로컬 역방향은 없다. 승인은 AskUserQuestion·푸시로만 받는다. (사용자 결정 2026-10-03)

DB 스키마 (2026-10-03 Notion에 실제로 만든 것)

**Milestones**

| 속성        | 타입                                  | 로컬                    |
| ----------- | ------------------------------------- | ----------------------- |
| Name        | title                                 | milestones.json `title` |
| Local ID    | text                                  | `id` (M-01)             |
| Status      | select (planned/active/done)          | `status`                |
| Target date | date                                  | `target`                |
| PRDs        | relation ↔ PRDs.Milestone (자동 생성) | 역산                    |

**PRDs** (feature 단위, 페이지 본문 = PRD 섹션)

| 속성           | 타입                                                    | 로컬                |
| -------------- | ------------------------------------------------------- | ------------------- |
| Name           | title                                                   | frontmatter `title` |
| Local ID       | text                                                    | `id` (PRD-001)      |
| Status         | select (draft/approved/in_dev/released/measured/closed) | `status`            |
| Milestone      | relation ↔ Milestones                                   | `milestone`         |
| Derived from   | relation ↔ PRDs.Follow-up PRDs (자기 참조)              | `derived_from`      |
| Follow-up PRDs | relation (Derived from의 짝, 자동)                      | 역산                |
| Tasks          | relation ↔ Tasks.PRD (자동 생성)                        | 역산                |
| Owner role     | select                                                  | `owner`             |

**Tasks** (뷰: `칸반` Status별 보드, `role별` Role별 보드)

| 속성     | 타입                      | 로컬               |
| -------- | ------------------------- | ------------------ |
| Name     | title                     | tasks.json `title` |
| Local ID | text                      | `id` (T-0001)      |
| Status   | select (task 상태 그대로) | `status`           |
| Role     | select (role 8개)         | `role`             |
| PRD      | relation ↔ PRDs           | `prd`              |
| Size     | select (small/large)      | `size`             |
| Handoff  | text                      | `handoff` 경로     |
| Updated  | date                      | `updated_at`       |

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

- [x] Notion 커넥터 기능 확인, DB·뷰 생성 (2026-10-03)
- [ ] role 실제 호출 확인 → `plugin/playbooks/first-run.md` (설립한 프로젝트에서)
- [ ] notion-sync subagent가 claude.ai 커넥터 도구를 쓸 수 있는지 (first-run 4단계)
- [x] directory 소스 + 프로젝트 settings만으로 Desktop Code 세션에 로드되는가 → 안 됨 (2026-10-03 poker 관찰). GitHub 소스로 바꿈 (0절)
- [ ] GitHub 소스 + 프로젝트 settings로 Desktop 세션에서 자동 설치되는가, 안 되면 `claude plugin install --scope project`가 필요한가 (poker)
- [ ] `defaultEnabled: false`를 프로젝트 settings의 `enabledPlugins: true`가 이기는가 (poker)
- [ ] userConfig 설정 창이 언제 뜨는가(설치 때 / 켤 때), 값이 없을 때 `${user_config.*}`가 무엇으로 치환되는가 (poker)
- [x] 새 세션에 작업을 넘기는 방법: `mcp__ccd_session__spawn_task`. 칩이 뜨고 사람이 눌러야 세션이 생기며, `prompt`가 첫 메시지가 된다. `cwd`로 다른 프로젝트 폴더를 줄 수 있다 (2026-10-03 사용자 안내, poker 칩으로 확인)
  - 도구 설명은 "gets a fresh worktree"라고 하지만, poker 세션은 메인 checkout(main)에서 열렸다. 칩을 누를 때 worktree 선택이 있었는지는 **[미확인]**
  - `start_session`·`hand_off_to_session`(사람 클릭 없이 세션 시작)은 Desktop 2.19675.0 코드에 있지만 서버 기능 플래그 `sideSessions`가 꺼져 있어 등록되지 않는다. 앱 캐시 `fcache`의 값은 `on:false, source:defaultValue`. 사용자 설정이나 settings.json으로 켤 수 없다 (2026-10-03 앱 코드 확인). 요청 이슈 anthropics/claude-code#89783 (열려 있음)
  - `claude://code/new?folder=…&q=…` 딥링크도 새 세션을 연다. 글은 입력창에 채워질 뿐 자동 전송되지 않고, 폴더는 매번 확인 창이 뜬다 (support.claude.com 문서)
- [ ] `found-company` 스킬이 role 설계·상태 파일·Notion 생성을 끝까지 해내는지
- [ ] 재개 예약 방식 (scheduled-tasks / CronCreate)
- [ ] Desktop Code 탭에서 statusline 동작 여부 (필요해질 때)
- [x] 성공지표·성과측정 = 비즈니스 관점, PRD마다 다름, 전체 목표에 연결 (사용자 결정 2026-10-03)
- [ ] 분석 데이터를 어디에 쌓을지 (da가 선택지 제시 → 사람 결정)
- [ ] subagent에 전역 CLAUDE.md가 로드되는지 (지금은 문제 아님)
- [x] `isolation: worktree`일 때 worktree 생성 위치: `.claude/worktrees/` (logistics-hub에서 실제로 생긴 위치로 확인)
- [ ] worktree 안에서 `memory: project`의 `.claude/agent-memory/` 경로가 메인 checkout과 worktree 중 어디로 가는지
- [x] worktree를 쓰려면 첫 커밋이 있어야 함 (2026-10-03 첫 커밋 완료)
