# board 형식

`tasks.json`의 task 하나:

```json
{
  "id": "T-0001",
  "title": "족보 판정 함수 구현",
  "status": "ready",
  "role": "developer",
  "prd": "PRD-001",
  "milestone": "M-01",
  "depends_on": [],
  "size": "small",
  "handoff": "handoffs/T-0001.md",
  "updated_at": "2026-10-03T12:00:00Z",
  "notion_id": null,
  "last_synced": null
}
```

- status: backlog | ready | in_progress | review | awaiting_approval | done | blocked | rejected
- size: small | large (재무 신호 CAUTION이면 small만 시작)

`milestones.json`의 마일스톤 하나:

```json
{
  "id": "M-01",
  "title": "포커 족보 + 한 화면",
  "status": "active",
  "target": null,
  "updated_at": "...",
  "notion_id": null,
  "last_synced": null
}
```
