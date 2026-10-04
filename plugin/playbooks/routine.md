# 루틴 등록 (프로젝트별 이슈 작업 루프)

프로젝트마다 로컬 예약 작업(루틴) 하나가 `agent:ready` 이슈를 읽고, 그 실행 세션 안의 subagent로 작업하고, 후속 일을 다시 이슈로 남긴다. 규칙은 director 스킬 "이슈 작업 루프", 지시문은 `templates/routine/prompt.md`, 설계 경위는 autelon/company#22.

등록은 그 프로젝트 폴더에서 연 director 세션이 사람과 함께 한다. 사람은 앱에서 실행 폴더를 정하고 주기를 고른다.

표기: **[확인]** 실행·문서·도구 설명으로 확인함 / **[미확인]** 시험 예약 작업으로 확인할 것

## 예약 작업에 대해 확인한 것 (scheduled-tasks 도구 설명 기준 **[확인]**)

- 앱이 열려 있을 때 로컬에서 돈다. 예정 시각에 앱이 닫혀 있으면 다음에 앱을 열 때 돈다.
- 실행 하나가 새 세션 하나다. 이전 대화를 기억하지 않으므로 지시문이 그것만으로 완결돼야 한다.
- 주기는 cron(로컬 시간대), 한 번은 `fireAt`, 둘 다 없으면 수동 실행(Run now)만.
- `list_task_runs`는 실행마다 `session_id`, `status`(`running`/`succeeded`/`failed`), 시작 시각, 한 줄 요약을 준다.
- 지시문은 사용자 Claude 설정 폴더의 scheduled-tasks 아래에 저장된다. 저장소에 커밋되지 않는다.
- `create_scheduled_task`에는 실행 폴더를 정하는 값이 없다. 실행 폴더는 사람이 앱에서 프로젝트 루트로 정한다.
- 무인 세션에서는 다른 세션에 메시지 보내기와 권한 모드 변경을 쓸 수 없다. `set_session_title`은 사람이 정한 제목이면 무인 세션에서 거절된다.

## 준비

1. 라벨 `agent:ready`, `agent:needs-user`가 있는지 본다(`gh label list -R <o>/<r>`). 없으면 `playbooks/issues.md` 2절대로 만든다.
2. 현재 스프린트 이슈(`sprint` 라벨)가 있는지 본다. 처리 요약이 이 이슈에 쌓인다.
3. 프로젝트 `docs/git-rules.md`에 PR 리뷰어가 정해져 있는지 본다. 루틴이 PR을 리뷰·머지할지가 이 값으로 정해진다.

## 등록

1. `templates/routine/prompt.md`를 프로젝트 `local/routine-prompt.md`로 복사하고 채운다: `{{REPO}}`(`<조직>/<저장소>`), `{{TASK_ID}}`(예: `<저장소>-issue-loop`). 맨 위 주석을 지운다. `local/`은 커밋하지 않는다.
2. 사람에게 지시문과 등록할 값(taskId, 제목, 주기)을 보여 주고 승인받는다. 주기는 사람이 정한다. 처음에는 주기 없이(수동 실행만) 등록하는 것을 권한다.
3. 승인되면 director가 `create_scheduled_task`로 등록한다: `taskId`, `title`, `description`, `prompt`(채운 지시문 전체), 승인받은 주기.
4. **사람이 앱에서 할 일**: 그 예약 작업의 실행 폴더를 프로젝트 루트로 정한다. 다른 폴더에서 돌면 프로젝트 settings의 플러그인과 프로젝트 role이 로드되지 않는다(`docs/design.md` 0절 관찰). 권한 모드를 앱에서 고를 수 있으면 고른다. **[미확인]** 예약 작업에 권한 모드를 따로 정할 수 있는가, 무인 실행에서 권한 요청이 오면 어떻게 되는가.
5. 사람이 앱에서 Run now로 한 번 돌린다. 시험용 이슈를 하나 `agent:ready`로 두면 루프 전체를 볼 수 있다.

## 확인

- `list_task_runs`로 실행 상태와 요약을 보고, 현재 스프린트 이슈의 처리 요약 코멘트를 읽는다.
- 처리 요약의 "확인하지 못한 도구 동작"을 보고, 지시문의 **[미확인]**을 확인되면 지운다. 안 되는 것이 있으면 지시문을 고치기 전에 사람에게 알린다.
- 확인한 뒤에 사람이 주기를 정하면 `update_scheduled_task`로 넣는다.

## 바꿀 때

- 지시문은 등록할 때 복사되므로 플러그인 업데이트로 바뀌지 않는다. `templates/routine/prompt.md`가 바뀌면 프로젝트마다 `local/routine-prompt.md`를 다시 채우고 `update_scheduled_task`로 바꾼다. 지시문이 부르는 director 스킬과 role은 플러그인 업데이트를 따른다.
- 멈출 때는 앱에서 끄거나 `update_scheduled_task`로 끈다. 지우는 것은 사람이 정한다.

## 시험 예약 작업으로 확인할 것 **[미확인]**

루프를 도입하기 전에 수동 실행용 시험 예약 작업으로 본다(autelon/company#22 할 일 4).

- 무인 실행에서 `list_sessions`·`list_task_runs`(세션 목록·이전 실행 조회)를 쓸 수 있는가, 실행 중인 자기 실행이 `list_task_runs`에 나오는가
- subagent(프로젝트 role, `autelon:*`)를 부를 수 있는가
- `gh`가 되는가(로그인, `--author @me`)
- `get_usage`, `set_session_title`을 쓸 수 있는가
- 권한 모드와 권한 요청 처리
- 프로젝트 폴더에서 플러그인이 로드되는가(`autelon:director`가 보이는가)
- 실행이 겹칠 때 앱이 다음 실행을 건너뛰는가(그래서 지시문에 "이전 실행이 실행 중이면 끝낸다"를 넣었다)
