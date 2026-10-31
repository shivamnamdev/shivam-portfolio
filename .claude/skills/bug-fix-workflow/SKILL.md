---
name: bug-fix-workflow
description: Use when a new bug or failing test is found in this repo and it is to be fixed. Starts with a new git branch from an up-to-date main, then Jira bug, root cause, fix, verification, PR, and a Jira comment with the RCA, resolution and PR link.
---

# Bug-fix workflow (this repo)

Follow these steps in order for every new bug. The owner's request to fix a bug is the instruction to commit, push and prepare the PR **for that bug only**; the usual "never commit or push unless asked" rule still applies to everything else (CONSTITUTION §7).

## 0. Before anything: classify and read

- Read `docs/AGENT_SKILLS.md`, the matching skill (`systematic-debugging`; add `supabase` for database work, `api-security-best-practices` for API work) and PRD §13 for known issues in the area.
- Keep the repo versions in mind (Next 14, Clerk v4, Tailwind v3, sync `params`).

## 1. Create a new git branch first

```bash
git stash push -u -m "WIP before <bug>"      # only if there is unrelated uncommitted work; pop it when done
git checkout main && git pull --ff-only origin main
git checkout -b fix/<short-slug>             # never work on main
```

The Jira key does not exist yet, so the first name is a slug. Rename it after step 2 and **before the first push**: `git branch -m fix/SCP-<n>-<short-slug>`.

## 2. Create the Jira bug and link it

```bash
python3 -I scripts/jira.py create-bug --parent SCP-2 --priority <Highest|High|Medium|Low> \
  --labels <area labels> --summary "<symptom in one sentence>" --description-file <file>
python3 -I scripts/jira.py link SCP-<n> SCP-<related>      # the bug it comes from, the story or the earlier defect
```

- Parent epic: **SCP-2 "Dev Areas"** for code defects. **SCP-3 "QA Areas"** is for test stories (for example the run log SCP-78).
- Description (plain text): steps to reproduce, expected, actual, impact, the test ids that show it, and a line saying that the RCA, fix and PR come as a comment.
- Search first (`parent=SCP-2` and `parent=SCP-3` plus the failing test ids in `docs/testing/runs/`) so a known defect gets a comment instead of a duplicate. Rename the branch now.

## 3. Reproduce and find the root cause (systematic-debugging)

- Reproduce with an existing or a new failing test before any fix. For a new gap write the test first (`tests/api`, `tests/db`, `tests/ui`; ids and titles follow `tests/README.md`).
- Find the cause, not the symptom: read the error, the code path and the data. Write the cause in one or two sentences; it goes into the Jira comment.
- Do not fix what you have not understood; do not paper over with a try/catch.

## 4. Fix, small and in the style of the surrounding code

- Smallest change that removes the cause. No speculative abstractions.
- Business rules (price, entitlement, roles, coupons) stay on the server and deterministic (CONSTITUTION §6). Escape user input in HTML and e-mail.
- If logic or a data shape changes, update the doc in the same change (PRD, `docs/testing/prd/`, `docs/DATABASE.md`).

## 5. Verify

1. The failing test now passes: `PORT=3100 E2E_SEED_PERSONAS=1 NEXT_PUBLIC_QA_FIXTURES=1 npx playwright test --project=chromium --workers=1 <spec> -g "<ids>"` (add `NEXT_PUBLIC_QA_FREE_COUPON_USERS=...` for free-coupon specs). Never touch the owner's server on port 3000.
2. The neighbours still pass: the whole spec file or folder of the area, and every spec that shares the account (`tests/README.md`, "Specs that share the `edu` account": one worker).
3. `npx tsc --noEmit -p .` is clean; lint if configured.
4. Say plainly what failed or was skipped; never claim a run that did not happen.

## 6. Commit, push, pull request

```bash
git add <only the files of the fix>          # no .env*, no agents/ submodule, no unrelated files
git commit -m "fix(<area>): <what> (SCP-<n>)"   # body: cause, change, verification; end with the Co-Authored-By line the session gives
git push -u origin fix/SCP-<n>-<short-slug>
```

- Open the PR against `main` with the GitHub CLI when it is installed (`gh pr create`). If `gh` is missing, give the compare link `https://github.com/shivamnamdev/shivam-portfolio/compare/main...<branch>?expand=1` and the PR text, and say the PR still has to be opened.
- PR text: summary, root cause, the change, verification (tests and results), Jira key, risks. End with the PR footer the session gives.

## 7. Update the Jira bug (documentation)

Write a text file with these parts and post it:

```bash
python3 -I scripts/jira.py comment SCP-<n> --file comment.txt
python3 -I scripts/jira.py transition SCP-<n> "In Review"
```

1. **Root cause** (what, where, why it was not caught).
2. **Resolution** (what changed, file and commit).
3. **Verification** (tests run and results).
4. **Branch and pull request link**.
5. **Follow-ups** (other tickets that can close, work for production or other environments).

When the PR is merged and verified, move the bug to Done and close the tickets it unblocks.

## 8. Keep the test records true

- A test that failed on purpose for this bug loses its "known failure" wording; remove `test.fixme` or the ticket tag only after it passes in a run.
- Append a dated line to `docs/testing/CHANGELOG.md`; regenerate the coverage with `node scripts/case-coverage.mjs`; the next full run page (`docs/testing/runs/`) should show the failure gone.
- Restore any stashed work: `git checkout <previous branch> && git stash pop`.

## 9. Report

End with: the Jira key and link, the branch, the commit, the PR link (or the compare link), the tests run with results, anything skipped, and the skills used.
