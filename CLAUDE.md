# Claude instructions

- **Release flow (owner's decision, 2026-11-04): every requested change goes live.** Push the change to `staging`, then merge `staging` into `dev` and push `dev`. **bagel/dev is the published (live) theme**; bagel/staging is the preview theme. Do not ask for approval first, and never tell the owner to click Publish in Shopify (that swaps the live theme).
- Another collaborator also works on `dev` / `staging`. **Always pull before making changes:** `git fetch origin dev staging` and merge both `origin/staging` and `origin/dev` into the working branch before editing, and again right before releasing, so collaborator and Theme Editor commits ("Update from Shopify…") are never lost. Never force-push and never overwrite someone else's commits.
- Steps per change: commit → push the working branch → PR **working branch → `staging`** and merge it → merge `origin/staging` into `dev` (fresh from `origin/dev`) and push `dev`. Stop if any merge leaves conflict markers (`git grep '^<<<<<<< '`).
- In the PR, list any collaborator / Theme Editor commits included.
- Theme Editor edits made in **bagel/dev** (live) land on `dev`; edits in **bagel/staging** land on `staging`. Both are carried across by the merges above. Theme settings (`config/settings_data.json`, e.g. social links) are per theme: keep them identical.
