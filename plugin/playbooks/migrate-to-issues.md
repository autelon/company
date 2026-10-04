# 기존 프로젝트의 기록을 이슈로 옮기기

이 플러그인 버전 전에 설립·도입한 프로젝트(board/, prds/, handoffs/, decisions/, state/sprint.md, docs/first-run.md를 쓰던 곳)를 GitHub 이슈와 Project로 옮기는 절차다. 이전은 그 프로젝트의 director 세션이 작업 단위 하나로 한다. poker에서 처음 시험했고(2026-10-04, autelon/company#30), logistics-hub에서 두 번째로 했다(2026-10-04, autelon/company#43·#44). 아직 확인하지 못한 것(`--parent`, 마일스톤, 부모 관계 백업)은 playbook의 **[미확인]** 표시를 보고 처음 쓸 때 확인한다.
명령은 `playbooks/issues.md`, 기록 위치는 director 스킬 "기록은 어디에 두는가"를 따른다. 이슈에 올리는 글은 모두 검사 스크립트를 거친다.

## 시작 전에

- **사람의 승인을 받는다.** 이슈는 한 번 만들면 지우기 어렵고(삭제는 되돌릴 수 없다), 코멘트는 바로 공개된다. 아래 "원래 파일 처리"의 선택지도 이때 함께 묻는다.
- 공개 범위: 옮기는 기록은 이미 저장소에 커밋돼 공개돼 있으므로, public 저장소의 이슈로 옮겨도 공개 범위는 같다(사용자 판단 2026-10-04). private 저장소면 이슈도 private이다.
- 권한: `gh auth status`에 `project` 권한이 있어야 한다(playbook 0절).
- 진행 중인 일을 마무리한다: 열린 PR, `in_progress` task, 승인 대기 handoff. 이전 중에 role을 부르지 않는다.
- API 한도: REST·GraphQL 각각 시간당 5,000. 이슈 하나에 생성, 코멘트 몇 개, Project 필드 서너 번이 든다. task·handoff·결정 행 수를 먼저 세고, 많으면 나눠서 한다.
- 대응표: 예전 ID(T-0001, PRD-001, M-01)와 새 이슈 번호의 대응을 `local/migration/ids.json`(커밋하지 않음)에 쌓는다. 본문·코멘트 속의 예전 ID를 이슈 번호로 바꿀 때 쓴다.

## 순서

1. **준비** (playbook 2절): 라벨, Project(필드 `Role`은 `director`와 프로젝트 role), Status 선택지(기본 선택지 셋은 id를 유지한 채 이름만 바꾼다), 화면(기본 "View 1"은 지운다). 보드 열 기준·로드맵 날짜 필드와 기본 워크플로는 API로 정할 수 없어 director가 브라우저 도구로 설정한다(playbook 2절 "웹 설정"). 새 Project가 켠 채로 시작하는 워크플로는 일정하지 않으므로, 만든 직후 GraphQL로 `enabled`를 읽고 기준표와 다른 것을 끄고 켠다(playbook 2절 "기본 워크플로"). Status 선택지를 바꾸기 전에 켜진 워크플로의 대상을 봐 두고, 바꾼 뒤 워크플로 화면에서 대상이 그대로인지 본다.
2. **마일스톤**: `board/milestones.json`의 항목마다 저장소 마일스톤을 만든다(제목 `M-01 <title>`, `target`이 있으면 `due_on`). done이면 마일스톤을 닫는다.
3. **PRD**: `prds/*.md`마다 Feature 이슈를 만든다. 본문은 `templates/issues/prd.md` 형식으로, 섹션은 원래 PRD 본문을 그대로 옮기고 "현재 결론"에 frontmatter `status`(단계)를 적는다. 마일스톤을 단다. 모두 만든 뒤 `derived_from`을 `파생: #N`으로 채운다. `closed`면 닫는다.
4. **task**: `board/tasks.json`의 task마다 Task 이슈를 만든다. 본문 `templates/issues/task.md`, "현재 결론"에 `예전 ID: T-0001`을 적는다. `--parent <PRD 이슈>`, 마일스톤, `depends_on` → `--blocked-by`. Project 필드 `Status`·`Role`·`Size`를 채운다. `done`은 `--reason completed`, `rejected`는 `--reason "not planned"`로 닫고 **닫은 뒤에** Status를 `rejected`로 고친다(Item closed 워크플로가 닫힘 사유를 가리지 않아 `done`으로 덮일 수 있다. playbook 3절 "닫기").
5. **handoff**: `handoffs/<task-id>.md`마다 그 task 이슈에 코멘트로 올린다. 첫 줄에 `예전 handoff: handoffs/T-0001.md (커밋 <짧은 sha>)`를 붙이고 본문은 그대로 둔다. 본문 속 예전 ID는 대응표로 `#N`을 덧붙인다(`T-0003 (#41)`). task가 없는 handoff(first-run, notion-sync 등)는 관련 이슈(first-run 이슈, 현재 스프린트 이슈)에 올린다.
6. **결정**: `decisions/log.md`(와 프로젝트의 결정 문서) 행마다, 대상이 task·PRD면 그 이슈에 결정 코멘트(`templates/issues/comment-decision.md`, 날짜는 원래 날짜)로 올린다. 대상이 없는 행은 결정 이슈로 만든다. 행이 많으면 주제별로 묶을지 사람에게 묻는다. 결정 이슈는 결론이 정해진 것이면 닫는다.
7. **로드맵**: 로드맵 문서의 단계·기한을 마일스톤과 Project `Start date`·`Target date`로 옮긴다. 로드맵 문서가 "지금 기준"으로 계속 읽히는 계획이면 사람에게 남길지 묻는다.
8. **first-run**: `docs/first-run.md`를 first-run 이슈 본문 표로 옮긴다. 모두 확인된 항목이면 닫는다.
9. **인계**: `state/sprint.md`를 현재 스프린트 이슈 본문으로 옮기고 고정한다.
10. **Notion**: notion-sync는 없어졌다. Notion 페이지·DB는 그대로 두고, 보관하거나 지울지는 사람이 정한다. 로컬 `notion/`은 gitignore된 채로 둔다.
11. **확인**: 개수를 맞춘다(task 수 = Task 이슈 수, handoff 파일 수 = 옮긴 코멘트 수, 결정 행 수 = 결정 코멘트 + 결정 이슈 수, `depends_on`·PRD 소속 수 = 백업 `relations.json`의 `blockedBy`·`parent` 수). 차이가 있으면 목록으로 보고한다. security-reviewer에게 이전 시작 시각부터의 이슈·코멘트 검토를 맡기고, 백업한다(playbook 4절, 관계 목록 `relations.json` 포함).
12. **저장소 정리 PR**: 아래 선택지대로 원래 파일을 처리하고, `CLAUDE.md`를 `templates/project/CLAUDE.template.md`의 "기록 (GitHub)" 표 형식으로 고친다. 같은 PR에서 role 파일도 고친다. PR 절차와 보안 검토는 평소와 같다.
    - **role 출력 규칙**: `.claude/agents/*.md`의 "출력" 절을 플러그인 `templates/roles/<role>.md`와 줄 단위로 맞춘다("결과는 자기 task 이슈에 코멘트로만 올린다", "Bash는 검사 스크립트로 코멘트를 올릴 때와 지시받은 작업에만 쓴다" 등). 예전 role 파일에는 handoff 파일에 쓰라는 규칙이 남아 있다. 템플릿에 없는 프로젝트 role(도메인 전문가 등)은 가장 가까운 템플릿의 출력 절을 쓴다. poker는 문장 하나(designer의 PRD 디자인 변경안 초안)를 빠뜨려 리뷰에서 되돌아왔다.
    - **role `tools:`**: 결과 코멘트를 올리는 모든 role의 `tools:`에 `Bash`가 있어야 한다. 없으면 검사 스크립트를 실행할 수 없다(poker는 role 4개에 없었다).
    - **예전 기록을 가리키는 줄**: `git grep -n -E 'decisions/log\.md|board/|handoffs/|prds/|state/sprint\.md|docs/first-run\.md'`로 모두 찾는다. role 파일의 전제 문서 줄, 작업 방식 문서(`.claude/agents/*.md`, 프로젝트 `docs/`의 agent 작업 방식)가 대상이다. 결정 기록은 결정 이슈(`--label decision`)로, 나머지는 해당 이슈·라벨로 바꾼다.

예전 저장소·PR 번호를 옮길 때 `#N`은 지금 저장소의 이슈·PR로 자동 링크된다. 지금 저장소의 것이 아니면 `#` 없이 쓰거나("PR 1번(지운 저장소)") 다른 저장소면 `autelon/<저장소>#N`으로 쓴다.

검사 스크립트에 걸리면 원래 파일에도 같은 값이 커밋돼 있다는 뜻이다. 이슈에는 값을 가리고 올리고, 저장소 히스토리 쪽 정리는 사람에게 보고한다(저장소를 지우는 방식은 쓰지 않는다. 이슈가 함께 사라진다).

## 원래 파일 처리 (사람이 정한다)

| 선택지                                                  | 결과                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A. 지우고 `CLAUDE.md`에 이슈로 옮겼다고 적는다          | agent가 옛 파일을 읽을 일이 없다. 원래 내용은 git 히스토리와 이슈에 남는다. 파일 경로로 걸린 옛 링크는 히스토리에서만 열린다 |
| B. 그대로 두고 파일 맨 위에 "이슈로 옮김, #N" 을 적는다 | 저장소에서 바로 열린다. 같은 기록이 두 곳에 있어 한쪽만 고쳐질 수 있고, agent가 옛 파일을 원본으로 읽을 위험이 있다          |
| C. `docs/archive/`로 옮긴다                             | B와 같고 경로만 분리된다. 옛 링크는 깨진다                                                                                   |
