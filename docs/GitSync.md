# Git Synchronization Design for Fetch Client

## Overview

Fetch Client uses LokiJS as the local runtime database. The VS Code extension and the CLI always read/write the local database. Git is not primary storage — it's used only for collaboration, version control, backup, and sharing.

**Provides:** fast local performance, offline support, minimal changes to existing architecture, easy Git collaboration, better conflict management.

## Goals

- Keep LokiJS as the primary local database
- Synchronize collections with Git repositories
- Minimize merge conflicts
- Support future Git providers (GitHub, GitLab, Azure DevOps, Bitbucket)
- Reuse the same sync engine for VS Code and CLI

## Local Storage

No changes to existing DB structure. All CRUD (create/update/delete/execute collection, CLI run, mock server, DDT, history) continues to operate on:

```
Database/
├── collections.db
├── variables.db
├── history.db
├── mock.db
└── settings.db
```

No Git operations occur during normal usage.

## Git Repository Structure

Git never stores LokiJS `.db` files. Data is exported to logical JSON files instead:

```
fetch-client/
├── collections/
│   ├── Customer_<id>.json
│   ├── Order_<id>.json
│   └── Payment_<id>.json
```

**Benefits:** small readable files, easy reviews, better history, fewer merge conflicts.

## High-Level Architecture

```
VS Code / CLI
      │
Collection Service
      │
LokiJS Database
      │
Import / Export Service ◄──► Repository Service ──► Git Provider ──► GitHub / GitLab / Azure DevOps / Bitbucket
```

## Responsibilities

| Service | Responsible for | Never does |
|---|---|---|
| **Collection Service** | Create / update / delete / read collection | Talk to Git |
| **Import / Export Service** | Convert LokiJS ⇄ portable JSON files | Contain Git logic |
| **Repository Service** | Clone, pull, fetch, status, commit, push, branch ops | Read/write Loki DB directly |
| **Git Provider** | Git CLI (recommended) / GitHub / GitLab / Azure DevOps / Bitbucket | — |

## Save Workflow

User edits collection → Collection Service → update `collections.db` → done. **No sync occurs.**

## Push Workflow

1. User clicks **Sync → Push**
2. Export Service exports Loki → `collections/*.json`
3. `git fetch` → check remote changes
4. No changes → `git add` → `git commit` → `git push`
5. Remote changed → see **Conflict Scenario** below

## Pull Workflow

1. User clicks **Sync → Pull**
2. `git pull` → updated JSON files
3. Import Service updates Loki DB
4. Refresh UI

## Synchronization Rules

- **Local Database**: the working database, always used by VS Code and CLI
- **Git Repository**: the collaboration layer only, never accessed during request execution
## Conflict Scenario

**Initial state (Git):** `Customer.json`, `Order.json`, `Student.json` — both developers at `Order.json` v1.

1. Developer A changes `Order`, pushes → Git now has `Order.json` v2
2. Developer B still has v1 locally, changes `Order`, clicks Push
3. Repository Service: export → `git fetch` → check remote → remote changed?

**Case 1 — different sections changed:** Git auto-merges → import merged result → update Loki → push. No user action needed.

**Case 2 — same property changed:** e.g. Dev A sets `Timeout = 60`, Dev B sets `Timeout = 120` → Git can't decide → **conflict**.

## Conflict Handling Strategy — Version 1 (Recommended, adopted for Phase 1)

No custom merge UI.

```
Conflict Detected → Stop Push → Show Message → Resolve using Git Client → Retry Sync
```

> Synchronization failed. Collection: **Order API**. The collection has conflicts with the remote repository. Please resolve the conflict using your preferred Git client and retry synchronization.

**Advantages:** small implementation, reliable, uses Git's mature conflict resolution.

### Version 2 (future) — Simple conflict dialog

Conflicting collections listed (e.g. Order API, Customer API) with actions: **Keep Mine** / **Keep Remote** / **Cancel**.

### Version 3 (future) — Visual merge editor

Side-by-side Local vs Remote values, user edits the merged result and saves. Intended for enterprise scenarios.
## Why One File Per Collection?

A single `collections.db` means every change touches the same file → large diffs, frequent conflicts. Exporting one JSON per collection (`Customer.json`, `Order.json`, `Payment.json`) lets Git track each independently → better reviews, better history, easier merges, smaller commits.

## Advantages

- No redesign of existing LokiJS architecture
- Fast local execution, works offline
- Easy Git integration, cleaner history, fewer conflicts
- Shared implementation between VS Code and CLI
- Easy future support for GitHub, GitLab, Azure DevOps, Bitbucket
- Extensible import/export architecture

## Future Enhancements

