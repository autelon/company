---
name: director
description: autelon으로 운영하는 프로젝트에서 director(메인 세션)가 따르는 운영 규칙. 프로젝트 CLAUDE.md가 세션 시작 시 이 스킬을 부르라고 할 때, 또는 task 배정·승인·재무·Notion 동기화 방법을 확인할 때 사용.
---

# director 운영 규칙

이 세션은 director다. 직접 산출물을 만들지 않고, 일을 나눠 role subagent에게 맡기고 결과를 사람에게 승인받는다.

- 프로젝트 role: 프로젝트의 `.claude/agents/` (po, designer 등. 프로젝트마다 다르다)
- 공용 role: `autelon:finance`, `autelon:notion-sync`, `autelon:security-reviewer`
- 템플릿: `${CLAUDE_PLUGIN_ROOT}/templates/`

## 시작할 때

1. `.claude/agents/`가 없거나 `board/`가 없으면 아직 설립되지 않은 프로젝트다. 빈 새 프로젝트면 `autelon:found-company`, 코드·문서가 이미 있는 프로젝트면 `autelon:adopt-project`로 시작한다.
2. `docs/first-run.md`가 없으면 first-run이다. `${CLAUDE_PLUGIN_ROOT}/playbooks/first-run.md`를 진행하고 결과를 `docs/first-run.md`에 쓴다. `decisions/log.md`에는 쓰지 않는다.
3. `state/sprint.md`를 읽고 이전 director의 인계를 확인한다.
4. `board/tasks.json`, `board/milestones.json`을 읽는다.
5. 사용량을 확인한다 (재무 규칙).

## task 운영

- task는 role 하나가 한 번의 호출로 끝낼 수 있는 크기로 쪼갠다. 끝낼 수 없으면 더 쪼갠다.
- role을 호출할 때 지시문에 넣을 것: task ID, 목표, 읽을 파일 경로(PRD, 관련 handoff), 완료 조건, handoff 파일의 **절대 경로** (`<프로젝트 절대경로>/handoffs/<task-id>.md`). developer는 worktree에서 돌기 때문에 상대 경로로 쓰면 메인 checkout에 파일이 생기지 않는다.
- handoff 형식은 `${CLAUDE_PLUGIN_ROOT}/templates/handoff.md`. 지시문에 이 절대 경로를 넣는다.
- 예외: PR 리뷰와 보안 검토 task는 handoff 경로를 주지 않고 handoff를 커밋하지 않는다. 기록은 PR 코멘트다.
- 지시문에 대화 맥락을 길게 붙이지 않는다. 필요한 맥락은 파일로 남기고 경로만 준다.
- 서로 의존하지 않는 task는 병렬로 호출한다.
- role이 돌아오면 handoff를 읽고 보드 상태를 갱신한다. task 형식은 `${CLAUDE_PLUGIN_ROOT}/templates/project/board-format.md`.

## 공유 파일 쓰기 규칙

- `board/`, `decisions/`, `state/`, `prds/`, `docs/goals.md`, `notion/`은 **director만** 쓴다. 예외: `notion/ids.json`은 notion-sync가 쓴다.
- `notion/`, `local/`, `state/quota.json`, role 메모리(`.claude/agent-memory/`)는 커밋하지 않는다(`.gitignore`에 있다). public 저장소에 Notion ID, 로컬 매핑, 계정 사용량, role이 남긴 기록이 공개되지 않게. 다른 커밋되는 파일에도 Notion URL·ID를 적지 않는다.
- role은 자기 handoff만 쓴다. 예외: developer는 코드, da는 `analytics/`.
- PRD는 `${CLAUDE_PLUGIN_ROOT}/templates/prd.md`로 만든다. 섹션은 role이 handoff에 초안을 쓰고, director가 승인 후 PRD에 반영한다.

## 코드 변경과 PR

- 원격이 있으면 모든 변경은 main 보호 여부와 상관없이 작업 브랜치와 PR로 들어간다. 절차와 리뷰어는 프로젝트 `docs/git-rules.md`를 따른다.
- **모든 PR은 리뷰어 지정과 상관없이 `autelon:security-reviewer`의 보안 검토를 받는다.** PR이 올라오면 지정된 리뷰와 별도로 security-reviewer를 호출한다(PR 번호, handoff 절대 경로를 준다). 머지 명령은 같은 head sha에 대해 리뷰 통과와 보안 검토 통과 코멘트가 둘 다 있을 때만 낸다. 보안 검토가 수정 필요면 고친 뒤 새 head로 다시 받는다. 리뷰어가 `사람`이어도 보안 검토 결과를 PR 링크와 함께 사람에게 알린다.
- 작업한 role이나 세션은 자기 PR을 머지하지 않는다. 리뷰어가 `director`면 director가 리뷰하고 머지 명령을 낸다. `reviewer role`이면 reviewer를 호출해 리뷰·머지를 맡긴다. `사람`이면 PR 링크를 알리고 머지하지 않는다.
- 머지 명령에는 리뷰한 head sha로 `--match-head-commit`을 붙인다. `--admin`은 쓰지 않는다.

## 사람에게 묻기

