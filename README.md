# autelon

A Claude Code plugin for role-based multi-agent orchestration.
Each project lives in its own repository with its own roles, docs, GitHub issues, and GitHub Project; this repository only holds the shared operating model.
A project keeps its history (tasks, PRDs, decisions, role results, session handoffs) in GitHub issues and a per-project Project board, and keeps only the current reference docs in the repository.

- `found-company` skill: sets up a project repo (designs roles, scaffolds the reference docs, creates the GitHub repository, issue labels, Project, and pinned sprint issue).
- `adopt-project` skill: brings an existing project (code, docs, repo already in place) under autelon without overwriting its docs; designs domain-expert roles from its domain docs. An adopted project always runs under the `director` rules; the skill compares its current workflow with those rules, then shows what will change and asks for confirmation.
- Personal resource links (Notion URLs/IDs, local absolute paths, account details) never go into commits, issues, or comments; they live in local config (`pluginConfigs`, the project's gitignored `local/`). Issue and PR text is posted only through `plugin/scripts/privacy-check.mjs`, which blocks such values before they become public.
- `director` skill: operating rules for the main session in a project.
- `sync-project` skill: when the plugin changes, brings the files a project copied from the templates (roles, the autelon part of `CLAUDE.md`, `docs/git-rules.md`, CI, `.gitignore`) up to the new version. The director posts a per-section verdict (apply, keep the project's version, merge, or ask) on the sync issue before any file changes, asks a person about anything uncertain, and opens one PR that also records the new plugin version.
- Standard workflows (`plugin/workflows/`): scripts the director hands to Claude Code's Workflow tool for fixed sequences inside one issue. `pr-judge-fix-loop.js` runs review and security review (and, when the director chooses, a read-through verification for rule or design docs that tests cannot check) on the same PR head, has a fixer role address the findings, and re-judges up to a round limit; it never merges and stops when a person has to decide. `design-competition.js` has several designers draft independently, judges score every draft, and a synthesizer merges the winner with the best parts of the others, for large designs that are hard to undo.
- Shared roles: `finance` (token budget), `sync-editor` (applies the rows of a sync verdict exactly as written, without judging them), and `security-reviewer`, which reviews every PR regardless of who the assigned reviewer is (personal paths, Notion URLs/IDs, secrets, personal data, risky CI or dependency changes) and blocks the merge until it passes; it also sweeps the issues and comments posted during each unit of work.

Design notes (Korean): `docs/design.md`.

## Use in a project

One-time setup per machine: register the marketplace, install the plugin at user scope, and turn on auto-update.

```bash
claude plugin marketplace add autelon/company
claude plugin install autelon@autelon --scope user
```

The plugin sets `defaultEnabled: false`, so the user-scope install records `"autelon@autelon": false` in your user settings (`settings.json` in your Claude Code configuration directory): installed everywhere, enabled nowhere.
Then make that user settings file look like this. Keep `source` identical to what `marketplace add` recorded (adding `"ref"` makes Claude Code ignore the marketplace):

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
