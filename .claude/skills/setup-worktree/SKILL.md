---
name: setup-worktree
description: Set up a newly created worktree (symlink web/public, npm install). Use when the user says "worktreeのセットアップ", "setup worktree", or just started a session in a worktree and hasn't run setup yet.
---

# setup-worktree skill

Runs initial setup for the current worktree. Safe to run multiple times (idempotent).
If run on the main repo, it prints a message and exits without doing anything.

## Steps

Run:

```powershell
& "${CLAUDE_SKILL_DIR}/scripts/setup-worktree.ps1"
```
