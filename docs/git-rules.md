# Git 규칙

이 리포의 히스토리는 **나중에 이 코드를 고칠 에이전트가 읽는 자료**다.
그 에이전트는 지금의 대화, 머릿속 맥락, 리뷰 중 오간 말을 볼 수 없다. 볼 수 있는 것은 코드, `docs/`, 그리고 커밋 메시지뿐이다.
그래서 규칙의 기준은 하나다: **diff 로 알 수 없는 것을 메시지에 남긴다.**

## 커밋 메시지

```
<type>(<scope>): <무엇이 달라졌는지 한 줄>

왜: 이 변경이 필요했던 이유. 어떤 문제·요구·사실 때문인가.
결정: 고른 방식과 그 이유. 검토하고 버린 대안이 있으면 왜 버렸는지.
검증: 실제로 돌려서 확인한 것 (명령과 결과).
미검증: 확인하지 못한 것, 알고도 남긴 한계. 없으면 생략.

Refs: docs/design.md
```

### 제목 줄

- 형식은 `type(scope): 요약`, 72자 이내. `commit-msg` 훅이 검사한다.
- **type**: `feat` 동작 추가 · `fix` 잘못된 동작 수정 · `refactor` 동작 변화 없는 구조 변경 · `perf` · `test` · `docs` · `build` 의존성·빌드·도구 · `ci` · `chore` 그 외
- **scope**: 바뀐 영역 — `skills`(`plugin/skills/`) `agents`(`plugin/agents/`, 공용 role) `templates`(`plugin/templates/`) `playbooks`(`plugin/playbooks/`) `scripts`(`plugin/scripts/`) `plugin`(`plugin/.claude-plugin/`, `.claude-plugin/` 매니페스트) `docs` `ci`(`.github/`). 리포 전역 설정은 `repo`. 여러 개면 쉼표로 (`skills,templates`).
- 요약은 **동작이나 결과**로 쓴다. "units.service 수정"이 아니라 "배송 완료 이벤트에 출고 때의 주문 참조를 이어 붙임".
- 기존 프로젝트가 옮겨야 하는 변경이면 `!` 를 붙이고, 본문에 `BREAKING:` 으로 프로젝트마다 무엇을 고쳐야 하는지 적는다. 파일 형식(이슈 본문·코멘트 템플릿 형식 포함)이나 프로젝트가 부르는 이름(플러그인·스킬·role 이름)을 호환되지 않게 바꾸는 것, 프로젝트에 복사된 role·템플릿·문서나 등록된 루틴 지시문과 어긋나는 규칙 변경이 해당한다(autelon/company#34).

### 본문

- `feat` `fix` `refactor` `perf` 는 본문이 필수다 (훅이 검사). 나머지도 이유가 자명하지 않으면 쓴다.
- **diff 를 말로 옮기지 않는다.** 어떤 파일의 어떤 줄이 바뀌었는지는 diff 가 정확히 말해 준다.
- **왜** 가 가장 중요하다. 나중의 에이전트는 "이 코드를 지워도 되는가, 바꿔도 되는가"를 판단하려고 이 커밋을 찾아온다.
  그 판단에 필요한 것: 어떤 상황을 막으려던 것인지, 어떤 제약 때문에 이 모양인지.
- **버린 대안을 남긴다.** 안 그러면 다음 에이전트가 같은 대안을 다시 시도한다.
  예: "Notion 을 원본으로 두지 않음. 양방향 동기화의 충돌 처리가 프로젝트보다 커짐."
- **검증과 미검증을 구분해서 사실대로 쓴다.** "role 을 실제로 호출해 handoff 생성 확인"과 "frontmatter 문법만 확인"은 다음 사람에게 전혀 다른 정보다.
- **메시지만으로 이해되게 쓴다.** "위에서 말한 대로", "리뷰 반영", "요청에 따라" 같은, 지금 대화를 알아야 뜻이 통하는 표현을 쓰지 않는다. 요청이 있었다면 그 요청의 내용을 적는다.
- 오래 유지되는 근거는 링크한다: `docs/` 문서, 이슈, 외부 문서 URL. 채팅 링크는 근거가 아니다.
- 한국어로 쓴다. 식별자·명령·type·scope 는 원문 그대로.

### 작성자

git 은 작성자(author)와 커밋한 사람(committer)을 따로 기록한다. 이 둘로 "누가 만들었나"와 "누구 계정으로 들어갔나"를 구분한다.

- **에이전트가 만든 커밋은 에이전트가 author 다.** 이름은 실제로 작업한 모델명을 쓴다.
  `git commit --author="Claude Fable 5.1 <noreply@anthropic.com>" ...`
- committer 는 바꾸지 않는다. git 설정의 사용자, 즉 그 커밋을 자기 계정으로 넣은 사람이 남는다.
- **사용자가 작업에 관여했으면 공동 작성자로 넣는다.** 방향이나 설계를 정했거나, 중간에 결정을 내렸거나, 직접 코드를 고친 경우다.
  메시지 끝에 `Co-Authored-By: <git config user.name> <git config user.email>` 을 붙인다.
- 사용자가 과제만 맡기고 내용에 관여하지 않았으면 트레일러 없이 에이전트만 author 로 둔다.
- 사람이 직접 만든 커밋은 평소대로 본인이 author 다. 에이전트의 도움을 받았으면 `Co-Authored-By: <모델명> <noreply@anthropic.com>` 을 붙인다.

나중에 `git log --author=Claude` 로 에이전트가 만든 변경만, `git log --grep='Co-Authored-By: '` 로 함께 만든 변경을 골라 볼 수 있다.

### 커밋 단위

- **논리적 변경 하나가 커밋 하나.** 리팩터링과 동작 변경을 섞지 않는다. 섞이면 "왜"가 둘이 되어 어느 줄이 어느 이유 때문인지 알 수 없다.
- **각 커밋에서 `pnpm check` 가 통과해야 한다.** `git bisect` 로 원인을 찾을 수 있어야 한다.
- 함께 가야 뜻이 통하는 것은 같은 커밋에 넣는다:
  - 파일 형식 변경과 그 형식을 쓰는 role 정의·director 규칙·템플릿의 수정
  - 운영 규칙 변경과 `docs/design.md` 의 해당 설명
- `docs/` 는 **지금 어떻게 되어 있는지**를, 커밋은 **왜 그렇게 바뀌었는지**를 담는다. 같은 내용을 양쪽에 복사하지 않는다.

## 원격과 PR

이 리포는 조직 `.github` 저장소(`autelon/.github`)의 `git-workflow.md`(Git·저장소 표준)를 따른다. 여기에는 이 리포에서 정한 값만 적는다.

| 항목      | 값                                                                      |
| --------- | ----------------------------------------------------------------------- |
| GitHub    | `autelon/company` (public)                                              |
| 최신화    | 머지 큐                                                                 |
| 병합 방식 | merge commit                                                            |
| 필수 검사 | `check`, `git-policy / merge-commits` (`.github/workflows/ci.yml`)      |
| 설정 확인 | `gh api repos/autelon/company`, `gh api repos/autelon/company/rulesets` |

- main 에는 PR 로만 들어간다. 작업 브랜치에서 커밋하고 PR 을 올린다. main 을 작업 브랜치로 merge 하지 않고 rebase 만 쓴다.
- 저장소 설정과 main 규칙은 조직 `.github` 저장소의 `scripts/setup-repo.sh` 로 적용한다. 바꿀 때는 바뀔 값을 사용자에게 보여 주고 승인받는다.

### 리뷰어

- **기본 리뷰어는 메인 에이전트다.** 서브에이전트나 다른 세션이 작업해 PR 을 올리면, 메인 에이전트가 리뷰하고 머지 명령을 낸다.
- **메인 에이전트가 직접 작업한 PR 은 별도 리뷰어 에이전트에게 맡긴다.** 작업자와 리뷰어가 같으면 안 된다. 메인 에이전트가 판단해 다른 PR 도 리뷰어 에이전트에게 맡길 수 있다. 그때는 리뷰어 에이전트가 머지 명령을 낸다.
- 사용자가 "이 PR 은 내가 리뷰한다"고 하면 리뷰어는 사용자다. 에이전트는 그 PR 의 머지 명령을 내지 않는다.
- 리뷰 결과는 PR 코멘트로 남긴다. 계정이 하나라 GitHub 승인(approve)은 쓰지 않는다.
- 리뷰어 에이전트는 company role `reviewer`(`.claude/agents/reviewer.md`), 검증은 `verifier`(읽기 기반 모의 실행)다. role을 만든 세션에서는 이름으로 부를 수 없으면 일반 에이전트에게 그 파일 본문을 지시문으로 준다. 리뷰 판정 첫 줄은 `리뷰: 통과 (<sha>)` 또는 `리뷰: 수정 필요 (<sha>)`다.
- BREAKING PR은 리뷰·보안 검토·검증을 통과해도 사람이 머지를 정하기 전에는 머지 명령을 내지 않는다(autelon/company#34).
- **보안 검토는 리뷰어와 별도로 모든 PR에 항상 한다.** 이 리포는 플러그인을 켜지 않으므로 `autelon:security-reviewer`를 이름으로 부를 수 없다. 대신 별도 에이전트에게 `plugin/agents/security-reviewer.md` 본문을 지시문으로 주고 PR 번호를 넘긴다. 머지 조건은 아래 "머지 명령"이다.

### 머지 명령

머지 조건: 같은 head sha에 리뷰 통과 코멘트와 `보안 검토: 통과 (<sha>)` 코멘트가 둘 다 있어야 한다. `plugin/` 아래 동작(스킬, role, 템플릿, playbook, 훅, 스크립트)을 바꾸는 PR은 `검증: 통과 (<sha>)` 코멘트도 있어야 한다. 하나라도 없으면 머지 명령을 내지 않는다.

```
gh pr merge <PR> --match-head-commit <리뷰한 head sha>
```

- 필수 검사가 진행 중이면 auto-merge 가 켜지고, 통과했으면 머지 큐에 들어간다. `--match-head-commit` 때문에 리뷰 뒤에 브랜치가 바뀌었으면 머지되지 않는다.
- `--admin` 은 쓰지 않는다.
- main 보다 뒤처져 막히거나 충돌이 나면 `git fetch origin && git rebase origin/main && git push --force-with-lease` 로 다시 올린다. `--force` 는 쓰지 않는다.

## 히스토리 조사

코드를 바꾸기 전에, 그 코드가 왜 그 모양인지부터 확인한다.

| 알고 싶은 것                     | 명령                                                  |
| -------------------------------- | ----------------------------------------------------- |
| 이 줄이 왜 이렇게 됐나           | `git blame -L <시작>,<끝> <파일>` → `git show <커밋>` |
| 이 함수가 어떻게 변해 왔나       | `git log -L :<함수명>:<파일>`                         |
| 이 식별자가 언제 생기고 사라졌나 | `git log -S '<문자열>' --oneline`                     |
| 한 role 정의의 변경 이력         | `git log --oneline -- plugin/templates/roles/po.md`   |
| 형식을 깬 변경                   | `git log --grep='BREAKING:'`                          |
| 특정 종류의 변경                 | `git log --grep='^feat(agents)'`                      |
