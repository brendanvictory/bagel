# Claude instructions

- Another collaborator also pushes to `dev` and merges into `staging`. **Always pull before making changes:** `git fetch origin dev staging` and merge both `origin/staging` and `origin/dev` into the working branch before editing, and fetch/merge again right before releasing. Never force-push `dev` or `staging`, and never overwrite someone else's commits.
- After every requested change, without asking: commit, push the working branch, merge it into `dev` (fresh from `origin/dev`) and push `dev`, then release `dev` → `staging` (open a PR `dev` → `staging` and merge it). The owner asked for every change to go live on `staging`.
- Before releasing, check the `dev` → `staging` diff only contains the intended changes plus any collaborator/Theme Editor commits ("Update from Shopify…"), and mention those in the PR.
- Theme Editor edits made in the **bagel/dev** theme land on `dev`; edits in **bagel/staging** (live) land on `staging`.
