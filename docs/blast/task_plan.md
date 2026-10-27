# Task Plan

Phases, goals, checklists, and the approved Blueprint for the current task. See [CONSTITUTION.md](../../CONSTITUTION.md) §2–3.

## Current task

PR smoke suite (2026-10-26): tag existing Playwright tests `@smoke`, add public-route / auth-redirect / share-OG / webhook tests, run only `@smoke` on Chromium for every PR.

### Discovery
- North Star: every PR runs a fast, deterministic smoke gate on Chromium.
- Integrations: Clerk (dev instance), GitHub Actions. No new secrets except CLERK_WEBHOOK_SECRET in CI.
- Source of Truth: `data/courses.ts`, `data/learning-content.ts`, `tests/`.
- Delivery Payload: GitHub PR check + Playwright HTML report artifact.
- Behavioral Rules: no email sends, no payments, no DB writes in smoke tests.

### Data schema (input/output)

### Blueprint approved by user: yes ("implement it", 2026-10-26)

### Checklist
- [x] `@smoke` tag on existing specs
- [x] tests/ui/smoke.spec.ts, tests/api/webhook.spec.ts
- [x] `npm run test:smoke`, CI smoke job (chromium)
- [ ] Full 3-browser run moved to push-to-main
