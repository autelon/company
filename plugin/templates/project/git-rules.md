# Git 규칙

공통 규칙은 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`를 따른다. 여기에는 이 프로젝트에서 정한 값만 적는다.

## 저장소

| 항목      | 값                                                                      |
| --------- | ----------------------------------------------------------------------- |
| GitHub    | `{{GITHUB_REPO}}` ({{VISIBILITY}})                                      |
| 최신화    | {{UPDATE_POLICY}}                                                       |
| 병합 방식 | merge commit                                                            |
| 필수 검사 | {{REQUIRED_CHECKS}}                                                     |
| 설정 확인 | `gh api repos/{{GITHUB_REPO}}`, `gh api repos/{{GITHUB_REPO}}/rulesets` |

## PR 리뷰어

리뷰어: **{{REVIEWER}}**

{{REVIEWER_MEANING}}

리뷰어를 바꾸려면 이 절을 고치고 `decisions/log.md`에 남긴다.

## 보안 검토

리뷰어가 누구든 모든 PR은 `autelon:security-reviewer`가 보안 검토를 한다(개인 경로, 임시 폴더 경로, 개인 이메일, Notion 주소·ID, 비밀 값, 위험한 CI·의존성 변경). 이 항목은 바꾸지 않는다.

## 머지 조건

같은 head sha에 리뷰 통과 코멘트와 `보안 검토: 통과 (<sha>)` 코멘트가 둘 다 있어야 한다. 하나라도 없으면 머지 명령을 내지 않는다.

## 머지 명령

```
{{MERGE_COMMAND}}
```

`--match-head-commit <리뷰한 head sha>`를 붙인다.