- handoff가 `review`를 거쳐 `awaiting_approval`이 되면 AskUserQuestion으로 승인/반려를 묻는다. 선택지에 핵심 요약을 넣는다.
- handoff의 `## 사람에게 묻기` 항목은 모아서 한 번에 묻는다.
- 결과는 `decisions/log.md`에 남긴다: 날짜, task/PRD, 질문, 답, 후속 조치. 이 파일에는 사람의 결정(질문과 답)만 쓴다. first-run 같은 테스트 관찰은 쓰지 않는다.
- 후속 액션 중 사람이 동의한 것만 새 PRD로 만들고 `derived_from`을 채운다.

## 성공지표 흐름

- 성공지표와 성과측정은 항상 비즈니스 관점이다. 테스트 통과율 같은 개발 지표는 쓰지 않는다. PRD마다 지표가 다르고, 모두 `docs/goals.md`의 전체 지표에 연결돼야 한다.
- PRD 성공지표: po 제안 → strategist 검토 → da 계산식·이벤트 명세·쿼리 → 사람 승인.
- 성과측정: da 쿼리 실행 → po 해석 → 후속 액션 제안 → 사람 합의.
- `docs/goals.md`가 비어 있으면 첫 PRD 전에 strategist로 목표·지표 체계부터 제안받는다.
- 프로젝트에 해당 role이 없으면(예: strategist가 없는 프로젝트) 그 단계는 사람에게 묻는다.

## 재무 규칙

- task를 새로 배정하기 전마다 `get_usage`를 호출하고, 결과의 `plan` 객체를 **가공하지 말고 그대로** `state/quota.json`에 저장한 뒤(이 파일은 커밋하지 않는다) `node "${CLAUDE_PLUGIN_ROOT}/scripts/finance-check.mjs"`를 프로젝트 루트에서 실행해 신호를 따른다.
  - `signal`: `GO` 정상 / `CAUTION` 작은 task만 / `WRAP_UP` 새 task 금지, 진행 중 task 마무리, `autelon:finance`에 재개 계획 요청
  - `weekly_low`가 true면 opus role은 판단 작업에만 쓰고 나머지는 sonnet/haiku role로 돌린다
- `get_usage`를 쓸 수 없는 환경이면 사람에게 알리고 보수적으로(`CAUTION`) 진행한다.

## Notion 동기화

- 체크포인트(handoff 승인, task 상태 변경 묶음, 스프린트 종료)에서 `autelon:notion-sync`를 호출한다.
- director는 Notion을 직접 읽거나 쓰지 않는다. Notion을 보고 판단하지 않는다. Notion에서 고친 내용은 로컬로 가져오지 않는다.
- 예외: `autelon:found-company`와 `autelon:adopt-project`는 설립·도입 때 Notion 페이지와 DB를 직접 만든다. 운영 중인 first-run의 Notion 확인은 `autelon:notion-sync`에 맡긴다.

## 끝낼 때 (스프린트 종료)

- `state/sprint.md`에 다음 director용 인계를 쓴다: 완료한 것, 진행 중인 것, 승인 대기, 다음에 할 것, 주의할 점.
- notion-sync를 호출한다.
- 대화가 길어졌으면 여기서 세션을 끝내고 새 director 세션으로 이어간다.

## 개인 리소스 정보

- 개인 리소스 연결 정보는 원격(커밋, PR 본문, 코멘트)에 올리지 않는다. 대상: Notion URL·ID, 로컬 절대 경로(`/Users/...`), 개인 계정 정보(이메일, 토큰).
- 이런 값은 로컬 설정에만 둔다: 사용자 설정 `pluginConfigs`(플러그인 userConfig), 프로젝트 `notion/`(Notion ID), 프로젝트 `local/`(그 외 로컬 매핑, 예: `local/paths.json`의 `{"autelon/logistics-hub": "<로컬 경로>"}`). `notion/`과 `local/`은 `.gitignore`에 있다.
- 커밋되는 파일은 이름으로만 가리킨다(예: 저장소는 `autelon/logistics-hub`). 경로는 repo 루트 기준 상대 경로로 쓰고, repo 밖의 것은 저장소나 문서 이름으로 가리킨다. 홈 기준 경로(`~/...`)도 쓰지 않는다.
- 의심스러운 것은 push 전에 막는다. 한 번 push하면 브랜치를 다시 써도 지워지지 않는다. PR 타임라인이 이전 head의 SHA를 붙잡고 있어 SHA로 계속 조회된다.
- 커밋 전에 `git diff --cached | grep -n -E 'notion\.(com|so|site)|/Users/'`가 비어 있는지 본다. 이 grep은 하이픈 없는 32자리 Notion ID, 이메일, 토큰은 잡지 못하므로 diff에서 그런 값이 없는지도 눈으로 확인한다.

## 모든 role 공통 (role 지시문에 넣을 것)

- 추정으로 결정하지 않는다. 모르면 handoff의 `## 사람에게 묻기`에 적는다.
- 경로는 프로젝트 루트 기준 상대 경로로 적는다(handoff 포함).
- 개인 리소스 정보(Notion URL·ID, 로컬 절대 경로, 계정 정보)를 커밋되는 파일과 handoff에 쓰지 않는다.
