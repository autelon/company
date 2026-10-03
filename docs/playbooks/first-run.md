# 첫 실행 확인

새 director 세션이 처음 할 일. 지금까지 확인하지 못한 동작을 실제로 돌려 보고 결과를 `decisions/log.md`에 남긴다.
이 리포는 자동 테스트를 두지 않는 부분을 플레이북으로 확인한다. 결과에는 **실제로 본 것**만 적는다.

## 준비

- Desktop 앱에서 `~/dev/agent-company` 폴더로 새 Code 세션을 연다. (다른 폴더에서 시작한 세션은 이 리포의 role을 인식하지 못한다. 2026-10-03 확인)
- `/remote-control`을 켠다.

## 단계

1. **role 인식**: role 8개(po, strategist, designer, developer, reviewer, da, finance, notion-sync)를 subagent로 호출할 수 있는지 확인한다.
2. **finance 호출과 메모리**: `get_usage` → `state/quota.json` 저장 → `node scripts/finance-check.mjs` → finance를 task `T-SMOKE-1`로 호출해 handoff를 쓰게 하고, 메모리에 한 줄 남기게 한다.
   - 확인: `handoffs/T-SMOKE-1.md`가 생겼는가, `.claude/agent-memory/finance/MEMORY.md`가 생겼는가.
3. **notion-sync가 Notion 커넥터를 쓰는가**: 마일스톤 하나(`M-00`, "스모크 테스트")를 `board/milestones.json`에 넣고 notion-sync를 task `T-SMOKE-2`로 호출한다.
   - 확인: Notion Milestones DB에 생겼는가, handoff에 notion_id 표가 있는가. 확인 후 Notion에서 사람이 지운다.
4. **developer worktree**: 아직 코드가 없으므로 생략. 첫 구현 task 때 확인한다: handoff가 메인 checkout의 절대 경로에 생기는가, `.claude/agent-memory/developer/`가 어디에 생기는가.
5. 결과를 `decisions/log.md`에 적고 `docs/design.md` 7절의 해당 항목을 갱신한다. 스모크 handoff와 M-00은 지운다.
