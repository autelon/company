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
2. `docs/first-run.md`가 없으면 first-run이다. `${CLAUDE_PLUGIN_ROOT}/playbooks/first-run.md`를 진행하고 결과를 `docs/first-run.md`에 쓴다. `decisions/log.md`에는 쓰지 않는다. 이 규칙이 생기기 전에 설립한 프로젝트(결과가 decisions에만 있는 프로젝트)도 파일이 없으면 짧은 점검을 한 번 한다.
   - `docs/first-run.md`에 "미확인"으로 남은 항목은 그 시점이 오면 확인하고 파일을 갱신한다: 보안 검토는 첫 PR을 올릴 때, developer worktree는 developer에게 첫 구현 task를 맡길 때. 그 task를 배정하기 전에 `docs/first-run.md`를 다시 본다.
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

- `board/`, `decisions/`, `state/`, `prds/`, `docs/goals.md`, `docs/first-run.md`, `notion/`은 **director만** 쓴다. 예외: `notion/ids.json`은 notion-sync가 쓴다.
- `notion/`, `local/`, `state/quota.json`, role 메모리(`.claude/agent-memory/`)는 커밋하지 않는다(`.gitignore`에 있다). public 저장소에 Notion ID, 로컬 매핑, 계정 사용량, role이 남긴 기록이 공개되지 않게. 다른 커밋되는 파일에도 Notion URL·ID를 적지 않는다.
- role은 자기 handoff만 쓴다. 예외: developer는 코드, da는 `analytics/`.
- PRD는 `${CLAUDE_PLUGIN_ROOT}/templates/prd.md`로 만든다. 섹션은 role이 handoff에 초안을 쓰고, director가 승인 후 PRD에 반영한다.

## 코드 변경과 PR

- 원격이 있으면 모든 변경은 main 보호 여부와 상관없이 작업 브랜치와 PR로 들어간다. 절차와 리뷰어는 프로젝트 `docs/git-rules.md`와 그 문서가 가리키는 조직 `.github` 저장소의 `git-workflow.md`를 따른다.
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

- 체크포인트(handoff 승인, task 상태 변경 묶음, 작업 단위 종료)에서 `autelon:notion-sync`를 호출한다.
- director는 Notion을 직접 읽거나 쓰지 않는다. Notion을 보고 판단하지 않는다. Notion에서 고친 내용은 로컬로 가져오지 않는다.
- 예외: `autelon:found-company`와 `autelon:adopt-project`는 설립·도입 때 Notion 페이지와 DB를 직접 만든다. 운영 중인 first-run의 Notion 확인은 `autelon:notion-sync`에 맡긴다.

## 세션 단위

- **director 세션 하나 = 작업 단위 하나**(스프린트, 기능 하나, PRD 하나). 작업 단위가 끝나면 세션도 끝낸다. 한 세션에서 여러 작업 단위를 이어 가지 않는다.
  - 이유: 플러그인은 세션이 시작될 때 불러온다. 짧은 세션은 항상 최신 플러그인으로 시작하고 컨텍스트도 작다. 긴 세션은 플러그인이 바뀔 때마다 사람이 `/reload-plugins`를 쳐야 한다(Desktop에서는 사람이 직접 친 입력으로만 실행된다).
- **role task는 세션이 아니라 subagent로 한다.** 각 호출은 새 컨텍스트에서 시작하므로 task마다 세션을 만들 필요가 없다.
- 이 세션이 루트(조율) 세션이 보낸 칩으로 시작했다면, 첫 메시지의 목표와 완료 기준이 이 세션의 범위다. 범위 밖의 요청은 직접 하지 않고 사람에게 알린다(루트 세션이 다른 작업 세션으로 나눈다).
- 플러그인 변경이 이 세션에 꼭 필요할 때만 사람에게 `/reload-plugins`를 요청한다. 급하지 않으면 다음 세션부터 적용되게 둔다.

## 끝낼 때 (작업 단위 종료)

- `state/sprint.md`에 다음 director용 인계를 쓴다: 완료한 것, 진행 중인 것, 승인 대기, 다음에 할 것, 주의할 점, 열린 PR.
- notion-sync를 호출한다.
- 사람에게 마지막 보고를 하고 세션을 끝낸다. 다음 작업은 새 director 세션이 `state/sprint.md`를 읽고 시작한다.

## 개인 리소스 정보

