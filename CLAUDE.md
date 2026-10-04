# autelon

role 단위 멀티 에이전트 오케스트레이션을 Claude Code 플러그인으로 만드는 리포. GitHub `autelon/company`. 플러그인·마켓플레이스 이름은 `autelon`이라 스킬과 공용 role은 `autelon:<이름>`으로 부른다. 설계는 `docs/design.md`. 이 리포의 결정 기록은 이슈다: 어느 이슈에도 속하지 않는 결정은 `decision` 라벨 이슈, 이슈에서 나온 결정은 그 이슈의 결정 코멘트(`gh issue list -R autelon/company --label decision --state all`).

이 리포는 "회사의 운영 방식"만 담는다. 실제 프로젝트는 각자 별도 repo이고, 그 repo에서 이 플러그인을 켜서 쓴다.
프로젝트끼리는 role, repo, 이슈, Project가 모두 독립이다. 프로젝트의 기록(task, PRD, 결정, 인계)은 그 저장소의 GitHub 이슈와 Project에 두고, 저장소에는 "지금 기준" 문서만 둔다.

## 구조

| 경로                                    | 내용                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.claude-plugin/marketplace.json`       | 이 리포를 로컬 마켓플레이스로 등록할 때 쓰는 목록                                                   |
| `plugin/`                               | 플러그인 본체                                                                                       |
| `plugin/skills/found-company/`          | 프로젝트 설립: role 설계, 기준 문서, GitHub 저장소, 이슈 라벨·Project·스프린트 이슈                 |
| `plugin/skills/adopt-project/`          | 기존 프로젝트 도입: 기존 문서 유지, 도메인 전문가 role, 작업 방식 비교                              |
| `plugin/skills/director/`               | director 운영 규칙 (프로젝트 CLAUDE.md가 세션 시작 시 부른다)                                       |
| `plugin/agents/`                        | 모든 프로젝트가 같이 쓰는 공용 role: finance, security-reviewer(모든 PR·작업 단위별 이슈 보안 검토) |
| `plugin/templates/roles/`               | 프로젝트 role의 기본 템플릿. 설립 때 프로젝트에 맞게 고쳐서 복사된다                                |
| `plugin/templates/project/`             | 프로젝트 저장소 파일 템플릿(CLAUDE.md, goals, git-rules, CI, gitignore)                             |
| `plugin/templates/issues/`              | 이슈 본문(task, PRD, 결정, 스프린트, first-run)과 코멘트(role 결과, 결정) 템플릿                    |
| `plugin/scripts/finance-check.mjs`      | 재무 신호 판정                                                                                      |
| `plugin/scripts/privacy-check.mjs`      | 개인 정보·비밀 값 검사(패턴의 원본). 이슈·PR 글은 이 스크립트의 `gh` 모드로만 올린다                |
| `plugin/hooks/hooks.json`               | PreToolUse 훅: 검사 스크립트를 거치지 않은 gh 글쓰기를 막는다(판정은 `privacy-check.mjs hook`)      |
| `plugin/playbooks/first-run.md`         | 설립·도입한 프로젝트에서 처음 확인할 짧은 점검 (결과는 프로젝트의 `first-run` 이슈)                 |
| `plugin/playbooks/issues.md`            | 이슈·Project·마일스톤·백업 명령 모음                                                                |
| `plugin/playbooks/migrate-to-issues.md` | 예전 파일 기록(board 등)을 쓰던 프로젝트를 이슈로 옮기는 절차                                       |
| `plugin/playbooks/routine.md`           | 이슈 작업 루프: 프로젝트별 로컬 예약 작업(루틴) 등록·확인 절차                                      |
| `plugin/templates/routine/`             | 루틴 지시문 템플릿(프로젝트마다 채워 예약 작업 prompt로 등록)                                       |
| `.github/workflows/ci.yml`              | 필수 검사 `check`(커밋 메시지·Prettier·스크립트 테스트)와 조직 `git-policy`                         |
| `scripts/check-commits.sh`              | PR 범위의 커밋 메시지를 `commit-msg` 훅으로 검사                                                    |
| `.claude/agents/`                       | company 전용 role: plugin-developer, reviewer, verifier(읽기 기반 모의 실행). 이 리포에서만 쓴다    |
| `docs/routine-prompt.md`                | company 루틴(이슈 작업 루프) 지시문 원본. 채운 사본은 `local/routine-prompt.md`                     |

## 고칠 때 주의

- 스킬·agent 본문의 `${CLAUDE_PLUGIN_ROOT}`, `${user_config.*}`는 로드될 때 치환된다. 스킬이 읽으라고 넘기는 일반 md 파일(playbook, 템플릿) 안에서는 치환되지 않는다.
- 플러그인 agent에서 `permissionMode`, `hooks`, `mcpServers`는 무시된다.
- 플러그인 루트의 CLAUDE.md는 로드되지 않는다. 프로젝트 CLAUDE.md 템플릿은 `CLAUDE.template.md`라는 이름으로 둔다 (이 리포에서 작업할 때 중첩 CLAUDE.md로 로드되지 않게).
- 프로젝트는 이 플러그인을 GitHub `autelon/company`의 main에서 설치한다. 마켓플레이스 등록, `autoUpdate: true`, user scope 설치(`enabledPlugins` false)는 사용자 설정(user settings)에, 프로젝트 settings에는 `"autelon@autelon": true`만 둔다(design.md 0절). 여기서 고친 내용은 main에 머지되면 백그라운드 자동 업데이트로 받아지고, 다음 세션(또는 `/reload-plugins`)부터 반영된다. 바로 받으려면 `claude plugin update autelon@autelon`. `plugin.json`에 `version`을 두지 않아 main 커밋마다 새 버전이 된다. 머지 전에 확인하려면 이 리포에서 `--plugin-dir ./plugin`으로 띄운다.

## 경로 표기

커밋되는 파일에서 경로는 repo 루트 기준 상대 경로로 쓴다. repo 밖의 것은 저장소나 문서 이름으로 가리킨다(예: 조직 `.github` 저장소의 `git-workflow.md`, `scripts/setup-repo.sh`). 절대 경로와 홈 기준 경로(`~/...`)는 쓰지 않는다. 표준 문서의 로컬 클론이 없으면 `gh repo clone <조직>/.github`로 임시 폴더에 받는다.

## Git

커밋 전에 `docs/git-rules.md`를 읽는다. main 에는 PR 로만 들어가고, 리뷰어와 머지 절차도 그 문서에 있다. `commit-msg` 훅이 형식을 검사하고, `pre-commit` 훅이 Prettier로 스테이징 파일을 맞춘다.
파일을 고친 뒤 `pnpm check`(Prettier 검사와 `plugin/scripts/*.test.mjs`)를 돌린다. 도구 버전은 mise가 고정한다 (`mise exec --`).

`README.md`만 사람이 읽는 문서라 영어로 쓴다. 나머지 문서·주석·커밋은 한국어다.

## 이슈 작업 루프 (company 루틴)

이 리포도 이슈로 일한다. `agent:ready`가 붙은 이슈를 company 루틴(로컬 예약 작업, 실행 폴더 = 이 리포 루트)이 처리한다. 지시문은 `docs/routine-prompt.md`, 설계 경위는 autelon/company#34.

- 플러그인은 꺼 둔다. 그래서 director 스킬·`autelon:*` role·플러그인 훅 대신 `.claude/agents/`의 company role과 지시문의 규칙을 쓴다. 보안 검토는 `plugin/agents/security-reviewer.md` 본문을 지시문으로 준다.
- 프로젝트 director도 이 리포 이슈에 `agent:ready`를 붙일 수 있다. 그래서 한 프로젝트의 사정만으로 공통 규칙을 바꾸지 않고, BREAKING 변경은 PR까지만 올리고 `agent:needs-user`로 사람이 머지를 정한다.
- 루틴은 머지까지만 한다. 머지된 변경은 자동 업데이트로 각 프로젝트에 갈 수 있으므로(위 "고칠 때 주의", Desktop 세션에서 동작하는지는 design.md 7절 [미확인]) 머지가 마지막 관문이다. 루틴은 `claude plugin update`를 하지 않고, 루트 세션이 머지된 PR과 이슈의 `[루틴] 처리 요약` 코멘트를 읽고 이 기기의 바로 업데이트와 프로젝트별 후속 일(복사된 파일 고치기, 루틴 지시문 재등록)을 정한다.
- 지시문을 고치면 채운 사본을 다시 만들고 `update_scheduled_task`로 바꾼다(지시문은 등록할 때 복사된다).
