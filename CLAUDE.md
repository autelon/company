# autelon

role 단위 멀티 에이전트 오케스트레이션을 Claude Code 플러그인으로 만드는 리포. GitHub `autelon/company`, 로컬 `~/dev/autelon/company`. 플러그인·마켓플레이스 이름은 `autelon`이라 스킬과 공용 role은 `autelon:<이름>`으로 부른다. 설계는 `docs/design.md`, 결정 기록은 `docs/decisions.md`.

이 리포는 "회사의 운영 방식"만 담는다. 실제 프로젝트는 각자 별도 repo이고, 그 repo에서 이 플러그인을 켜서 쓴다.
프로젝트끼리는 role, 상태 파일, Notion DB, repo가 모두 독립이다.

## 구조

| 경로                               | 내용                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `.claude-plugin/marketplace.json`  | 이 리포를 로컬 마켓플레이스로 등록할 때 쓰는 목록                    |
| `plugin/`                          | 플러그인 본체                                                        |
| `plugin/skills/found-company/`     | 프로젝트 설립: role 설계, 상태 파일, Notion 페이지·DB, GitHub 저장소 |
| `plugin/skills/director/`          | director 운영 규칙 (프로젝트 CLAUDE.md가 세션 시작 시 부른다)        |
| `plugin/agents/`                   | 모든 프로젝트가 같이 쓰는 공용 role: finance, notion-sync            |
| `plugin/templates/roles/`          | 프로젝트 role의 기본 템플릿. 설립 때 프로젝트에 맞게 고쳐서 복사된다 |
| `plugin/templates/project/`        | 프로젝트 상태 파일 템플릿                                            |
| `plugin/scripts/finance-check.mjs` | 재무 신호 판정                                                       |
| `plugin/playbooks/first-run.md`    | 설립한 프로젝트에서 처음 확인할 것                                   |
| `.github/workflows/ci.yml`         | 필수 검사 `check`(커밋 메시지·Prettier)와 조직 `git-policy`          |
| `scripts/check-commits.sh`         | PR 범위의 커밋 메시지를 `commit-msg` 훅으로 검사                     |

## 고칠 때 주의

- 스킬·agent 본문의 `${CLAUDE_PLUGIN_ROOT}`, `${user_config.*}`는 로드될 때 치환된다. 스킬이 읽으라고 넘기는 일반 md 파일(playbook, 템플릿) 안에서는 치환되지 않는다.
- 플러그인 agent에서 `permissionMode`, `hooks`, `mcpServers`는 무시된다.
- 플러그인 루트의 CLAUDE.md는 로드되지 않는다. 프로젝트 CLAUDE.md 템플릿은 `CLAUDE.template.md`라는 이름으로 둔다 (이 리포에서 작업할 때 중첩 CLAUDE.md로 로드되지 않게).
- 프로젝트는 이 플러그인을 GitHub `autelon/company`의 main에서 설치한다. 마켓플레이스 등록, `autoUpdate: true`, user scope 설치(`enabledPlugins` false)는 사용자 설정(`~/.claude/settings.json`)에, 프로젝트 settings에는 `"autelon@autelon": true`만 둔다(design.md 0절). 여기서 고친 내용은 main에 머지되면 백그라운드 자동 업데이트로 받아지고, 다음 세션(또는 `/reload-plugins`)부터 반영된다. 바로 받으려면 `claude plugin update autelon@autelon`. `plugin.json`에 `version`을 두지 않아 main 커밋마다 새 버전이 된다. 머지 전에 확인하려면 이 리포에서 `--plugin-dir ./plugin`으로 띄운다.

## Git

커밋 전에 `docs/git-rules.md`를 읽는다. main 에는 PR 로만 들어가고, 리뷰어와 머지 절차도 그 문서에 있다. `commit-msg` 훅이 형식을 검사하고, `pre-commit` 훅이 Prettier로 스테이징 파일을 맞춘다.
파일을 고친 뒤 `pnpm check`(Prettier 검사)를 돌린다. 도구 버전은 mise가 고정한다 (`mise exec --`).

`README.md`만 사람이 읽는 문서라 영어로 쓴다. 나머지 문서·주석·커밋은 한국어다.
