# autelon 설계

role 단위로 일을 나눠 맡기는 멀티 에이전트 오케스트레이션. Claude Code 공식 기능만으로 구성하고, 직접 만드는 코드는 최소로 둔다.

표기: **[확인]** 문서·실행으로 확인함 / **[추정]** 근거는 있으나 확인 안 함 / **[미확인]** 모름, 구현 시 확인

이 문서의 "(사용자 결정 …)" 표시의 질문·답은 company 이슈에 있다: `decision` 라벨 이슈(주제별)와 각 이슈의 결정 코멘트. 예전 `docs/decisions.md`는 이슈로 옮기고 지웠다(autelon/company#34).

## 0. 배포 구조: 플러그인 + 프로젝트별 독립 repo

- 이름: 플러그인·마켓플레이스는 `autelon`, 이 리포는 GitHub `autelon/company`. 처음 이름은 agent-company였고 2026-10-03에 바꿨다. (사용자 결정)
- autelon은 여러 프로젝트에 계속 적용한다. 프로젝트끼리는 role, repo, 이슈, Project가 모두 독립이다. (사용자 결정 2026-10-03, 기록 위치는 2026-10-04에 이슈로 바꿈, 2절)
- 그래서 이 리포는 Claude Code 플러그인(`plugin/`)이다. 프로젝트는 GitHub 원격 저장소 `autelon/company`의 main에서 설치한다. 로컬 경로(directory 소스)를 가리키지 않는다. (사용자 결정 2026-10-03)
- 설정은 두 층으로 나눈다. (사용자 결정 2026-10-04)
  - **사용자 설정(user settings)**: 마켓플레이스 등록, 자동 업데이트, 플러그인 설치(user scope). `"extraKnownMarketplaces": {"autelon": {"source": {"source": "github", "repo": "autelon/company"}, "autoUpdate": true}}`, `"enabledPlugins": {"autelon@autelon": false}`. 설치는 한 번, 기본은 꺼짐.
  - **프로젝트 `.claude/settings.json`**: `"enabledPlugins": {"autelon@autelon": true}`만. `enabledPlugins`는 같은 id에 대해 우선순위가 가장 높은 파일의 값이 쓰이고 project가 user보다 높아서, 이 파일이 있는 프로젝트에서만 켜진다. **[확인]** plugins/loading 문서. 전역으로 켜면 다른 프로젝트(logistics-hub 등)에도 스킬이 로드된다.
  - 프로젝트 settings에 `extraKnownMarketplaces.autelon`을 두지 않는다. 같은 이름의 항목은 우선순위가 높은 파일의 것이 통째로 쓰여서 전역의 `autoUpdate`가 무시된다. **[확인]** settings-reference 문서
  - 사용자 설정의 `source`는 `claude plugin marketplace add autelon/company`가 기록한 소스와 같아야 한다. `"ref": "main"`을 더했더니 "Marketplace autelon is added but ignored. Its network source differs from the one declared for it in settings"로 플러그인이 로드되지 않았다. **[확인]** 2026-10-04 실행
  - `claude plugin install autelon@autelon --scope user`는 `defaultEnabled: false` 때문에 사용자 settings에 `"autelon@autelon": false`를 직접 기록하고 "This plugin is disabled by default"라고 알렸다. **[확인]** 2026-10-04 실행
  - 확인한 상태(2026-10-04, CLI 2.1.286): 설치 기록은 user scope 하나(`installed_plugins.json`). poker에서 `claude plugin list` → enabled, 다른 폴더 → disabled. **[확인]**
  - Desktop Code 세션의 + → Plugins 토글이 어느 settings 파일에 기록하는지 **[미확인]**. 그래서 프로젝트에서 켤 때는 그 프로젝트 `.claude/settings.json`에 직접 적는다.
  - Desktop 설정/Customize의 플러그인 화면은 claude.ai 계정으로 동기화되는 구성이고 CLI의 `~/.claude`와 별개라서 autelon이 보이지 않는다. **[확인]** desktop 문서 ("syncs through your claude.ai account, not from the CLI's `~/.claude` directory")
- 처음 설치 기록
  - directory 소스 + 프로젝트 settings만으로는 Desktop Code 세션에 플러그인이 로드되지 않았다(`claude plugin marketplace list` → "No marketplaces configured", `claude plugin list` → "No plugins installed"). **[확인]** 2026-10-03 poker 관찰. 원인 **[미확인]**.
  - 그 뒤 CLI로 설치했다: `claude plugin marketplace add autelon/company` → poker에서 `claude plugin install autelon@autelon --scope project` → 사용자 범위로 바꿈(위). 마켓플레이스 add는 사용자 settings의 `extraKnownMarketplaces`에도 기록된다. **[확인]** 2026-10-04 실행, plugins/loading 문서
  - `claude plugin uninstall autelon@autelon --scope project`는 설치 기록뿐 아니라 그 프로젝트 `.claude/settings.json`의 `enabledPlugins` 항목도 지웠다(`{}`가 됨). **[확인]** 2026-10-04 실행
  - 설치할 때 "2 userConfig options not yet set — run /plugin configure autelon@autelon"이 나왔다. 기본값이 있는 `github_org`도 미설정으로 셌다. **[확인]**
- 업데이트: `plugin.json`에 `version`을 두지 않는다. (사용자 결정 2026-10-03) 설치된 버전은 `bb0599b8e999`로, `plugin/`을 마지막으로 바꾼 커밋(`44ad66d`)이 아니라 **main 최신 커밋**이었다. **[확인]** 2026-10-04. 설치할 때와 업데이트할 때마다 설치된 버전은 autelon/company main HEAD SHA의 앞 12자와 같았다. **[확인]** 2026-10-04 poker, 이 기기. 그래서 문서만 바뀐 머지도 새 버전이 될 가능성이 높다(문서만 바꾼 머지가 새 버전을 만드는지는 **[미확인]**).
  - 자동 업데이트는 대화형 세션에서 첫 메시지 뒤 최대 10분 안에 백그라운드로 돌고, 받은 버전은 다음 세션이나 `/reload-plugins`부터 적용된다. **[확인]** plugins/loading 문서. `/reload-plugins`가 실행 중인 세션에 플러그인 업데이트를 적용하는 것은 직접 확인했다. **[확인]** 2026-10-04 바로 받으려면 `claude plugin update autelon@autelon`. `/reload-plugins`는 Desktop 세션에서도 실행된다. **[확인]** 2026-10-04 poker Desktop 세션에서 사용자가 입력한 `/reload-plugins`로 새 role이 로드됨(아래 관찰), commands 문서(1절). 자동 업데이트가 Desktop 세션에서도 백그라운드로 도는지는 **[미확인]**(7절).
  - 버전 관리 대안: semver를 직접 올리거나(B), 프로젝트별로 `ref`를 릴리스 태그로 고정(C). 프로젝트마다 반영 시점을 따로 정해야 할 때 검토한다.
- 플러그인 개발: 고친 내용은 main에 머지되어야 프로젝트에 간다. 머지 전 확인은 이 리포에서 `--plugin-dir ./plugin`. **[확인]** plugins/install 문서
- 관찰 (2026-10-04, poker와 이 기기, 모두 **[확인]**)
  - 사용자 scope 설치와 프로젝트 `enabledPlugins`로 Desktop 세션에서 플러그인이 로드된다. `defaultEnabled: false`는 프로젝트의 `true`가 이긴다.
  - 설립 중에 만든 프로젝트 role은 같은 세션에서 부를 수 없고(`Agent type 'reviewer' not found`), 사용자가 `/reload-plugins`를 입력한 뒤에 그 role과 `autelon:security-reviewer`를 부를 수 있었다.
  - logistics-hub 도입·first-run(autelon/logistics-hub#36, #37, 2026-10-04): 프로젝트 폴더에서 연 Desktop 세션에서 프로젝트 role 14개와 공용 role이 subagent로, director·found-company가 스킬로 보였다. 다른 폴더에서 시작한 세션에서는 프로젝트 role이 보이지 않았다. notion-sync가 커넥터로 M-00을 만들었고 handoff에 URL이 없었다. finance 메모리는 프로젝트 루트 `.claude/agent-memory/autelon-finance/`.
  - 세션 작업 폴더가 worktree(`.claude/worktrees/<이름>`)였을 때 `autelon:security-reviewer`의 메모리는 그 worktree의 `.claude/agent-memory/`에 생겼다. `isolation: worktree`인 developer는 **[미확인]**.
  - 사람이 Desktop 앱을 보고 있으면 폰 푸시가 나가지 않는다(PushNotification이 "터미널이 활성 상태라 중복"으로 거절). 앱을 벗어난 뒤에는 PushNotification과 AskUserQuestion 푸시가 둘 다 폰에 왔고 폰에서 고른 답이 세션에 들어왔다.
  - Desktop 세션 셸 PATH에 `claude`가 없었다.
  - Desktop의 "+ → Plugins" 메뉴에는 autelon이 나오지 않았지만 스킬 자동완성에는 `autelon:*`가 보였다. 원인은 **[미확인]**.
  - 사용자는 CLI 명령을 직접 입력하지 않는다. 에이전트가 앱에 들어 있는 `claude` 바이너리로 실행하고, 사용자는 `/reload-plugins` 같은 세션 명령만 입력한다. (사용자 결정 2026-10-04)
- `plugin.json`의 `defaultEnabled: false`는 `enabledPlugins`에 값이 없을 때 꺼진 채로 시작한다는 뜻이다. **[확인]** manifest-reference 문서. 프로젝트 settings의 `true`가 이를 이긴다. **[확인]** 2026-10-04 poker에서 enabled
- 플러그인이 주는 것: `found-company`·`adopt-project` 스킬(설립·도입), `director` 스킬(운영 규칙), 공용 role `autelon:finance`·`autelon:security-reviewer`, 템플릿(이슈 본문·코멘트, 루틴 지시문 포함), 재무·개인 정보 검사 스크립트, 검사 스크립트 밖 gh 글쓰기를 막는 PreToolUse 훅(`plugin/hooks/hooks.json`), playbook(first-run, 이슈 명령, 이전 절차, 루틴 등록).
- 프로젝트가 가지는 것: 프로젝트 role(`.claude/agents/`, 설립 때 기본 템플릿을 프로젝트에 맞게 고쳐 만든다), "지금 기준" 문서, 코드, 그리고 GitHub의 이슈·마일스톤·Project.
- 프로젝트 저장소: 설립 때 found-company가 GitHub 조직(플러그인 `userConfig.github_org`)에 만들고, 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md` 표준과 같은 저장소의 `scripts/setup-repo.sh`로 main 보호를 적용한다. 적용 전에 바뀔 값을 사람에게 보여 주고 승인받는다. (사용자 결정 2026-10-03) 표준 문서는 처음에 사용자 홈의 전역 설정에 있었고 2026-10-04에 `autelon/.github`로 옮겼다(autelon/.github#4). 첫 push는 PR이 아니므로 push 전에 security-reviewer가 로컬 `main` 전체 히스토리를 검토하고 "통과"일 때만 올린다(company#12).
- PR 리뷰어는 프로젝트마다 정해 프로젝트 `docs/git-rules.md`에 적는다. `director`(기본값) / `reviewer role` / `사람`. 리뷰어가 머지 명령을 낸다. (사용자 결정 2026-10-03)
- Notion 투영(notion-sync role, 프로젝트별 Notion DB)은 2026-10-04에 없앴다. 화면은 GitHub Project가 맡는다(5절). (사용자 결정 2026-10-04) 그 전의 Notion 설정 경위는 git 히스토리에 있다(`git log -S notion_root_page`).
  - `${user_config.*}`는 스킬을 불러올 때 치환된다. 세션이 열린 뒤에 넣은 값은 `/reload-plugins`가 필요하고, reload가 치환을 다시 한다. **[확인]** 2026-10-04 poker. manifest의 `default`는 치환에 쓰이지 않았다(`github_org`가 reload 뒤에도 글자 그대로). **[확인]** 그래서 스킬은 글자 그대로 남은 값과 빈 값을 둘 다 "설정 안 됨"으로 본다. 사용자는 값을 사용자 설정 `pluginConfigs`에 넣어 두고, 값은 이 리포에 적지 않는다.
  - `pluginConfigs`(userConfig 값)는 사용자·관리 설정에서만 읽고 프로젝트 settings에서는 무시한다. **[확인]** settings-reference 문서
- 기존 프로젝트는 `adopt-project` 스킬로 들인다. found-company는 CLAUDE.md·목표 파일을 템플릿으로 만들어 기존 프로젝트에서는 덮어쓰거나 충돌한다. adopt-project는 기존 문서를 원본으로 두고 없는 autelon 파일만 더하며, 기존 작업 방식은 비교해 제안만 한다. (2026-10-04, logistics-hub 도입 요청에서)
- 개인 리소스 정보(Notion URL·ID, 로컬 절대 경로, 계정 정보)는 원격(커밋, PR, 이슈·코멘트)에 올리지 않고 로컬 설정(`pluginConfigs`, 프로젝트 `local/`·예전 `notion/`, gitignore)에만 둔다. 패턴의 원본은 `plugin/scripts/privacy-check.mjs`다. 커밋되는 파일은 이름으로 가리킨다. (사용자 결정 2026-10-04) 2026-10-04 점검: autelon 조직 저장소 3개(company, .github, logistics-hub)의 전체 히스토리·PR·코멘트에 Notion URL·개인 경로 없음. poker 로컬 히스토리의 경로는 push 전에 홈 기준 경로로 바꿨지만, 그것도 커밋되는 파일에서는 위반이라 poker 저장소를 지우고 다시 만들었다(아래).
  - 원칙: 커밋되는 파일에서 경로는 repo 루트 기준 상대 경로로 쓰고, repo 밖의 것은 저장소나 문서 이름으로 가리킨다. 홈 기준 경로(`~/...`)도 위반이다. security-reviewer 검토 항목 1에 넣었다. (사용자 결정 2026-10-04, company#12)
  - 의심스러운 것은 push 전에 막는다. PR 브랜치에 한 번 올라간 커밋은 force push로 빼도 PR 타임라인이 이전 head를 붙잡고 있어 SHA로 계속 조회된다. **[확인]** poker
- 보안 검토자(`security-reviewer`)는 공용 role로 플러그인에 둔다. 리뷰어 지정(director / reviewer role / 사람)과 상관없이 모든 PR에 들어가고, 작업 단위 종료 때 그 기간의 이슈·코멘트를 훑는다(2026-10-04 추가). PR은 같은 head sha에 리뷰 통과와 보안 검토 통과가 둘 다 있어야 머지한다. 개인 경로, Notion 주소·ID, 비밀 값, 개인 정보, 위험한 CI·의존성 변경을 엄격하고 보수적으로 본다(확신이 없으면 수정 필요). 공용 role로 둔 이유: 프로젝트 role로 두면 프로젝트마다 기준이 달라지고, 플러그인 업데이트만으로 진행 중인 프로젝트(poker, logistics-hub)에도 같은 기준이 들어간다. (사용자 결정 2026-10-04)
- 프로젝트 기본 무시 항목은 `templates/project/gitignore.template`이 원본이다(예전 notion/, local/(이슈 초안·백업), .env*, state/quota.json, role 메모리, settings.local.json, worktrees). found-company·adopt-project가 프로젝트 `.gitignore`에 합친다. (company#9)
- role 개선의 두 층
  - 프로젝트 안의 학습: role의 `memory: project` → 프로젝트 `.claude/agent-memory/`. **커밋하지 않는다**(`.gitignore`). 무엇이 기록될지 미리 알 수 없고 finance 메모리에는 계정 사용량이 들어가서, public 저장소에 올리면 공개된다. 그래서 role 학습은 기기마다 따로 쌓인다. (사용자 결정 2026-10-04, company#9) 공용 role의 메모리 폴더는 `autelon:finance` → `autelon-finance/`처럼 콜론이 하이픈으로 바뀐다. **[확인]** poker first-run. `memory: project`는 유지한다. `.claude/agent-memory-local/`은 무시 목록에만 있는 안전 항목이다. (사용자 결정 2026-10-04)
  - 프로젝트를 넘는 개선: `plugin/templates/roles/`를 고쳐 커밋 → 다음에 설립하는 프로젝트부터 반영
- director 규칙은 플러그인 `settings.agent`(메인 대화를 director agent로 띄우기)로 넣지 않고 스킬로 둔다. 문서상 agent를 메인으로 쓰면 그 agent 프롬프트가 Claude Code 기본 시스템 프롬프트를 **통째로 대체**한다. **[확인]** sub-agents 문서. 기본 도구 사용 지침을 잃을 위험이 있어, 프로젝트 CLAUDE.md가 세션 시작 시 `autelon:director` 스킬을 부르게 했다.
- 플러그인 agent는 `permissionMode`, `hooks`, `mcpServers`를 무시하고 `memory`, `isolation`, `tools`, `model`, `skills`, `omitClaudeMd`는 지원한다. **[확인]** plugins/components 문서

## 1. 구조 (B안: director + role subagent)

```
사람 ──(폰 푸시·승인 / claude.ai/code / Project 화면)──┐
                                                    │
director 세션 (Desktop Code 탭, Remote Control 켬)  ◀┘
  │  task 분해·배정, 승인 요청, 재무 신호 확인, 이슈·Project 기록
  ├─▶ po        (subagent, 새 context)
  ├─▶ designer  (subagent, 새 context)
  ├─▶ developer (subagent, 새 context, worktree 격리)
  ├─▶ reviewer  (subagent, 새 context)
  ├─▶ strategist (subagent, 전체 목표·지표 체계, PRD 지표 검토)
  ├─▶ da        (subagent, 지표 정의·이벤트 명세·분석 쿼리·성과측정)
  ├─▶ finance   (subagent, 한도 임박 시)
  └─▶ security-reviewer (subagent, 모든 PR, 작업 단위 종료 때 이슈 검토)

GitHub 이슈 = 기록의 원본 (task, PRD, 결정, role 결과 코멘트, 인계)
Project     = 사람이 보는 화면 (보드, 로드맵)
저장소 md   = agent가 매 세션 읽는 "지금 기준" 문서
```

- 아래 그림의 role 구성은 기본 템플릿이다. 실제 구성은 프로젝트마다 설립 때 정한다.
- role = 프로젝트 `.claude/agents/<role>.md` 하나 (공용 role은 플러그인 `agents/`). 각 호출은 빈 context에서 시작한다. **[확인]** "Each subagent starts with a fresh, isolated context window." (sub-agents 문서)
- role 장기 기억 = `memory: project` → `.claude/agent-memory/<role>/MEMORY.md` 앞 200줄/25KB 자동 로드. **[확인]**
- subagent는 AskUserQuestion을 못 쓴다. 사람에게 묻는 건 director만 한다. **[확인]**
- 권한 요청·질문은 Remote Control + "Push when actions required"로 폰에 온다. 답할 때까지 열려 있다. **[확인]**
- director도 오래 쓰지 않는다. 작업 단위가 끝나면 인계를 현재 스프린트 이슈에 남기고 종료하고, 다음 director가 그 이슈를 읽고 이어간다.
- 세션 구조는 세 단계다. (사용자 결정 2026-10-04)
  - **루트(조율) 세션**: 프로젝트 폴더들의 상위 폴더에서 연다. 각 프로젝트로 가는 연결 정보만 들고, 상태는 필요할 때 이슈·Project에서 읽는다(`gh search issues --owner <조직>`). 직접 프로젝트 코드를 고치지 않는다. 이슈 작업 루프(아래)가 갖춰지면 루트는 다음만 맡는다: 루프 감시(이슈 생성·처리 추이, 필요하면 감시도 루틴으로 돌리고 바꿀 점이 보이면 사람에게 알림), 루프 규칙·플러그인·조직 공통 저장소 수정, 플러그인 업데이트, 프로젝트를 넘나드는 일과 새 프로젝트, 사람의 요청을 프로젝트 이슈로 나누는 창구. 루트 교대는 일 묶음이 끝날 때마다 하고, 인계 문서는 저장소 밖 로컬 파일에 둔다. (사용자 결정 2026-10-04, company#22)
    - 루프 전에는 작업 세션을 `mcp__ccd_session__spawn_task` 칩(대화 없이 혼자 진행할 수 있는 prompt)으로 열고, 기록을 읽어(`list_events`) 정리하고, 필요하면 메시지(`send_message`)로 지시했다. 루프가 없는 프로젝트와 루프 밖의 일에는 지금도 이 방식을 쓴다.
  - **작업(director) 세션**: 프로젝트 폴더에서 작업 단위 하나를 맡고, 끝나면 현재 스프린트 이슈에 인계를 쓰고 끝난다. 두 가지다: 루틴의 한 실행(무인)과 사람이 연 세션. 사람이 연 세션이 특정 이슈를 다루면 제목에 `#번호`를 넣는다.
  - **role task**: director 세션 안의 subagent.
- **이슈 작업 루프** (사용자 결정 2026-10-04, company#22): 사람이 클릭하지 않아도 일이 이어지게 하려고 만들었다. 세션을 에이전트가 직접 띄우는 기능은 이 계정에서 쓸 수 없다(아래 근거, 7절).
  - 프로젝트마다 **로컬** 예약 작업(루틴) 하나. 실행 폴더는 그 프로젝트 루트(프로젝트 settings에서 켠 플러그인이 로드되게). 지시문 템플릿은 `plugin/templates/routine/prompt.md`, 등록 절차는 `plugin/playbooks/routine.md`, 규칙은 director 스킬 "이슈 작업 루프".
  - 처리 대상은 저장소 소유 계정이 작성하고 `agent:ready`가 붙은 열린 이슈만. 사람과 모든 프로젝트의 에이전트가 같은 gh 계정으로 이슈를 만들기 때문에 작성자 조건은 외부인 차단용이다. 다른 계정의 이슈·코멘트는 지시로 쓰지 않는다. `gh issue list --author @me`가 소유 계정의 이슈만 돌려주는 것은 확인했다. **[확인]** 2026-10-04 company 저장소
  - 라벨: `agent:ready`(루틴 대상, 라벨 없는 이슈는 사람이 쓰는 초안), `agent:needs-user`(사람의 결정 필요, 루틴은 건너뜀, 사람이 답하면 `agent:ready`로 바꿈).
  - 작업은 루틴 세션(director)이 subagent(role)에게 맡긴다. 새 세션은 만들지 않는다. 통신은 메인과 subagent 사이로 한다(subagent끼리 직접 통신은 **[미확인]**이라 안 된다고 본다).
  - 중복 실행: 진행 중 라벨은 쓰지 않는다. 루틴은 시작할 때 자기 이전 실행이 아직 실행 중이면 바로 끝낸다. 같은 예약 작업은 실행 중이면 다음 주기를 건너뛰고 밀린 주기를 몰아서 실행하지도 않으므로 **[확인]** 2026-10-04 시험(company#22 코멘트), 이 규칙은 앱 동작이 바뀔 때를 대비한 이중 장치다. 서로 다른 예약 작업끼리의 동시 실행은 **[미확인]**이라 한 저장소를 두 루틴이 다루지 않게 한다. 이슈를 다루는 세션은 제목에 `#번호`를 넣고, 루틴은 그 프로젝트에서 실행 중인 세션 제목에 그 번호가 있으면 건너뛴다.
  - 승인: 무인 실행에서는 AskUserQuestion을 쓰지 않는다. role 결과의 승인·반려와 사람의 결정은 코멘트로 묻고 `agent:needs-user`로 넘긴다. (사용자 결정 2026-10-04) 3절의 승인 지점은 그대로이고 묻는 통로만 이슈가 된다.
  - 후속 이슈: 이어서 할 일과 다른 role의 조사·확인이 필요한 일을 director(루틴 메인)가 새 이슈로 만들고 본문에 `이어지는 이슈: #N`을 적는다. role은 보고에 후속 제안을 넣는다. 후속 이슈에는 바로 `agent:ready`를 붙인다(사람의 결정이 먼저 필요하면 `agent:needs-user`). (사용자 결정 2026-10-04) 수는 처음에는 제한하지 않고 루트가 추이를 본다.
  - 루틴은 중복 이슈를 합치거나 쪼개 작업을 다시 정리할 수 있다. 한 실행에서 처리할 이슈 수도 제한하지 않는다. 사용량은 재무 규칙(4절)을 따르고 `WRAP_UP`이면 새 이슈를 시작하지 않는다.
  - 실행 기록: 이슈를 건드린 실행은 현재 스프린트 이슈 본문을 인계로 바꾸고 처리 요약 코멘트를 남긴다. 아무 이슈도 건드리지 않은 실행은 이슈에 쓰지 않는다(주기마다 빈 코멘트가 쌓이지 않게). 처리 요약은 실행의 마지막 메시지로도 남긴다.
  - PR은 지금 규칙 그대로다(작업자와 다른 리뷰어, 별도 보안 검토, 같은 head sha에 둘 다 통과, `--match-head-commit`, `--admin` 금지).
  - 다른 프로젝트에 전달: director와 루틴은 조직의 다른 저장소에 새 이슈와 코멘트를 쓸 수 있고 `agent:ready`도 붙일 수 있다. 다른 저장소의 코드·설정·기존 이슈 본문은 건드리지 않는다. 전달 이슈는 새 라벨 없이 본문의 `보낸 곳: <조직>/<저장소>#N` 줄로, 전달 코멘트는 첫 줄의 같은 표시로 구분한다. 같은 gh 계정이라 이 표시가 없으면 받는 쪽 루틴이 전달 코멘트를 사람의 답으로 읽는다. 작업 단위 끝의 보안 검토는 글을 쓴 다른 저장소도 본다. (사용자 결정 2026-10-04, autelon/company#33) 이유: poker 이전 세션이 logistics-hub에 전할 체크리스트를 금지 문장 때문에 사람을 거쳐 옮겨야 했다. 라벨을 쓰지 않은 것은 받는 저장소마다 라벨을 미리 만들어야 해서다. 반복·폭주는 루트 세션이 이슈 생성 추이로 본다.
  - 예약 작업에 대해 확인한 것 **[확인]** scheduled-tasks 도구 설명: 앱이 열려 있을 때 로컬에서 돌고 놓친 실행은 다음에 앱을 열 때 돈다, 실행 하나가 새 세션 하나다, `list_task_runs`가 실행마다 `running`/`succeeded`/`failed` 상태를 준다, `create_scheduled_task`에는 실행 폴더 값이 없고, 예약 작업을 만든 세션의 폴더가 실행 폴더로 저장된다(autelon/company#25. 그래서 프로젝트 루트의 director 세션이 등록한다). 무인 세션에서는 다른 세션에 메시지 보내기와 권한 모드 변경을 쓸 수 없다(도구 설명). `list_sessions`는 세션마다 `cwd`, `isRunning`, 제목을 준다 **[확인]** 2026-10-04 대화형 세션에서 호출. 무인 실행에서 이 도구들을 쓸 수 있다 **[확인]** autelon/company#25.
  - 지시문은 등록할 때 복사되므로 템플릿이 바뀌면 프로젝트마다 다시 등록한다. 지시문이 부르는 director 스킬과 role은 플러그인 업데이트를 따른다.
  - 근거: 플러그인은 세션 시작 때 불러온다 **[확인]**(plugins/loading 문서). Desktop의 `/reload-plugins`는 사람이 직접 친 입력으로만 실행된다 **[확인]**(commands 문서). 이 계정에서 세션은 사람이 칩을 눌러야 생긴다(`start_session`은 서버 기능 플래그로 꺼짐) **[확인]**. 그래서 role task마다 세션을 만들면 클릭만 늘고, 한 세션을 오래 쓰면 reload가 잦아진다.

## 2. 기록 위치와 쓰기 규칙

기준은 하나다. **"언제 무슨 일이 있었고 왜 그렇게 정했나"(기록·진행)는 GitHub 이슈로, agent가 매 세션 읽고 코드를 맞춰야 하는 "지금 기준" 문서는 저장소 md로.** 문서에는 결론만 쓰고, 바뀐 경위는 이슈·PR에 남긴다. (사용자 결정 2026-10-04)

| 기록                                        | 위치                                                                                          | 쓰는 쪽                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| task                                        | 이슈(타입 Task). 상태·Role·Size = Project 필드, 마일스톤 = 저장소 마일스톤, 선행 = blocked by | director                               |
| role 작업 결과(예전 handoff)                | 그 task 이슈의 코멘트                                                                         | 그 task 담당 role                      |
| PRD                                         | 이슈(타입 Feature). 명세 = 본문, task = 하위 이슈, 초안·논의·승인 = 코멘트                    | 본문은 director, 초안은 role 코멘트    |
| 사람의 결정                                 | 결정이 나온 이슈의 코멘트, 따로 난 결정은 Task + `decision` 라벨 이슈                         | director                               |
| 세션 인계                                   | 고정한 "현재 스프린트" 이슈(`sprint` 라벨) 본문, 이력은 코멘트                                | director                               |
| first-run 결과                              | `first-run` 라벨 이슈                                                                         | director                               |
| 로드맵                                      | Project 로드맵 화면(마일스톤, `Start date`·`Target date`)                                     | director                               |
| `docs/goals.md`                             | 프로젝트 목표, north star, 하위 지표                                                          | director (strategist 제안 → 사람 확정) |
| `analytics/events.md`, `analytics/queries/` | 이벤트 수집 명세, 지표별 분석 쿼리                                                            | da                                     |
| 설계·규칙·playbook·조사 문서 (`docs/`)      | 개념, 도메인 모델, 아키텍처, 기능 설계, 아키텍처·테스트·git 규칙, agent 작업 방식             | PR로                                   |
| `state/quota.json`                          | 최근 사용량 스냅샷 (`get_usage`의 `plan` 객체 원본, 커밋하지 않음)                            | director                               |

- 이슈 타입은 조직에 이미 있는 Task·Bug·Feature를 쓰고 결정은 라벨로 구분한다. 새 타입은 조직 설정 변경이 필요해서 만들지 않았다. (사용자 결정 2026-10-04) **[확인]** autelon 조직의 타입은 Task·Bug·Feature 세 개(gh api, 2026-10-04)
- **이슈 = 원본, Project = 화면.** 이슈 하나만 보고도 무엇인지 알 수 있게 쓰고(타입, 라벨, 마일스톤, 부모, 의존 관계, 본문), Project 필드는 보드를 위한 것이다.
- **본문 = 현재 결론, 코멘트 = 이력.** 본문 맨 위 "현재 결론" 칸을 결정이 날 때마다 director가 고친다. agent는 기본으로 본문만 읽는다.
- **쓰기 권한**: 이슈 생성, 본문·상태·필드·라벨·마일스톤 변경, 닫기는 director만. role(subagent)은 자기 task 이슈에 코멘트만 쓴다. 코멘트는 덧붙이기만 하니 role이 병렬로 써도 충돌하지 않는다. 예전의 "공유 파일은 director만, role은 자기 handoff 파일만" 원칙을 이렇게 바꿨다.
  - 그래서 코멘트를 올려야 하는 role 템플릿(po, designer, strategist)에도 Bash를 줬다. 용도는 지시문으로 검사 스크립트 실행과 지시받은 작업에 한정한다. director가 대신 올리는 안은 role이 직접 쓴다는 결정과 맞지 않아 버렸다.
- **개인 정보 사전 검사**: 이슈·코멘트·본문 수정은 리뷰 없이 바로 공개된다. 그래서 모든 쓰기는 `plugin/scripts/privacy-check.mjs gh ...`를 거친다. 스크립트는 issue/pr의 create·edit·comment, 라벨 create·edit, `gh api`의 마일스톤 만들기·고치기와 이슈 코멘트 고치기만 받아 글을 검사하고, 통과할 때만 `gh`를 실행한다. 라벨·마일스톤·코멘트 고치기는 poker 이전에서 스크립트를 거치지 않는 글로 드러나 더했다(autelon/company#27, 사용자 결정 2026-10-04). Project·화면·선택지 이름은 GraphQL·`gh project`라 인자 모양이 다양해 받지 않고, playbook의 고정 문구만 쓴다. 표준 입력 본문은 검사할 수 없어 거절한다. 본문·코멘트 초안은 커밋하지 않는 `local/`에 쓴다.
  - **PreToolUse 훅** (사용자 결정 2026-10-04, autelon/company#29): 플러그인이 `hooks/hooks.json`으로 Bash 훅을 주고, 판정은 `privacy-check.mjs hook`이 한다(받는 명령 목록이 스크립트 한 곳에 있게). 스크립트를 거치지 않은 gh 글쓰기면 `permissionDecision: deny`와 이유를 돌려준다. 이유: 규칙만으로는 실수로 직접 `gh issue comment`를 쓰는 것을 막지 못한다. poker에서 프로젝트 로컬 설정의 같은 훅이 메인 세션과 subagent 모두에서 막는 것을 확인했다(autelon/company#29).
    - 플러그인 훅은 플러그인이 켜진 프로젝트에서만 돈다(이 리포처럼 켜지 않은 곳은 안 걸린다). 설정·플러그인 훅은 subagent 도구 호출에도 돈다. 훅 명령에 `${CLAUDE_PLUGIN_ROOT}`를 쓸 수 있다. **[확인]** hooks·plugins 문서
    - 버린 안: 프로젝트 템플릿 `settings.json`에 넣기(훅 스크립트 경로가 로컬 절대 경로라 커밋할 수 없다), 규칙으로만 두기(실수를 못 막는다). 끄는 설정(userConfig)은 두지 않았다(사용자가 고른 안).
    - 한계: 명령 문자열을 단순하게 나눠 보므로 변수에 담은 명령, `eval`, `bash -c` 안의 명령, `npx` 같은 실행기를 거친 호출은 잡지 못한다. 강제 장치가 아니라 실수 방지다. here-document 본문과 따옴표 안의 명령 문자열(커밋 메시지 등)은 명령으로 보지 않는다.
    - 보완(autelon/company#40): 막힌 이유를 셋으로 나눠 안내한다(스크립트로 다시 실행 / 스크립트가 받지 않으니 다른 방법이나 사람에게 / 판정할 파일을 못 읽음). 이슈·PR REST 쓰기는 `title`·`body`(필드나 쿼리 문자열)나 `--input`이 있을 때만 막는다(state·labels 같은 필드만 바꾸는 호출은 글이 아니다). PR 머지 API의 커밋 제목·본문도 막는다. 판정에 읽는 파일은 일반 파일 1MB까지만 읽는다. 하위 명령 앞의 `-R`은 검사 스크립트 gh 모드도 받는다. 알고 둔 한계: 서브셸 안의 `cd`도 뒤 명령에 적용된다고 보고, `--notes-from-tag`(이미 푸시된 태그 글)는 통과한다. 릴리스 제목·노트는 스크립트가 받지 않으므로 막고 사람에게 알리게 했다. 릴리스를 스크립트 gh 모드에 넣는 안은 지금 어느 playbook도 릴리스를 쓰지 않아 미뤘다.
    - **[미확인]** 실제 세션에서 플러그인 훅이 로드되는가(이 리포에서 `--plugin-dir`로 띄워 보지 못했다. 판정은 표준 입력 JSON으로만 시험), 예약 작업(루틴) 세션에서 도는가.
  - 오탐 줄이기(autelon/company#28, 사용자 결정 2026-10-04): 웹 주소·HTTP 라우트 뒤의 홈 경로(호스트 글자나 `GET ` 같은 메서드가 앞에 있는 것)는 넘기고, 경로 맨 앞의 홈 경로는 막는다. 예시 UUID(nil, max, RFC 4122 예시, 흔한 문서 예시)는 넘긴다. 32자 해시는 Notion ID와 모양이 같아 그대로 막는다. 줄 단위 허용 표시는 남용하면 검사가 무력해져 두지 않았다. 알고 둔 한계: 홈 경로 바로 앞의 `.`도 경로 글자로 보고 넘기므로(웹 프로젝트의 `./home/...` import를 넘기려고), 상위 폴더(`..`)를 거쳐 홈 경로로 들어가는 상대 경로는 걸리지 않는다.
  - 패턴의 원본은 이 스크립트 하나다. director의 커밋 전 검사와 security-reviewer의 자동 검색도 이 스크립트를 부른다. 예전에는 같은 패턴이 두 곳에 복사돼 있었다.
  - 올라간 코멘트를 고쳐도 편집 이력이 남고, 저장소 읽기 권한이 있는 누구나 이력을 본다. 이력 삭제는 작성자·write 권한자가 웹에서만 한다. **[확인]** GitHub 문서 "Tracking changes in a comment". 이슈 본문도 편집 이력이 남는다 **[확인]** poker `userContentEdits`(autelon/company#30). 본문 이력을 보는 범위는 문서에 없어 코멘트와 같다고 본다 **[추정]**.
- **저장소를 지우지 않는다.** 저장소를 지우면 이슈와 코멘트가 사라진다. poker와 logistics-hub는 개인 정보 정리 때문에 삭제 후 재생성됐는데, 이 방식이었다면 기록이 사라졌을 것이다. 정리가 필요하면 사람에게 묻는다. 작업 단위 종료 때 이슈·코멘트·마일스톤·Project 항목을 `local/backup/`에 받는다(`plugin/playbooks/issues.md` 4절).
- PR 본문에 `Closes #N`을 쓰지 않는다. task는 사람의 승인 뒤 director가 닫는다.
- Wiki는 쓰지 않는다(전용 API 없음, PR 리뷰 불가, `docs/`와 겹침).
- 공개 범위: 프로젝트 저장소가 public이면 이슈도 공개된다. 이 기록들은 이미 git에 커밋돼 공개돼 있었으므로 이슈로 옮겨도 공개 범위는 같다. (사용자 판단 2026-10-04)

task 상태: `backlog → ready → in_progress → review → awaiting_approval → done` (+ `blocked`, `rejected`). Project `Status` 필드로 두고, done은 completed, rejected는 not planned로 닫는다. 반려는 닫은 뒤 Status를 `rejected`로 고친다. 기본 워크플로 Item closed는 트리거에 닫힘 사유를 고르는 칸이 없어 `done`으로 덮일 수 있다(autelon/company#31, 실제 반려 task로는 **[미확인]**).

## 3. 승인/개입 지점

1. **role 결과 승인/반려** (필수): role 결과 코멘트가 들어오면 director가 AskUserQuestion으로 묻는다. 답은 그 이슈의 결정 코멘트로 남고 본문 "현재 결론"이 바뀐다.
2. **role의 질문·결정 요청**: role은 결과 코멘트의 `사람에게 묻기`에 적고 종료한다. director가 모아서 묻는다.
3. **권한 요청**: Claude Code 기본 권한 프롬프트 → 폰 푸시.
4. **후속 액션 → 새 PRD**: director가 제안하고 사람이 동의한 것만 새 PRD 이슈로 만든다 (본문 `파생: #N`).
5. **PRD 섹션 승인**: role이 task 이슈에 쓴 초안을 사람이 승인하면 director가 PRD 본문에 반영하고, 승인한 내용을 PRD 이슈의 결정 코멘트에 그대로 남긴다. 본문은 나중에 바뀔 수 있어서 승인 시점의 내용은 코멘트가 기록이다.

## 4. 재무팀 (토큰 한도 관리)

- 사용량 출처
  - Desktop 앱: director가 `get_usage` (ccd_session_mgmt)를 호출한다. **[확인]** 이 세션에서 실제로 호출함
  - CLI: statusline JSON `rate_limits.five_hour/seven_day.used_percentage, resets_at`. **[확인]** 문서. 단 Desktop Code 탭에서 statusline 스크립트가 도는지는 **[미확인]** → 지금은 만들지 않음
- director는 `get_usage` 결과의 `plan` 객체를 가공 없이 `state/quota.json`에 저장한다. 숫자를 LLM이 옮겨 적지 않기 위해서다.
- 판정은 규칙 스크립트(`plugin/scripts/finance-check.mjs`, 프로젝트 루트에서 실행)로 한다. LLM은 정리 계획·보고만 맡는다.

| 5시간 사용률 | 신호                             | director 행동                                                                                             |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| < 70%        | `GO`                             | 정상 배정                                                                                                 |
| 70–85%       | `CAUTION`                        | 큰 task(예상 대형) 새로 시작 안 함, 작은 task만                                                           |
| ≥ 85%        | `WRAP_UP`                        | 새 task 금지. 진행 중 task는 결과 코멘트 남기고 마무리. finance가 재개 계획 작성. `resets_at`에 재개 예약 |
| 주간 ≥ 85%   | `weekly_low: true` (별도 플래그) | 최상위 모델 role(po, reviewer)은 판단 작업만, 나머지는 sonnet/haiku                                       |

- 재개 예약 방식: **[미확인]** 후보는 scheduled-tasks MCP, CronCreate. 구현할 때 확인한다.
- 한도를 실제로 넘었을 때 subagent/세션의 동작: **[미확인]** 일부러 재현하지 않는다. 처음 발생하면 현재 스프린트 이슈에 관찰 기록.

## 5. GitHub Project (사람이 보는 화면)

- **프로젝트마다 Project 하나.** 조직(`userConfig.github_org`) 소유로 만들고 그 저장소에 연결한다. 제목은 저장소 이름. (사용자 결정 2026-10-04)
  - 이유: 0절의 "프로젝트끼리 독립" 결정과 맞고, `Role` 단일 선택 필드의 값이 프로젝트마다 다르다(poker와 logistics-hub의 role 구성이 다름). 루트 세션은 Project 없이 `gh search issues --owner <조직>`으로 여러 저장소 이슈를 읽는다.
  - 버린 안: 조직 Project 하나에 모든 저장소. 루트 세션이 한 곳에서 볼 수 있지만 role 값이 섞이고 프로젝트 독립 원칙과 어긋난다.
- 필드: 기본 `Status`(task 상태), `Role`, `Size`(small/large), `Start date`, `Target date`. 화면: 표, Status별 보드, Role별 보드, 로드맵. 마일스톤은 저장소 단위라 저장소 사이에 공유하지 못한다.
- 설립·도입 스킬이 만든다. 명령은 `plugin/playbooks/issues.md` 2절.
- Notion 투영은 없앴다. Project의 표·보드·로드맵이 상태별·role별 보기를 맡는다. (사용자 결정 2026-10-04) 이유: 원본이 이슈로 바뀌면 notion-sync를 GitHub에서 읽도록 새로 써야 하고, 화면이 두 곳이 된다. Notion ID를 커밋하지 않으려고 둔 `notion/` gitignore 같은 장치도 필요 없어진다.
- 확인한 것 (GitHub 문서, 2026-10-04 조사): Projects는 항목 50,000개, 필드 50개까지. 조직 Project는 조직 저장소들의 이슈·PR을 담고, Project를 private으로 해도 항목은 원래 저장소 권한을 따른다. 내장 자동화(닫힘·머지 시 Status=Done, 자동 보관, 저장소에서 자동 추가). sub-issue는 부모당 100개·8단계, 의존 관계(blocked by/blocking)는 관계당 50개.
- poker 기록 이전(2026-10-04, autelon/company#30)에서 확인: Free 조직에서 조직 Project 생성·연결, `gh issue create --type/--project`, 이름으로 필드 고치기(`gh project item-edit --url --field --value`), GraphQL로 Status 선택지 바꾸기(id를 넘기면 이름만 바뀐다, autelon/company#31)와 화면 만들기. 보드 열 기준·로드맵 날짜 필드와 기본 워크플로는 API로 정할 수 없어 웹에서 한다. 이 웹 설정은 director가 브라우저 도구(사람의 로그인 세션)로 직접 하고, 도구가 없을 때만 사람에게 조작을 안내한다(사용자 결정 2026-10-04). 플러그인은 public이라 특정 사용자의 브라우저 스킬 이름에 기대지 않고 "있으면 쓴다"고만 적었다. 플러그인 기준 워크플로 값은 `plugin/playbooks/issues.md` 2절 표다(`Refs #N`만 쓰므로 PR 연결·머지 워크플로는 끈다).
- `Role` 필드에는 프로젝트 role과 `director`를 둔다. 결정·first-run·스프린트 이슈의 담당이 director라서다(poker에서 더함).
- **[미확인]** `gh issue create --parent/--blocked-by`의 실제 동작, `project` 권한 없이 `--project`가 되는가, id를 유지해 이름만 바꾼 Status 선택지를 기본 워크플로가 계속 가리키는가, 날짜 필드의 item-list 키. 다음 기록 이전(autelon/logistics-hub)에서 확인한다.
- `gh project`는 토큰에 `project` 권한이 필요하다. 지금 토큰에는 없다(2026-10-04 `gh auth status`). 추가는 `gh auth refresh -s project`(브라우저 승인)이고, 에이전트가 실행하고 사람이 승인한다.

## 6. PRD

PRD 하나 = Feature 이슈 하나. 본문 템플릿은 `plugin/templates/issues/prd.md`. 단계(draft/approved/in_dev/released/measured/closed)와 파생 관계는 본문 "현재 결론"에 둔다. 기능이 끝나면 오래 유지될 내용(도메인 규칙, API 계약, 데이터 구조)을 PR로 `docs/` 설계 문서에 반영하고 PRD 이슈를 닫는다. 섹션별 담당:

| 섹션          | 담당                                                           |
| ------------- | -------------------------------------------------------------- |
| 목표          | po                                                             |
| 성공지표      | po 제안 → strategist 검토 → da 측정 가능하게 (비즈니스 지표만) |
| 디자인 변경안 | designer                                                       |
| 개발사항      | developer                                                      |
| 결과          | developer + reviewer                                           |
| 성과측정 분석 | da 쿼리 실행·숫자 → po 해석                                    |
| 후속 액션     | po 제안 → 사람 합의 → 합의된 것만 새 PRD 이슈 + `파생: #N`     |

## 7. 남은 확인 항목

- [x] role 실제 호출 확인: 프로젝트 role은 `/reload-plugins` 뒤, 공용 role은 로드된 뒤 부를 수 있다 (2026-10-04 poker). 프로젝트별 짧은 점검은 `plugin/playbooks/first-run.md`
- [x] directory 소스 + 프로젝트 settings만으로 Desktop Code 세션에 로드되는가 → 안 됨 (2026-10-03 poker 관찰). GitHub 소스로 바꿈 (0절)
- [x] (user scope 설치로 바꿔 필요 없어짐) GitHub 소스 + 프로젝트 settings로 Desktop 세션에서 자동 설치되는가, 안 되면 `claude plugin install --scope project`가 필요한가 (poker). 문서상 프로젝트 settings에만 켜진 외부 소스 플러그인은 받지 않지만 상대 경로 소스는 예외다("A relative-path plugin needs no install record because it loads from the marketplace itself", plugins/loading). autelon은 상대 경로라 자동 설치를 기대할 근거가 있다
- [ ] 사용자 설정의 `autoUpdate: true`로 main 머지가 Desktop 세션에서 실제로 반영되는가. 수동 `claude plugin update`와 `/reload-plugins`로 반영되는 것은 확인함(버전이 main HEAD SHA 12자와 같음, 2026-10-04)
- [ ] 문서만 바꾼 머지도 새 버전을 만드는가
- [x] Desktop Code 세션에 플러그인이 로드되고 스킬 자동완성에 `autelon:*`가 보인다. + → Plugins 메뉴에는 나오지 않았다, 원인 **[미확인]** (2026-10-04 poker)
- [x] `defaultEnabled: false`를 프로젝트 settings의 `enabledPlugins: true`가 이기는가 → 이긴다 (2026-10-04)
- [x] `${user_config.*}`는 스킬 로드 때 치환되고 세션 중에 넣은 값은 `/reload-plugins`가 필요하다. `default`는 치환에 쓰이지 않았다 (2026-10-04 poker). 설정 창이 뜨는 때는 설치 때 "not yet set" 안내까지만 확인
- [x] 새 세션에 작업을 넘기는 방법: `mcp__ccd_session__spawn_task`. 칩이 뜨고 사람이 눌러야 세션이 생기며, `prompt`가 첫 메시지가 된다. `cwd`로 다른 프로젝트 폴더를 줄 수 있다 (2026-10-03 사용자 안내, poker 칩으로 확인)
  - 도구 설명은 "gets a fresh worktree"라고 하지만, `spawn_task` 세션은 worktree 없이 메인 checkout에서 열렸다. **[확인]** 2026-10-04
  - `start_session`·`hand_off_to_session`(사람 클릭 없이 세션 시작)은 Desktop 2.19675.0 코드에 있지만 서버 기능 플래그 `sideSessions`가 꺼져 있어 등록되지 않는다. 앱 캐시 `fcache`의 값은 `on:false, source:defaultValue`. 사용자 설정이나 settings.json으로 켤 수 없다 (2026-10-03 앱 코드 확인). 요청 이슈 anthropics/claude-code#89783 (열려 있음)
  - `claude://code/new?folder=…&q=…` 딥링크도 새 세션을 연다. 글은 입력창에 채워질 뿐 자동 전송되지 않고, 폴더는 매번 확인 창이 뜬다 (support.claude.com 문서)
- [x] `found-company` 스킬이 role 설계·상태 파일·Notion 생성·GitHub 저장소까지 해냈다 (poker). 개선점은 company#12
- [ ] 폰 푸시가 안 오는 회차의 원인: 4번째 시도에서 `/config inputNeededNotifEnabled=true`를 다시 실행한 뒤 푸시가 왔고 폰에서 고른 답이 세션에 들어왔다. 푸시는 데스크톱보다 늦게 오기도 했다. logistics-hub에서는 앱을 보고 있을 때 푸시가 억제됐다. poker의 이전 누락 원인은 **[미확인]**
- [ ] 재무 판정 스크립트 `finance-check.mjs`가 표준 입력으로 `get_usage` 결과를 받게 하기 (company#12 항목 10, 이 PR에서 구현하지 않음)
- [ ] 재개 예약 방식 (scheduled-tasks / CronCreate)
- [ ] Desktop Code 탭에서 statusline 동작 여부 (필요해질 때)
- [x] 성공지표·성과측정 = 비즈니스 관점, PRD마다 다름, 전체 목표에 연결 (사용자 결정 2026-10-03)
- [ ] 분석 데이터를 어디에 쌓을지 (da가 선택지 제시 → 사람 결정)
- [ ] subagent에 전역 CLAUDE.md가 로드되는지 (지금은 문제 아님)
- [x] `isolation: worktree`일 때 worktree 생성 위치: `.claude/worktrees/` (logistics-hub에서 실제로 생긴 위치로 확인)
- [ ] developer worktree: worktree 안에서 `local/comments/` 초안으로 task 이슈 코멘트를 올릴 수 있는지, `memory: project`의 `.claude/agent-memory/` 경로가 메인 checkout과 worktree 중 어디로 가는지 (첫 구현 task 때 director가 first-run 이슈의 미확인 항목으로 확인)
- [x] worktree를 쓰려면 첫 커밋이 있어야 함 (2026-10-03 첫 커밋 완료)
- [ ] 플러그인 PreToolUse 훅(`plugin/hooks/hooks.json`)이 실제 세션·subagent·예약 작업 세션에서 도는가 (autelon/company#29. 판정 로직은 테스트로 확인)
- [x] 이슈 작업 루프의 무인 실행 (autelon/company#25, 2026-10-04): 프로젝트 루트에서 플러그인 로드, `list_sessions`·`list_task_runs`(자기 실행 `running`)·`get_usage`·`set_session_title`, subagent, `gh` 확인. 실행 폴더는 예약 작업을 만든 세션의 폴더. 권한은 사용자 설정 `defaultMode`를 따르는 것으로 본다 **[추정]**. 결과 표는 `plugin/playbooks/routine.md` 끝
- [x] 실행이 겹칠 때 같은 예약 작업은 다음 주기를 건너뛰고 밀린 주기를 몰아서 실행하지 않는다 (2026-10-04 시험, company#22 코멘트). 지시문의 "이전 실행이 실행 중이면 끝낸다"는 이중 장치로 둔다
- [ ] 서로 다른 예약 작업끼리 동시에 도는가, 앱을 다시 켰을 때 밀린 실행을 몇 번 하는가
- [ ] subagent끼리 직접 통신이 되는가 (지금은 안 된다고 보고 메인을 거친다)
- [x] 이슈 기록 방식 시험 운영 (poker, 2026-10-04, autelon/company#30. 남은 [미확인]은 5절과 `plugin/playbooks/issues.md`): Free 조직 Project 가용성, `project` 권한 추가, 기본 Status 선택지·화면을 API로 만들 수 있는지, `gh issue create --type/--parent/--blocked-by/--project` 실제 동작, `gh project item-list` JSON의 필드 키, role(subagent)이 검사 스크립트로 코멘트를 올리는지, 백업 응답에 하위 이슈·의존 관계가 들어 있는지, 본문·코멘트 편집 이력의 공개 범위 (`plugin/playbooks/issues.md`의 **[미확인]**)
