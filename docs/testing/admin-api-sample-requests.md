# Admin API: sample requests

Ready-to-paste bodies for manual CRUD testing of `/api/admin/v1/**` (Swagger UI: `/admin/api-docs`).
Names start with `demo-` so they are easy to tell apart from test data (`qa-aapi-*`). Expiry dates must stay in the future: change the year if they pass.
Walkthrough and production checklist: [admin-api-manual-guide.md](admin-api-manual-guide.md). Test plan: [prd/17-admin-api.md](prd/17-admin-api.md).

Coupons and cohorts made here do **not** affect checkout or the learner site until phase 5 (checkout still uses `data/coupons.ts` and `data/courses.ts`).

## 1. Courses

`POST /courses` (result: `status: draft`, `version: 1`)
```json
{
  "slug": "demo-python",
  "title": "Demo Python Foundation",
  "summary": "Manual test course",
  "pitch": {
    "vsl": { "headlinePart1": "Don't just learn Python.", "headlineHighlight": "UNDERSTAND IT", "ctaLabel": "Enroll Now" },
    "painPoints": { "oldWay": ["Random tutorials"], "newWay": ["Structured cohort"] },
    "outcomes": ["Build strong coding logic"]
  }
}
```

`PATCH /courses/demo-python` with header `If-Match: <version>` (use the version from the last answer; a stale one gives 409)
```json
{ "title": "Demo Python Foundation (renamed)", "summary": "Updated summary" }
```

`POST /courses/demo-python/duplicate`
```json
{ "slug": "demo-python-copy", "title": "Copy of Demo Python" }
```

Status steps (no body): `POST /courses/demo-python/publish`, `/unpublish`, `/archive`, `/restore`. A step out of order gives 422.

## 2. Cohorts

`POST /cohorts` (single price)
```json
{
  "slug": "demo-python-b1",
  "courseSlug": "demo-python",
  "title": "Demo Python Batch 1",
  "statusText": "Open for enrolment",
  "demoOffer": "Early bird",
  "duration": "6-8 Weeks | Sat & Sun",
  "contactPhone": "+91 70570 34840",
  "enrollmentClosed": false,
  "listed": true,
  "startsAt": "2027-01-10T00:00:00Z",
  "endsAt": "2027-03-10T00:00:00Z",
  "pricing": { "kind": "single", "inr": { "amount": 1999, "original": 2499 }, "usd": { "amount": 25, "original": 40 } },
  "whatsappLink": "https://chat.whatsapp.com/demo-group",
  "liveLink": "https://meet.google.com/demo-live"
}
```

`POST /cohorts` (plans)
```json
{
  "slug": "demo-python-b2",
  "courseSlug": "demo-python",
  "title": "Demo Python Batch 2 (plans)",
  "pricing": {
    "kind": "plans",
    "currency": "INR",
    "plans": [
      { "id": "community", "name": "Community Plan", "subtitle": "For aspiring engineers", "price": { "amount": 1999, "original": 2499 }, "features": ["Live classes", "Certificate", "Daily assignments"] },
      { "id": "personal", "name": "Personal Plan", "subtitle": "With mentorship", "price": { "amount": 2999, "original": 4999 }, "popular": true, "features": ["Everything in Community", "Two 1-on-1 calls", "Direct WhatsApp access"] }
    ]
  }
}
```

`PATCH /cohorts/demo-python-b1` with header `If-Match: <version>`
```json
{ "duration": "8 Weeks", "pricing": { "kind": "single", "inr": { "amount": 2199, "original": 2499 } }, "liveLink": "" }
```

More calls:
- `GET /cohorts/demo-python-b1` shows no links; `GET /cohorts/demo-python-b1/links` shows them.
- `POST /cohorts/demo-python-b1/close-enrolment` and `/open-enrolment`.
- `POST /cohorts/demo-python-b1/publish` (also `/unpublish`, `/archive`, `/restore`).

## 3. Coupons

Open for all, `POST /coupons`
```json
{ "code": "WELCOME20", "kind": "everyone", "discount": { "type": "percentage", "percent": 20 }, "expiresAt": "2027-03-31T00:00:00Z" }
```

Fixed amount with a scope and a limit
```json
{
  "code": "FLAT200",
  "kind": "everyone",
  "discount": { "type": "fixed", "inr": 200, "usd": 3 },
  "expiresAt": "2027-03-31T00:00:00Z",
  "appliesTo": { "cohortSlugs": ["demo-python-b2"], "planIds": ["personal"] },
  "maxRedemptions": 50
}
```

Selected students (they must have signed up; `GET /learners?q=mavish` is the picker)
```json
{
  "code": "STUDENTS50",
  "kind": "selected",
  "discount": { "type": "percentage", "percent": 50 },
  "expiresAt": "2027-02-28T00:00:00Z",
  "users": ["shivamnamdev.edu@gmail.com", "mavish.ps8@gmail.com"]
}
```
`PATCH /coupons/STUDENTS50`
```json
{ "users": ["mavish.ps8@gmail.com"] }
```

One named one-time code
```json
{ "code": "ONCE-AMIT", "kind": "single-use", "discount": { "type": "percentage", "percent": 100 }, "expiresAt": "2027-01-31T00:00:00Z" }
```

25 random one-time codes, `POST /coupons/generate` with header `Idempotency-Key: demo-workshop-0001` (sending it twice returns the same codes with `repeated: true`)
```json
{ "count": 25, "discount": { "type": "fixed", "inr": 500 }, "expiresAt": "2027-01-31T00:00:00Z" }
```

