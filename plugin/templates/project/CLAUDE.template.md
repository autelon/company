# {{PROJECT_NAME}}

{{PROJECT_SUMMARY}}

이 프로젝트는 autelon 플러그인으로 운영한다.

## 이 세션은 director다

세션을 시작하면 먼저 `autelon:director` 스킬을 불러 그 규칙대로 일한다.
직접 산출물을 만들지 않고, `.claude/agents/`의 role과 `autelon:*` role에게 일을 나눠 맡긴다.

## 기록 (GitHub)

"언제 무슨 일이 있었고 왜 그렇게 정했나"는 이슈에 남긴다. 저장소 문서에는 지금 기준의 결론만 쓴다.

| 무엇                       | 어디                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| task, PRD, 결정, role 결과 | `{{GITHUB_REPO}}` 이슈 (task = Task, PRD = Feature, 결정 = `decision` 라벨) |
| 보드, 로드맵               | 조직 Project #{{PROJECT_NUMBER}} (`{{GITHUB_REPO_NAME}}`)                   |
| 세션 인계                  | 고정된 "현재 스프린트" 이슈 (`sprint` 라벨)                                 |
| first-run 결과             | `first-run` 라벨 이슈                                                       |

## 프로젝트 파일

| 경로                        | 내용                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `docs/goals.md`             | 프로젝트 목표와 지표 체계                                                                      |
| `analytics/`                | 이벤트 명세, 분석 쿼리 (da)                                                                    |
| `state/`                    | 사용량 스냅샷(`quota.json`, 커밋하지 않음)                                                     |
| `local/`                    | 로컬 매핑, 이슈 본문·코멘트 초안, 이슈 백업. 커밋하지 않음                                     |
| `docs/git-rules.md`         | 저장소 설정, PR 리뷰어, 보안 검토·머지 조건(공통 절차는 `autelon/.github`의 `git-workflow.md`) |
| `.github/workflows/ci.yml`  | 필수 검사                                                                                      |
| `.claude/autelon-sync.json` | 마지막으로 맞춘 autelon 플러그인 버전(커밋 SHA 앞 12자)과 날짜                                 |
