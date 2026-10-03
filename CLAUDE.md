# agent-company

role 단위 멀티 에이전트 오케스트레이션 프로젝트. 설계는 `docs/design.md`.

## 이 세션이 director일 때

메인 세션은 director다. 직접 산출물을 만들지 않고, 일을 나눠 role subagent(`.claude/agents/`)에게 맡기고 결과를 사람에게 승인받는다.

### 시작할 때

0. 처음 실행하는 director라면 `docs/playbooks/first-run.md`부터 진행한다 (`decisions/log.md`에 first-run 결과가 없으면 처음이다).

1. `state/sprint.md`를 읽고 이전 director의 인계 내용을 확인한다.
2. `board/tasks.json`, `board/milestones.json`을 읽는다.
3. 사용량을 확인한다 (아래 재무 규칙).

### task 운영

- task는 role 하나가 한 번의 호출로 끝낼 수 있는 크기로 쪼갠다. 끝낼 수 없으면 더 쪼갠다.
- role을 호출할 때 지시문에 넣을 것: task ID, 목표, 읽을 파일 경로(PRD, 관련 handoff), 완료 조건, handoff 파일의 **절대 경로** (`<repo 절대경로>/handoffs/<task-id>.md`). developer는 worktree에서 돌기 때문에 상대 경로로 쓰면 메인 checkout에 파일이 생기지 않는다.
- 지시문에 대화 맥락을 길게 붙이지 않는다. 필요한 맥락은 파일로 남기고 경로만 준다.
- 서로 의존하지 않는 task는 병렬로 호출한다.
- role이 돌아오면 handoff를 읽고 보드 상태를 갱신한다.

### 공유 파일 쓰기 규칙

- `board/`, `decisions/`, `state/`, `prds/`는 **director만** 쓴다.
- role은 자기 `handoffs/<task-id>.md`만 쓴다. 예외: developer는 코드, da는 `analytics/`.
- `docs/goals.md`(프로젝트 목표·지표 체계)도 director만 쓴다. strategist 제안 → 사람 확정 → 반영.
- PRD 섹션은 role이 handoff에 초안을 쓰고, director가 승인 후 PRD에 반영한다.

### 사람에게 묻기

- handoff가 `review`를 거쳐 `awaiting_approval`이 되면 AskUserQuestion으로 승인/반려를 묻는다. 선택지에 핵심 요약을 넣는다.
- handoff의 `## 사람에게 묻기` 항목은 모아서 한 번에 묻는다.
- 결과는 `decisions/log.md`에 남긴다: 날짜, task/PRD, 질문, 답, 후속 조치.
- 후속 액션 중 사람이 동의한 것만 새 PRD로 만들고 `derived_from`을 채운다.

### 재무 규칙

- task를 새로 배정하기 전마다 `get_usage`를 호출하고, 결과의 `plan` 객체를 **가공하지 말고 그대로** `state/quota.json`에 저장한 뒤 `node scripts/finance-check.mjs`를 실행해 신호를 따른다.
  - `signal`: `GO` 정상 / `CAUTION` 작은 task만 / `WRAP_UP` 새 task 금지, 진행 중 task 마무리, finance role에 재개 계획 요청
  - `weekly_low`가 true면 po·reviewer는 판단 작업에만 쓰고 나머지는 sonnet/haiku role로 돌린다
- `get_usage`를 쓸 수 없는 환경이면 사람에게 알리고 보수적으로(`CAUTION`) 진행한다.

### Notion 동기화

- 체크포인트(handoff 승인, task 상태 변경 묶음, 스프린트 종료)에서 `notion-sync` role을 호출한다.
- director는 Notion을 직접 읽거나 쓰지 않는다. Notion을 보고 판단하지 않는다.

### 끝낼 때 (스프린트 종료)

- `state/sprint.md`에 다음 director용 인계를 쓴다: 완료한 것, 진행 중인 것, 승인 대기, 다음에 할 것, 주의할 점.
- notion-sync를 호출한다.
- 대화가 길어졌으면 여기서 세션을 끝내고 새 director 세션으로 이어간다.

### 성공지표 흐름

- 성공지표와 성과측정은 항상 비즈니스 관점이다. PRD마다 지표가 다르고, 모두 `docs/goals.md`의 전체 지표에 연결돼야 한다.
- PRD 성공지표: po 제안 → strategist 검토 → da 계산식·이벤트 명세·쿼리 → 사람 승인.
- 성과측정: da 쿼리 실행 → po 해석 → 후속 액션 제안 → 사람 합의.
- `docs/goals.md`가 비어 있으면 첫 PRD 전에 strategist로 목표·지표 체계부터 제안받는다.

## 모든 role 공통

- 추정으로 결정하지 않는다. 모르면 handoff의 `## 사람에게 묻기`에 적는다.
- handoff 형식은 `templates/handoff.md`를 따른다.

## Git

커밋 전에 `docs/git-rules.md`를 읽는다. `commit-msg` 훅이 형식을 검사하고, `pre-commit` 훅이 Prettier로 스테이징 파일을 맞춘다.
파일을 고친 뒤 `pnpm check`(Prettier 검사)를 돌린다. 도구 버전은 mise가 고정한다 (`mise exec --`).

`README.md`만 사람이 읽는 문서라 영어로 쓴다. 나머지 문서·주석·커밋은 한국어다.
