# 첫 실행 확인

autelon으로 설립한 프로젝트에서 director가 처음 할 일. 지금까지 확인하지 못한 동작을 실제로 돌려 보고 결과를 `decisions/log.md`에 남긴다.
이 리포는 자동 테스트를 두지 않는 부분을 플레이북으로 확인한다. 결과에는 **실제로 본 것**만 적는다.

## 준비

- Desktop 앱에서 프로젝트 repo 폴더로 Code 세션을 연다. 프로젝트 `.claude/settings.json`이 `enabledPlugins`로 autelon 플러그인을 켜고, 사용자 설정에 GitHub 마켓플레이스(`autelon/company`)가 등록되고 플러그인이 user scope로 설치되어 있어야 한다. (다른 폴더에서 시작한 세션은 그 폴더의 role을 인식하지 못한다. 2026-10-03 확인)
- 플러그인이 설치됐는지 본다: `claude plugin list`에 `autelon@autelon`이 있고 켜져 있는가. 없으면 결과를 그대로 기록하고 사람에게 알린다. 설치는 사용자 설정(`~/.claude/plugins/`)을 바꾸므로 사람이 정한다. 방법은 플러그인 리포 README의 "Use in a project".
- `/remote-control`을 켠다. 아래 2단계의 폰 푸시는 Remote Control이 켜져 있어야 온다.
- `/config`에서 **Push when actions required**를 켠다. 폰에 Claude 앱이 같은 계정으로 로그인돼 있어야 한다.

## 단계

1. **role 인식**: 프로젝트 `.claude/agents/`의 role과 공용 role(`autelon:finance`, `autelon:notion-sync`)을 subagent로 호출할 수 있는지, `autelon:director`·`autelon:found-company` 스킬이 보이는지 확인한다.
2. **승인 루프 (핵심)**: director가 AskUserQuestion으로 아무 질문 하나를 한다 (예: "first-run 승인 루프 테스트: 계속할까요?"). 사람이 폰 푸시를 받아 폰에서 답한다.
   - 확인: 폰에 푸시가 왔는가, 폰에서 고른 답이 세션에 들어왔는가.
3. **finance 호출과 메모리**: `get_usage` → `state/quota.json` 저장 → 재무 판정 스크립트(경로는 director 스킬의 재무 규칙에 있다) → `autelon:finance`를 task `T-SMOKE-1`로 호출해 handoff를 쓰게 하고, 메모리에 한 줄 남기게 한다.
   - 확인: `handoffs/T-SMOKE-1.md`가 생겼는가, finance 메모리가 어디에 생겼는가 (프로젝트 `.claude/agent-memory/` 아래 어떤 이름의 폴더인지 그대로 적는다).
4. **notion-sync가 Notion 커넥터를 쓰는가**: 마일스톤 하나(`M-00`, "스모크 테스트")를 `board/milestones.json`에 넣고 `autelon:notion-sync`를 task `T-SMOKE-2`로 호출한다.
   - 확인: 프로젝트 Notion Milestones DB에 생겼는가, handoff에 notion_id 표가 있는가. 확인 후 Notion에서 사람이 지운다.
5. **developer worktree**: 아직 코드가 없으므로 생략. 첫 구현 task 때 확인한다: handoff가 메인 checkout의 절대 경로에 생기는가, `.claude/agent-memory/developer/`가 어디에 생기는가.
6. 결과를 프로젝트 `decisions/log.md`에 적는다. autelon/company 리포의 `docs/design.md` 7절 갱신은 사람에게 알려 autelon/company 쪽에서 한다. 스모크 handoff와 M-00은 지운다.
