# Admin API v1: manual testing guide (SCP-89, phase 1)

For the owner. Everything below runs against the Supabase project your local `.env.local` points to (QA), so nothing touches production.

## 1. Open the docs and sign in

1. Start the app: `npm run dev` (port 3000).
2. Sign in as the admin in the browser (the admin e-mail).
3. Open **http://localhost:3000/admin/api-docs**. Swagger lists every endpoint grouped by Courses, Cohorts, Coupons, Learners, Audit, API keys and Docs. Each operation shows the permission it needs (`x-permission`).
4. Click **Try it out** on any operation. Your signed-in session is used automatically, no token needed.
5. A visitor or a learner who opens that page is sent away; their calls to `/api/admin/v1/...` get 401 or 403.

## 2. A suggested walkthrough (about 15 minutes)

| Step | Call | What to check |
|---|---|---|
| 1 | `POST /courses` with `{ "slug": "demo-python", "title": "Demo Python", "pitch": { "headline": "Hello" } }` | 201, `status: draft`, `version: 1` |
| 2 | `PATCH /courses/demo-python` with header `If-Match: 1` and `{ "title": "Demo Python 2" }` | 200, `version: 2`. Repeat with `If-Match: 1` again: 409 |
| 3 | `POST /courses/demo-python/publish`, then `/unpublish`, `/archive`, `/restore` | each works in order; a wrong step gives 422 |
| 4 | `POST /cohorts` with `{ "slug": "demo-python-b1", "courseSlug": "demo-python", "title": "Batch 1", "pricing": { "kind": "single", "inr": { "amount": 1999, "original": 2499 } } }` | 201. Try `"amount": 0.4`: 400 (above zero and below the minimum) |
| 5 | `POST /cohorts` with `"pricing": { "kind": "plans", "currency": "INR", "plans": [ { "id": "community", "name": "Community", "price": { "amount": 1999 }, "features": ["Live classes"] }, { "id": "personal", "name": "Personal", "price": { "amount": 2999 }, "features": ["1-on-1 calls"] } ] }` | 201 with both plans |
| 6 | Add `"whatsappLink": "https://chat.whatsapp.com/x"` when creating a cohort, then `GET /cohorts/{slug}` and `GET /cohorts/{slug}/links` | the first never shows links, the second does. `http://` links are refused |
| 7 | `POST /coupons` kind `everyone`: `{ "code": "WELCOME20", "kind": "everyone", "discount": { "type": "percentage", "percent": 20 }, "expiresAt": "2027-01-31T00:00:00Z" }` | 201. Without `expiresAt`: 400 |
| 8 | `GET /learners?q=<part of an e-mail>` then `POST /coupons` kind `selected` with `"users": ["student@example.com"]` | students must have signed up; an unknown e-mail is named in the error. `GET /coupons/{code}` lists name and e-mail |
| 9 | `POST /coupons/generate` with `{ "count": 5, "discount": { "type": "percentage", "percent": 100 }, "expiresAt": "2027-01-31T00:00:00Z" }` | 5 random 10-character codes, state `unused`. Send the header `Idempotency-Key: demo-batch-0001` twice: the second call returns the same codes |
| 10 | `PATCH /coupons/{code}` with `{ "active": false }` on a one-time code | state becomes `voided` |
| 11 | `GET /audit` | one line per change above, with before and after |
| 12 | `POST /api-keys` with `{ "name": "my script", "level": "admin" }` | the **token is shown once**; copy it |

## 3. Use an API key from the terminal

```bash
TOKEN="tmk_...paste the token..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/v1/courses | head -c 600
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"slug":"demo-two","title":"Demo two"}' http://localhost:3000/api/admin/v1/courses
```

A `staff` key can read but not write. A key can never list or create keys. `DELETE /api-keys/{id}` revokes a key at once.

## 4. What is not connected yet (by design)

- There is **no admin screen** yet (phase 4) and the **learner portal does not read these records** (phase 5). Courses, cohorts and coupons created here do not change the sales page, checkout or learner pages.
- **Coupons created here are not honoured at checkout yet**; checkout still uses `data/coupons.ts`. The old coupons stay as they are until phase 5.
- The **import of today's courses** is not done: it waits for `course-cta-update-3` to land.
- Curriculum, banners, notifications, e-mail templates, settings and enrolment screens come in phases 2 and 3.

## 5. Clean up your manual test data

Delete in this order: coupons, cohorts, then courses (`DELETE /coupons/{code}`, `/cohorts/{slug}`, `/courses/{slug}`). A cohort or course with enrolments is refused (422): archive it instead. The automated tests only touch records starting with `qa-aapi` and `QAAPI` and clean them up themselves.

## 6. Before using it on production

1. Run `docs/testing/sql/step7-admin-api-tables.sql` on the production Supabase project (QA is done).
2. Merge the phase 1 PR and let Vercel deploy. The admin guard needs no new environment variable (the service-role key is already there).
3. Open `https://<your domain>/admin/api-docs` as the admin.
