# Claude instructions

- After every requested change, without asking: commit, push the working branch, merge it into `dev` and push `dev`, then release `dev` → `staging` (open a PR `dev` → `staging` and merge it). The owner asked for every change to go live on `staging`.
- Before releasing, fetch `staging` and merge in any Theme Editor commits ("Update from Shopify…") so they aren't overwritten.
