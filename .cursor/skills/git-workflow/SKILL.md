---
name: git-workflow
description: Git workflow for NeoTerraProject. Use before editing, when committing a logical change, and when pushing the current branch. Covers status, commits, and non-forced push.
---

# Git workflow

1. Check the current branch before starting work.
2. Check `git status`.
3. Do not delete or overwrite user changes.
4. After each distinct logical change, create one commit.
5. Write the commit message in English. Say why the change exists.
6. Review the diff and run the available checks before committing.
7. Do not commit unrelated files or secrets.
8. After `git commit`, run `git status` and confirm the commit exists.
9. If `origin` is configured and authorization works, push the current branch with `git push`.
10. Do not use `git push --force`.
11. Do not merge into `main` without the user's permission.
12. If push fails authorization, report the error. Do not claim the push succeeded.

Committing and pushing are separate commands. Run both when the remote and authorization allow it.