Automatic synchronization, branch management, PR creation, Git history viewer, collection comparison/version history, visual merge editor, team collaboration dashboard, conflict resolution wizard, repository templates.

## Recommended Implementation Phases

**Phase 1:** Import/Export Service, Repository Service, Git CLI integration (clone/pull/push/fetch/status), export one JSON per collection, import JSON into Loki, conflict detection, error reporting.

**Phase 2:** Simple conflict dialog (Keep Mine/Keep Remote), branch support, repository configuration/status.

---

# Version 2 — Finalized Decisions

Refinements agreed after design review. Supersedes conflicting details above; original sections kept for history.

## Scope

- Sync **collections only**. Variables, environments, mocks, settings, history, responses, cookies are **out of scope** — shared via the existing manual export/import feature.
- Sync **all** collections (no per-collection opt-in for Phase 1).
- `variableId` is kept as a pointer only. If it doesn't resolve locally after import, flag the collection ("variable set not linked") instead of failing.

## File Layout

- One file per collection: `collections/<name>_<id>.json`.
- `id` is the matching key (Import reads it from file content, never from the filename). `name` is just a human-readable prefix.
- `collections/index.json` manifest tracks `{ id, name, fileName }` — used to detect renames (old file removed + new added) and deletions (id missing from manifest → remove locally).

## Export / Import Rules

- Stable key/array order on every export — no re-sorting (avoids diff noise).
- Strip volatile fields (`createdTime`, `modifiedTime`) from exported JSON.
- Never export resolved secret values — only variable references (e.g. `{{token}}`).
- Import upserts by `id`; deletions propagate via the manifest; one bad/conflicted file must not block importing the rest.

## Sync Folder Setting

- **Independent of `dbPath`** — never derived from or tied to where `.db` files live (prevents duplication if DB path or workspace changes later).
- Single setting: `fetch-client.gitSyncPath` — plain absolute path, no Default/Workspace/Custom modes.
- Internal `fetch-client.gitSyncRemoteUrl` stores the linked remote for validation.
- Resolved **once** at "Link Repository" time and pinned — never re-derived from the currently open workspace.
- Every sync validates the path still exists and matches the expected remote; on mismatch, fail and require explicit re-link (never silently re-init/clone).
- Export always reads the **current** Loki DB via the existing accessor — no cached DB references.

## First-Time Setup (Hybrid Bootstrap)

1. **Detect first**: if `gitSyncPath` already points to a valid Git repo (user cloned manually) → validate + link, no clone needed.
2. **Else**: prompt for a remote URL, use VS Code's built-in "Git: Clone" command for the one-time clone (best auth/progress UX, no custom clone logic).
3. All ongoing sync ops (fetch/pull/push/status) always go through our own Repository Service (git CLI wrapper) — keeps behavior portable to a future JetBrains port.
4. After link: ensure `collections/` + `index.json` exist. Repo has data → import first. Only local has data → push first. Both differ → flag for manual review, don't auto-merge blindly.

## Repository Service

- Shell out to system `git` CLI (e.g. `simple-git`) inside `fetch-client-core`, shared by extension + CLI.
- No custom credential handling — relies on native Git credential storage (Credential Manager/Keychain/SSH agent).
- Chosen over `vscode.git` so a future JetBrains port can reuse the same CLI-invocation approach.

## Conflict Handling — Confirmed Version 1 for Phase 1

Detect via `git status --porcelain` after merge (`UU`/`AA`/`DU`/`UD` = unmerged) → stop sync for affected collection(s) only → message user to resolve via their Git client → retry. Matches Postman/Insomnia Git Sync behavior.

## Industry Alignment (reference)

- **Postman Git Sync**: one file/collection, manual push/pull, fail-fast conflicts, secrets excluded — closest match.
- **Insomnia Git Sync**: finer granularity (one file/entity) — candidate if collection-level conflicts prove too frequent.
- **Bruno**: native flat-file format, no local DB — not applicable, would require rewriting our LokiJS-based engine.
- **Thunder Client**: exports JSON, relies on VS Code's Source Control view — simpler than our approach, which adds our own Push/Pull/Status commands.

## Open Items for Future Work

- Push/pull race handling: retry once on non-fast-forward push rejection.
- Pull safety guard: warn/confirm if local Loki has unsynced changes before import overwrites it.
- Delete-vs-modify merge edge case: Git can silently resolve this without a real conflict flag — needs an explicit policy.
- Large/binary request bodies: store as external file references, not inline in exported JSON.
- Per-collection selective sync (opt-in/opt-out).
- Finer-grained (per-request) file splitting if needed.
- Branch management, PR creation, visual conflict/merge UI (Version 2/3 dialogs).