Change or void: `PATCH /coupons/WELCOME20`
```json
{ "active": false }
```
```json
{ "active": true, "expiresAt": "2027-06-30T00:00:00Z" }
```
On a one-time code, `{ "active": false }` makes the state `voided`.
Filters: `GET /coupons?state=unused`, `?state=voided`, `?q=FLAT`.

## 4. Calls that must be refused

| Call | Body | Expected |
|---|---|---|
| `POST /coupons` | `WELCOME20` without `expiresAt` | 400 |
| `POST /coupons` | `{ "code": "OLD1", "kind": "everyone", "discount": {"type":"percentage","percent":10}, "expiresAt": "2020-01-01T00:00:00Z" }` | 400 |
| `POST /coupons` | kind `selected` with `"users": ["nobody@example.com"]` | 400 naming the e-mail |
| `POST /cohorts` | price `"amount": 0.4` | 400 |
| `POST /cohorts` | `"whatsappLink": "http://insecure.example"` | 400 |
| `POST /coupons` | `FLAT-TINY`: fixed `inr` 1998.6, scoped to `demo-python-b2` plan `community` | 422 (would leave 0.40) |
| `POST /coupons` | `FREE1999`: fixed `inr` 1999, same scope | 201 (exactly zero is allowed) |
| `DELETE /courses/demo-python` | while cohorts exist | 422 |
| `POST /courses` | the same slug twice | 409 |
| `PATCH` a course or cohort | stale or missing `If-Match` | 409 / 428 |

## 5. API keys and audit

`POST /api-keys` (the `token` is shown once)
```json
{ "name": "my script", "level": "admin" }
```
A `"level": "staff"` key can read but not write. No key can list or create keys. Revoke with `DELETE /api-keys/{id}`.
`GET /audit` and `GET /audit?resource=coupon&action=create` show every change above.

Using a key from the terminal:
```bash
curl -H "Authorization: Bearer tmk_<id>_<secret>" http://localhost:3000/api/admin/v1/courses
```

## 6. Cleanup order

Coupons first (a used one is refused: deactivate it instead), then cohorts, then courses (`demo-python`, `demo-python-copy`).

## 7. Curriculum (phase 2)

The cohort must exist (use `demo-python-b1` from section 2). The first write creates the curriculum; every later write needs `If-Match: <version>` (the `version` in the last answer). Lesson ids are YouTube ids (11 characters) or `doc-...`. Assignment links must be on `raw.githubusercontent.com`.

`PUT /curriculum/demo-python-b1` (first write, no header)
```json
{
  "modules": [
    { "title": "Module 1: Python Fundamentals", "lessons": [
      { "id": "OkK3E7ApZ4Q", "title": "Python Basics & Setup",
        "assignment": { "title": "Day 01: Introduction", "rawUrl": "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Assignment", "solutionUrl": "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Solution.py" } },
      { "id": "bpjcslHyYEA", "title": "Variables, Inputs & Operators" }
    ] },
    { "title": "Module 2: Resources", "lessons": [
      { "id": "doc-cheatsheet", "title": "Cheatsheet", "resources": [ { "title": "Git Cheatsheet", "url": "https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf", "type": "PDF" } ] }
    ] }
  ]
}
```
`GET /curriculum/demo-python-b1` shows `modules` (working copy), `published` (null until you publish) and `hasUnpublishedChanges`. The module ids (`m-xxxxxxxx`) are generated; copy them from the answer.

- `POST /curriculum/demo-python-b1/modules`: `{ "title": "Advanced", "advanced": true, "position": 0 }`
- `PATCH /curriculum/demo-python-b1/modules/{moduleId}`: `{ "title": "Renamed" }`
- `POST /curriculum/demo-python-b1/modules/reorder`: `{ "moduleIds": ["m-bbbbbbbb", "m-aaaaaaaa"] }` (every id exactly once)
- `POST /curriculum/demo-python-b1/modules/{moduleId}/lessons`: `{ "id": "TXRqDxL0Ob0", "title": "Modules", "position": 1 }`
- `PATCH /curriculum/demo-python-b1/lessons/OkK3E7ApZ4Q`: `{ "title": "New title", "assignment": null }` (null removes the assignment)
- `POST /curriculum/demo-python-b1/lessons/reorder`: `{ "layout": [ { "moduleId": "m-aaaaaaaa", "lessonIds": ["bpjcslHyYEA"] }, { "moduleId": "m-bbbbbbbb", "lessonIds": ["OkK3E7ApZ4Q", "doc-cheatsheet"] } ] }` (every module and every lesson exactly once; lessons can change module)
- `POST /curriculum/demo-python-b1/publish`, then change something, then `POST .../discard` to go back to the published copy.
- `DELETE /curriculum/demo-python-b1/lessons/{lessonId}` and `.../modules/{moduleId}`.

Must be refused: a lesson id used twice (400); an `http` or foreign `rawUrl` (400); `"isExam": true` on any assignment (400, read-only); publishing an empty curriculum (422); deleting a lesson learners have progress on (422); a reorder that misses an id (400, nothing changes).

## 8. Import today's curricula (owner only, one-off)

`POST /import/curriculum` copies `data/learning-content.ts` into the tables. **Always dry-run first** (the default) and read `dropped`.
```json
{ }
```
Apply one course:
```json
{ "cohorts": ["git-beginner-batch-1"], "apply": true }
```
Apply all three (`python-beginners`, `python-beginners-batch-2`, `git-beginner-batch-1`): `{ "apply": true }`.
Run it again: every course says `unchanged`. If someone edited a curriculum in the admin API, the import says `differs` and leaves it; `{ "apply": true, "overwrite": true }` replaces it with the files.
Imported curricula are published. An API key cannot run it (403), only the signed-in owner.
