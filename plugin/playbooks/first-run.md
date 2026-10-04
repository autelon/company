# 첫 실행 확인

autelon으로 설립하거나 도입한 프로젝트에서 director가 처음 할 일. 플러그인 자체의 동작(로드, 메모리 위치, 푸시 등)은 autelon/poker에서 확인을 끝냈다(`docs/design.md` 0절·7절). 여기서는 **이 프로젝트에서 연결이 제대로 됐는지**만 짧게 본다.
결과에는 **실제로 본 것**만 적는다. role에게 경로를 적게 할 때는 프로젝트 루트 기준 상대 경로로 받는다(코멘트 포함). 결과는 `first-run` 라벨 이슈(본문 템플릿 `templates/issues/first-run.md`)에 쓴다. 설립·도입 때 만들어 두지 않았으면 director가 지금 만든다. 결정 코멘트에는 쓰지 않는다. 결정 코멘트는 사람의 결정(질문과 답)만 담는다.

## 준비

- 프로젝트 repo 폴더에서 Code 세션을 연다(다른 폴더에서 시작한 세션은 그 폴더의 role을 인식하지 못한다).
- 이 세션에서 프로젝트 role(`.claude/agents/`)을 방금 만들었으면 사람에게 `/reload-plugins`를 입력해 달라고 요청한다. 내장 명령이라 Claude가 실행할 수 없다. reload 전에는 `Agent type '<role>' not found`가 난다.

## 확인

1. **플러그인과 role**: 프로젝트 `.claude/settings.json`의 `enabledPlugins`에 `autelon@autelon`이 켜져 있는지, 스킬·agent 목록에 autelon 스킬(`autelon:director`, `autelon:found-company`, `autelon:adopt-project`)과 프로젝트 role, 공용 role이 보이는지 본다. `claude plugin list`를 기본 확인으로 쓰지 않는다(Desktop 세션의 셸 PATH에 `claude`가 없을 수 있다). CLI가 꼭 필요하면 앱에 들어 있는 `claude` 바이너리의 전체 경로를 쓴다. 사용자는 CLI를 직접 입력하지 않는다.
   - 이슈·Project: `gh auth status`에 `project` 권한이 있는지, 프로젝트의 Project가 저장소에 연결돼 있는지(`gh project list --owner <조직>`), 라벨 `decision`·`sprint`·`first-run`과 고정된 현재 스프린트 이슈가 있는지 본다.
   - role 코멘트: 아무 role에게 first-run 이슈에 짧은 코멘트 하나를 검사 스크립트로 올리게 해서, role이 코멘트를 쓸 수 있는지 본다(이 확인에 한해 first-run 이슈를 그 role의 task 이슈로 본다).
2. **보안 검토**: 첫 PR이 생기면 `autelon:security-reviewer`를 그 PR에 호출할 수 있는지 본다. PR 코멘트가 기록이다.
3. **developer worktree**: 첫 구현 task 때 확인한다. worktree 안에서 `local/comments/`에 쓴 초안으로 task 이슈 코멘트를 올릴 수 있는가, `.claude/agent-memory/developer/`가 어디에 생기는가.

## 폰 푸시가 안 올 때 (선택)

데스크톱 Code 탭의 `/config`는 `key=value` 형식만 받는다.

- `/config inputNeededNotifEnabled=true`: Push when actions required
- `/config agentPushNotifEnabled=true`: Push when Claude decides

질문 전에 사람이 Desktop 앱을 벗어나 있어야 한다. 앱을 보고 있으면 푸시가 나가지 않는다(PushNotification이 "터미널이 활성 상태라 중복"으로 거절됨, logistics-hub 관찰). 앱을 벗어난 뒤에는 푸시가 오고 폰에서 고른 답이 세션에 들어왔다. 푸시는 데스크톱보다 늦게 올 수 있다. 오지 않으면 위 명령을 다시 실행하고, 폰 앱에서 그 세션을 한 번 연다. 폰에는 같은 계정으로 로그인한 Claude 앱과 켜진 Remote Control이 필요하다. 원인은 확인하지 못했다(`docs/design.md` 7절).

## 결과 기록

first-run 이슈 본문의 표에 날짜와 함께 항목마다 본 것을 적고, 확인한 내용을 코멘트로도 남긴다. 확인하지 못한 항목은 "미확인"으로 둔다. 미확인 항목(첫 PR의 보안 검토, 첫 구현 task의 developer worktree)은 그 시점에 director가 확인하고 본문을 고친다(director 스킬 "시작할 때" 3번). 모두 확인되면 이슈를 닫는다. 플러그인 쪽에서 고칠 점이 나오면 autelon/company에 이슈로 올린다.
