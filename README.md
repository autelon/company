# agent-company

A Claude Code plugin for role-based multi-agent orchestration.
Each project lives in its own repository with its own roles, state files, and Notion databases; this repository only holds the shared operating model.

- `found-company` skill: sets up a project repo (designs roles, scaffolds board/PRD/decision files, creates the project's Notion page and databases).
- `director` skill: operating rules for the main session in a project.
- Shared roles: `finance` (token budget) and `notion-sync`.

Design notes (Korean): `docs/design.md`.

## Use in a project

Add to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "agent-company": { "source": { "source": "directory", "path": "/path/to/agent-company" } }
  },
  "enabledPlugins": { "agent-company@agent-company": true }
}
```

Open a Claude Code session in the project folder and run the `found-company` skill.
