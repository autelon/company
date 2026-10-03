# Git 규칙

이 프로젝트는 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`(Git·저장소 표준)를 따른다. 여기에는 이 프로젝트에서 정한 값만 적는다.

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

- `director`: director(메인 세션)가 리뷰하고 머지 명령을 낸다. 기본값이다.
- `reviewer role`: director가 `reviewer` role에 리뷰를 맡긴다. reviewer가 통과로 판정하면 그 판정을 PR 코멘트로 남기고, 같은 head sha에 보안 검토 통과가 있으면 머지 명령을 낸다.
- `사람`: 에이전트는 PR만 올리고 머지 명령을 내지 않는다. director가 사람에게 PR 링크를 알린다.

**보안 검토(항상):** 리뷰어가 누구든 모든 PR은 `autelon:security-reviewer`가 보안 검토를 한다(개인 경로, Notion 주소·ID, 비밀 값, 개인 정보, 위험한 CI·의존성 변경). 머지는 같은 head sha에 대해 리뷰 통과와 보안 검토 통과가 둘 다 있을 때만 한다.

리뷰어를 바꾸려면 이 절을 고치고 `decisions/log.md`에 남긴다. 보안 검토는 바꾸지 않는다.

## PR 절차

1. 작업 브랜치에서 커밋하고 PR을 올린다. 작업한 role이나 세션은 자기 PR을 머지하지 않는다.
2. 리뷰어는 리뷰 결과를 PR 코멘트로 남긴다. 계정이 하나라 GitHub 승인(approve)은 쓰지 않는다.
3. 머지 조건: 같은 head sha에 리뷰 통과 코멘트와 `보안 검토: 통과 (<sha>)` 코멘트가 둘 다 있어야 한다. 하나라도 없으면 머지 명령을 내지 않는다.
4. 리뷰어의 머지 명령: {{MERGE_COMMAND}}
   - `--match-head-commit <리뷰한 head sha>`를 붙인다. 리뷰 뒤에 브랜치가 바뀌었으면 머지되지 않는다.
   - `--admin`은 쓰지 않는다.
5. main보다 뒤처져 막히거나 충돌이 나면 rebase 한다: `git fetch origin && git rebase origin/main && git push --force-with-lease`
