# autelon

A Claude Code plugin for role-based multi-agent orchestration.
Each project lives in its own repository with its own roles, state files, and Notion databases; this repository only holds the shared operating model.

- `found-company` skill: sets up a project repo (designs roles, scaffolds board/PRD/decision files, creates the project's Notion page and databases).
- `adopt-project` skill: brings an existing project (code, docs, repo already in place) under autelon without overwriting its docs; designs domain-expert roles from its domain docs and proposes how to reconcile its current workflow with the director rules.
- Personal resource links (Notion URLs/IDs, local absolute paths, account details) never go into commits; they live in local config (`pluginConfigs`, the project's gitignored `notion/` and `local/`).
- `director` skill: operating rules for the main session in a project.
- Shared roles: `finance` (token budget) and `notion-sync`.

Design notes (Korean): `docs/design.md`.

## Use in a project

One-time setup per machine: register the marketplace, install the plugin at user scope, and turn on auto-update.

```bash
claude plugin marketplace add autelon/company
claude plugin install autelon@autelon --scope user
```

The plugin sets `defaultEnabled: false`, so the user-scope install records `"autelon@autelon": false` in `~/.claude/settings.json`: installed everywhere, enabled nowhere.
Then make `~/.claude/settings.json` look like this. Keep `source` identical to what `marketplace add` recorded (adding `"ref"` makes Claude Code ignore the marketplace):

```json
{
  "extraKnownMarketplaces": {
    "autelon": {
      "source": { "source": "github", "repo": "autelon/company" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "autelon@autelon": false }
}
```

In each project that uses autelon, enable it in the committed `.claude/settings.json`. Project settings take precedence over user settings, so the plugin is on only there. Do not declare the marketplace in the project: a project entry with the same name replaces the user entry, including `autoUpdate`.

```json
{
  "enabledPlugins": { "autelon@autelon": true }
}
```

Enable it by editing that file rather than the plugin toggle in a session; which settings file the toggle writes is not verified.
Check with `claude plugin list` in the project folder (`enabled`), then run the `autelon:found-company` skill.

## Updates

`plugin.json` has no `version`, so the version is a git commit SHA and merges to `main` reach projects without a version bump.
With `autoUpdate` on, Claude Code refreshes the marketplace in the background of an interactive session, up to ten minutes after the first message; the new version loads in the next session or after `/reload-plugins`.
To update right away, run `claude plugin update autelon@autelon` and start a new session.

## Developing the plugin

Changes reach projects only after they are merged to `main` and updated there.
To try local changes first, start Claude Code with `--plugin-dir ./plugin` from this repository.
