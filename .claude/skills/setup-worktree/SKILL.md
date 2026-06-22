---
name: setup-worktree
description: Set up a newly created worktree (symlink web/public, npm install). Use when the user says "worktreeのセットアップ", "setup worktree", or just created a worktree and needs it initialized.
---

# setup-worktree skill

Runs initial setup for a worktree that was just created with `git worktree add`.

## Steps

1. Ask the user for the worktree path if not already provided.

2. Run:

```powershell
& "${CLAUDE_SKILL_DIR}/scripts/setup-worktree.ps1" -WorktreePath "path/to/worktree"
```

3. Tell the user the setup is complete.
