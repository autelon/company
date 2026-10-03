# autelon

A Claude Code plugin for role-based multi-agent orchestration.
Each project lives in its own repository with its own roles, state files, and Notion databases; this repository only holds the shared operating model.

- `found-company` skill: sets up a project repo (designs roles, scaffolds board/PRD/decision files, creates the project's Notion page and databases).
- `director` skill: operating rules for the main session in a project.
- Shared roles: `finance` (token budget) and `notion-sync`.

Design notes (Korean): `docs/design.md`.

## Use in a project

One-time setup per machine: register the marketplace and turn on auto-update in your user settings.

```bash
claude plugin marketplace add autelon/company
```

Then make the `autelon` entry in `~/.claude/settings.json` look like this. Keep `source` identical to what `marketplace add` recorded (adding `"ref"` makes Claude Code ignore the marketplace):

```json
{
  "extraKnownMarketplaces": {
    "autelon": {
      "source": { "source": "github", "repo": "autelon/company" },
      "autoUpdate": true
    }
  }
}
```

In each project, enable the plugin in the committed `.claude/settings.json`. Do not declare the marketplace there: a project entry with the same name replaces the user entry, including `autoUpdate`.

```json
{
  "enabledPlugins": { "autelon@autelon": true }
}
```

Check with `claude plugin list` in the project folder. If the plugin is not installed, run `claude plugin install autelon@autelon --scope project` there. Then run the `autelon:found-company` skill.

## Updates

`plugin.json` has no `version`, so the version is a git commit SHA and merges to `main` reach projects without a version bump.
With `autoUpdate` on, Claude Code refreshes the marketplace in the background of an interactive session, up to ten minutes after the first message; the new version loads in the next session or after `/reload-plugins`.
To update right away, run `claude plugin update autelon@autelon` and start a new session.

## Developing the plugin

Changes reach projects only after they are merged to `main` and updated there.
To try local changes first, start Claude Code with `--plugin-dir ./plugin` from this repository.