- 개인 리소스 연결 정보는 원격(커밋, PR 본문, 코멘트)에 올리지 않는다. 대상: Notion URL·ID, 로컬 절대 경로(`/Users/...`), 로컬 임시 폴더·scratchpad 경로, 개인 계정 정보(이메일, 토큰).
- 로컬 임시 폴더 경로는 사용자 이름, uid, 세션 UUID가 드러난다. 형태는 `/private/tmp/claude-<uid>/-Users-<이름>-dev/<세션 UUID>/scratchpad/...`다. `-Users-` 꼴이라 `/Users/` 검색에 걸리지 않으므로 아래 패턴을 따로 둔다.
- 개인 이메일 주소(`@gmail.` 같은 개인 메일 도메인)도 올리지 않는다. 커밋의 author·committer, 메시지 끝의 `Co-Authored-By:` 줄까지 포함한다. 허용: GitHub noreply(`@users.noreply.github.com`, `noreply@github.com`)와 `noreply@anthropic.com`.
- 이런 값은 로컬 설정에만 둔다: 사용자 설정 `pluginConfigs`(플러그인 userConfig), 프로젝트 `notion/`(Notion ID), 프로젝트 `local/`(그 외 로컬 매핑, 예: `local/paths.json`의 `{"autelon/logistics-hub": "<로컬 경로>"}`). `notion/`과 `local/`은 `.gitignore`에 있다.
- 커밋되는 파일은 이름으로만 가리킨다(예: 저장소는 `autelon/logistics-hub`). 경로는 repo 루트 기준 상대 경로로 쓰고, repo 밖의 것은 저장소나 문서 이름으로 가리킨다. 홈 기준 경로(`~/...`)도 쓰지 않는다.
- 의심스러운 것은 push 전에 막는다. 한 번 push하면 브랜치를 다시 써도 지워지지 않는다. PR 타임라인이 이전 head의 SHA를 붙잡고 있어 SHA로 계속 조회된다.
- **이 절의 검사가 기준 명령이다.** found-company·adopt-project·security-reviewer는 여기를 가리키고 패턴을 따로 복사하지 않는다. 패턴을 바꿀 때는 이 절과 `autelon:security-reviewer`의 자동 검색 줄을 함께 고친다.
- 커밋 전에 다음 둘이 비어 있어야 한다.
  1. 내용: `git diff --cached | grep -n -i -E 'notion\.(com|so|site)|/Users/|-Users-|/private/tmp/|/var/folders/|claude-[0-9]+/|scratchpad|@(gmail|naver|kakao|daum|hotmail|outlook|icloud|yahoo)\.'`
  2. 작성자와 공동 작성자(push할 범위 `<base>..HEAD`, 첫 push면 `HEAD`): `git log --format='%ae%n%ce%n%B' <범위> | grep -o -i -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' | sort -u | grep -v -i -E '@users\.noreply\.github\.com$|^noreply@github\.com$|^noreply@anthropic\.com$'` (주소를 하나씩 뽑은 뒤 허용 주소만 지운다. 출력이 남으면 위반. author와 committer를 한 줄에 찍으면 허용 주소가 섞인 줄이 통째로 지워져 committer의 개인 주소를 놓친다)
- 이 grep은 하이픈 없는 32자리 Notion ID, 개인 도메인이 아닌 이메일, 토큰은 잡지 못하므로 diff에서 그런 값이 없는지도 눈으로 확인한다. `scratchpad`는 일반 단어로도 쓰이므로 걸린 것이 경로로 쓰였는지 하나씩 본다. 이 규칙 문서처럼 패턴을 설명하는 글은 걸려도 위반이 아니다.

## 모든 role 공통 (role 지시문에 넣을 것)

- 추정으로 결정하지 않는다. 모르면 handoff의 `## 사람에게 묻기`에 적는다.
- 경로는 프로젝트 루트 기준 상대 경로로 적는다(handoff 포함).
- 개인 리소스 정보(Notion URL·ID, 로컬 절대 경로, 임시 폴더 경로, 계정 정보)를 커밋되는 파일과 handoff에 쓰지 않는다.
- scratchpad·임시 파일·로컬 추출본의 경로를 커밋되는 문서에 출처로 적지 않는다. 출처는 원문 URL이나 저장소 상대 경로로 적는다. 로컬에만 있는 자료는 "로컬 추출본(커밋하지 않음)"이라고만 적는다.
