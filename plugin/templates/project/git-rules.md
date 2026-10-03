# Git 규칙

공통 규칙(브랜치 전략, main 보호, PR 절차, rebase, 승인 대신 코멘트, `--admin` 금지 등)은 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`를 따른다. 여기에는 이 프로젝트에서 정한 값만 적는다.

## 저장소

| 항목      | 값                                                                      |
| --------- | ----------------------------------------------------------------------- |
| GitHub    | `{{GITHUB_REPO}}` ({{VISIBILITY}})                                      |
| 최신화    | {{UPDATE_POLICY}}                                                       |
| 병합 방식 | merge commit                                                            |
| 필수 검사 | {{REQUIRED_CHECKS}}                                                     |
| 설정 확인 | `gh api repos/{{GITHUB_REPO}}`, `gh api repos/{{GITHUB_REPO}}/rulesets` |

## 리뷰와 머지

- PR 리뷰어: **{{REVIEWER}}**. {{REVIEWER_MEANING}}
- 보안 검토(항상): 리뷰어가 누구든 모든 PR은 `autelon:security-reviewer`가 검토하고 `보안 검토: 통과 (<sha>)` 또는 `보안 검토: 수정 필요 (<sha>)` 코멘트를 남긴다.
- 머지 조건: 같은 head sha에 리뷰 통과 코멘트와 `보안 검토: 통과 (<sha>)` 코멘트가 둘 다 있을 때만 리뷰어가 머지 명령을 낸다. 하나라도 없으면 내지 않는다.
- 머지 명령: {{MERGE_COMMAND}}

리뷰어를 바꾸려면 이 절을 고치고 `decisions/log.md`에 남긴다. 보안 검토는 바꾸지 않는다.
