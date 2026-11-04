# Claude instructions

- **Release flow (owner's decision, 2026-11-04): push changes to `staging` only.** The owner reviews the **bagel/staging** theme and clicks **Publish** in Shopify to put it live. Never push to `dev` (until the owner says otherwise, **bagel/dev is the published theme**, so a push to `dev` changes the live site).
- Another collaborator also works on `dev` / `staging`. **Always pull before making changes:** `git fetch origin dev staging` and merge both `origin/staging` and `origin/dev` into the working branch before editing, and again right before releasing, so collaborator and Theme Editor commits ("Update from Shopify…") are never lost when bagel/staging is published. Never force-push and never overwrite someone else's commits.
- After every requested change, without asking: commit, push the working branch, open a PR **working branch → `staging`** and merge it. Stop if any merge leaves conflict markers (`git grep '^<<<<<<< '`).
- In the PR, list any collaborator / Theme Editor commits included.
- Theme Editor edits made in **bagel/dev** land on `dev`; edits in **bagel/staging** land on `staging`. Theme settings (`config/settings_data.json`, e.g. social links) are per theme: check they match before the owner publishes.
