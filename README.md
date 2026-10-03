# autelon

A Claude Code plugin for role-based multi-agent orchestration.
Each project lives in its own repository with its own roles, state files, and Notion databases; this repository only holds the shared operating model.

- `found-company` skill: sets up a project repo (designs roles, scaffolds board/PRD/decision files, creates the project's Notion page and databases).
- `director` skill: operating rules for the main session in a project.
- Shared roles: `finance` (token budget) and `notion-sync`.

Design notes (Korean): `docs/design.md`.

## Use in a project

Projects install the plugin from this GitHub repository (marketplace `autelon`, plugin `autelon`).
Add to the project's `.claude/settings.json` and commit it:

```json
{
  "extraKnownMarketplaces": {
    "autelon": { "source": { "source": "github", "repo": "autelon/company", "ref": "main" } }
  },
  "enabledPlugins": { "autelon@autelon": true }
}
```

Open a Claude Code session in the project folder, accept the workspace trust prompt, and check that the plugin is installed (`claude plugin list`, or the Installed tab of `/plugin`).
If it is not, install it from the project folder:

```bash
claude plugin marketplace add autelon/company
claude plugin install autelon@autelon --scope project
```

Then run the `autelon:found-company` skill.

## Updates

`plugin.json` has no `version`, so every commit on `main` is a new version.
Auto-update is off by default for third-party marketplaces; pull changes into a project with `claude plugin update autelon@autelon` (or `/plugin`).

## Developing the plugin

Changes reach projects only after they are merged to `main` and updated there.
To try local changes first, start Claude Code with `--plugin-dir ./plugin` from this repository.
