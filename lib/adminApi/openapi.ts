// lib/adminApi/openapi.ts
// The OpenAPI 3 document of the admin API, written by hand (owner decision D7: no new packages). Served to the admin only at
// /api/admin/v1/openapi.json and shown at /admin/api-docs. A contract test (tests/api/admin-api-contract.spec.ts) fails if a route exists
// that is not listed here, or a path is listed that has no route, so this file cannot drift from the code.
import { PERMISSIONS, type Permission } from "./permissions";

type Method = "get" | "post" | "put" | "patch" | "delete";
type Op = { method: Method; path: string; permission: Permission; tag: string; summary: string; body?: string; response?: string; codes?: number[]; description?: string; query?: string[]; headers?: string[] };

const STD_READ = [401, 403];
const op = (method: Method, path: string, permission: Permission, tag: string, summary: string, extra: Partial<Op> = {}): Op => ({ method, path, permission, tag, summary, ...extra });

export const OPERATIONS: Op[] = [
  // courses
  op("get", "/courses", "courses:read", "Courses", "List courses", { response: "CourseList", query: ["limit", "cursor", "q", "status"], codes: [...STD_READ, 400] }),
  op("post", "/courses", "courses:write", "Courses", "Create a course (starts as a draft)", { body: "CourseCreate", response: "Course", codes: [201, 400, 401, 403, 409, 429] }),
  op("get", "/courses/{slug}", "courses:read", "Courses", "Read a course", { response: "Course", codes: [...STD_READ, 404] }),
  op("patch", "/courses/{slug}", "courses:write", "Courses", "Update a course (send the version in If-Match)", { body: "CourseUpdate", response: "Course", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 428, 429] }),
  op("delete", "/courses/{slug}", "courses:write", "Courses", "Delete a course (refused while it has cohorts or enrolments; archive instead)", { codes: [401, 403, 404, 422, 429] }),
  op("post", "/courses/{slug}/publish", "courses:write", "Courses", "Publish a draft course", { response: "Course", codes: [401, 403, 404, 422, 429] }),
  op("post", "/courses/{slug}/unpublish", "courses:write", "Courses", "Move a published course back to draft", { response: "Course", codes: [401, 403, 404, 422, 429] }),
  op("post", "/courses/{slug}/archive", "courses:write", "Courses", "Archive a course", { response: "Course", codes: [401, 403, 404, 422, 429] }),
  op("post", "/courses/{slug}/restore", "courses:write", "Courses", "Restore an archived course as a draft", { response: "Course", codes: [401, 403, 404, 422, 429] }),
  op("post", "/courses/{slug}/duplicate", "courses:write", "Courses", "Copy a course as a new draft with a new slug", { body: "CourseDuplicate", response: "Course", codes: [201, 400, 401, 403, 404, 409, 429] }),
  // cohorts
  op("get", "/cohorts", "cohorts:read", "Cohorts", "List cohorts (batches)", { response: "CohortList", query: ["limit", "cursor", "q", "status", "courseSlug"], codes: [...STD_READ, 400] }),
  op("post", "/cohorts", "cohorts:write", "Cohorts", "Create a cohort with single-price or plan pricing", { body: "CohortCreate", response: "Cohort", codes: [201, 400, 401, 403, 409, 422, 429] }),
  op("get", "/cohorts/{slug}", "cohorts:read", "Cohorts", "Read a cohort (the private links are not included)", { response: "Cohort", codes: [...STD_READ, 404] }),
  op("patch", "/cohorts/{slug}", "cohorts:write", "Cohorts", "Update a cohort (send the version in If-Match)", { body: "CohortUpdate", response: "Cohort", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 422, 428, 429] }),
  op("delete", "/cohorts/{slug}", "cohorts:write", "Cohorts", "Delete a cohort (refused while learners are enrolled)", { codes: [401, 403, 404, 422, 429] }),
  op("get", "/cohorts/{slug}/links", "cohorts:links", "Cohorts", "Read the private WhatsApp and live-class links", { response: "CohortLinks", codes: [...STD_READ, 404] }),
  op("post", "/cohorts/{slug}/publish", "cohorts:write", "Cohorts", "Publish a draft cohort", { response: "Cohort", codes: [401, 403, 404, 422, 429] }),
  op("post", "/cohorts/{slug}/unpublish", "cohorts:write", "Cohorts", "Move a published cohort back to draft", { response: "Cohort", codes: [401, 403, 404, 422, 429] }),
  op("post", "/cohorts/{slug}/archive", "cohorts:write", "Cohorts", "Archive a cohort", { response: "Cohort", codes: [401, 403, 404, 422, 429] }),
  op("post", "/cohorts/{slug}/restore", "cohorts:write", "Cohorts", "Restore an archived cohort as a draft", { response: "Cohort", codes: [401, 403, 404, 422, 429] }),
  op("post", "/cohorts/{slug}/open-enrolment", "cohorts:write", "Cohorts", "Open enrolment", { response: "Cohort", codes: [401, 403, 404, 429] }),
  op("post", "/cohorts/{slug}/close-enrolment", "cohorts:write", "Cohorts", "Close enrolment", { response: "Cohort", codes: [401, 403, 404, 429] }),
  // coupons
  op("get", "/coupons", "coupons:read", "Coupons", "List coupons (state: active, inactive, expired, unused, reserved, redeemed, voided)", { response: "CouponList", query: ["limit", "cursor", "q", "state"], codes: [...STD_READ, 400] }),
  op("post", "/coupons", "coupons:write", "Coupons", "Create a coupon: open for all, selected students (by e-mail) or one-time. Expiry is mandatory", { body: "CouponCreate", response: "Coupon", codes: [201, 400, 401, 403, 409, 422, 429] }),
  op("post", "/coupons/generate", "coupons:write", "Coupons", "Generate 1 to 200 random one-time codes (Idempotency-Key makes a retry return the same batch)", { body: "CouponGenerate", response: "CouponBatch", headers: ["Idempotency-Key"], codes: [201, 400, 401, 403, 422, 429] }),
  op("get", "/coupons/{code}", "coupons:read", "Coupons", "Read a coupon (selected students are listed with name and e-mail)", { response: "Coupon", codes: [...STD_READ, 404] }),
  op("patch", "/coupons/{code}", "coupons:write", "Coupons", "Change a coupon: expiry, discount, active, students, scope", { body: "CouponUpdate", response: "Coupon", codes: [400, 401, 403, 404, 422, 429] }),
  op("delete", "/coupons/{code}", "coupons:write", "Coupons", "Delete an unused coupon (a used one can only be deactivated)", { codes: [401, 403, 404, 422, 429] }),
  // curriculum (modules and lessons of a cohort)
  op("get", "/curriculum", "curriculum:read", "Curriculum", "List cohorts that have a curriculum (counts and whether there are unpublished changes)", { response: "CurriculumList", query: ["limit", "cursor", "q", "status"], codes: [...STD_READ, 400] }),
  op("get", "/curriculum/{cohort}", "curriculum:read", "Curriculum", "Read the working copy and the published copy", { response: "Curriculum", codes: [...STD_READ, 404] }),
  op("put", "/curriculum/{cohort}", "curriculum:write", "Curriculum", "Replace the whole working copy (import and export). The first write to a cohort creates the curriculum; later writes need If-Match", { body: "CurriculumReplace", response: "Curriculum", headers: ["If-Match"], codes: [200, 201, 400, 401, 403, 404, 409, 422, 428, 429] }),
  op("post", "/curriculum/{cohort}/modules", "curriculum:write", "Curriculum", "Add a module (optionally with lessons, at a position)", { body: "ModuleCreate", response: "Curriculum", headers: ["If-Match"], codes: [200, 201, 400, 401, 403, 404, 409, 428, 429] }),
  op("post", "/curriculum/{cohort}/modules/reorder", "curriculum:write", "Curriculum", "Reorder modules: send every module id once, in the new order (atomic)", { body: "ModuleReorder", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 428, 429] }),
  op("patch", "/curriculum/{cohort}/modules/{moduleId}", "curriculum:write", "Curriculum", "Rename a module or mark it advanced", { body: "ModuleUpdate", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 428, 429] }),
  op("delete", "/curriculum/{cohort}/modules/{moduleId}", "curriculum:write", "Curriculum", "Delete a module (refused while learners have progress on one of its lessons)", { response: "Curriculum", headers: ["If-Match"], codes: [401, 403, 404, 409, 422, 428, 429] }),
  op("post", "/curriculum/{cohort}/modules/{moduleId}/lessons", "curriculum:write", "Curriculum", "Add a lesson (a YouTube id or a doc- id) with an optional assignment and resources", { body: "LessonCreate", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 428, 429] }),
  op("post", "/curriculum/{cohort}/lessons/reorder", "curriculum:write", "Curriculum", "Reorder lessons, also across modules: send every module with its lesson ids (atomic)", { body: "LessonReorder", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 428, 429] }),
  op("patch", "/curriculum/{cohort}/lessons/{lessonId}", "curriculum:write", "Curriculum", "Change a lesson's title, description, assignment (null removes it) or resources. Exam flags are read-only here (use PUT /curriculum/{cohort}/exam)", { body: "LessonUpdate", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 422, 428, 429] }),
  op("delete", "/curriculum/{cohort}/lessons/{lessonId}", "curriculum:write", "Curriculum", "Delete a lesson (refused while learners have progress on it)", { response: "Curriculum", headers: ["If-Match"], codes: [401, 403, 404, 409, 422, 428, 429] }),
  op("put", "/curriculum/{cohort}/exam", "curriculum:write", "Curriculum", "Mark the final exam (owner and admin keys). lessonId makes that lesson the one exam of the course and clears the previous one; null removes the exam (refused once a learner has passed it). Only for a course with a grader in code; the lesson must be a video with an assignment file, outside a locked module. The generic lesson calls still refuse the exam flags", { body: "ExamMark", response: "Curriculum", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 422, 428, 429] }),
  op("post", "/curriculum/{cohort}/publish", "curriculum:write", "Curriculum", "Publish: the working copy becomes the published copy", { response: "Curriculum", headers: ["If-Match"], codes: [401, 403, 404, 409, 422, 428, 429] }),
  op("post", "/curriculum/{cohort}/discard", "curriculum:write", "Curriculum", "Discard the draft: the working copy goes back to the published copy", { response: "Curriculum", headers: ["If-Match"], codes: [401, 403, 404, 409, 422, 428, 429] }),
  // banners, settings, e-mail templates
  op("get", "/banners", "banners:read", "Banners", "List banners", { response: "BannerList", query: ["limit", "cursor", "q", "status"], codes: [...STD_READ, 400] }),
  op("post", "/banners", "banners:write", "Banners", "Create a banner (starts as a draft). Plain text only", { body: "BannerCreate", response: "Banner", codes: [201, 400, 401, 403, 409, 422, 429] }),
  op("get", "/banners/{slug}", "banners:read", "Banners", "Read a banner", { response: "Banner", codes: [...STD_READ, 404] }),
  op("patch", "/banners/{slug}", "banners:write", "Banners", "Update a banner (send the version in If-Match). null clears the link, the dates or the countdown", { body: "BannerUpdate", response: "Banner", headers: ["If-Match"], codes: [400, 401, 403, 404, 409, 422, 428, 429] }),
  op("delete", "/banners/{slug}", "banners:write", "Banners", "Delete a banner (refused while it is published)", { codes: [401, 403, 404, 422, 429] }),
  op("post", "/banners/{slug}/publish", "banners:write", "Banners", "Publish a draft banner", { response: "Banner", codes: [401, 403, 404, 422, 429] }),
  op("post", "/banners/{slug}/unpublish", "banners:write", "Banners", "Move a published banner back to draft", { response: "Banner", codes: [401, 403, 404, 422, 429] }),
  op("post", "/banners/{slug}/archive", "banners:write", "Banners", "Archive a banner", { response: "Banner", codes: [401, 403, 404, 422, 429] }),
  op("post", "/banners/{slug}/restore", "banners:write", "Banners", "Restore an archived banner as a draft", { response: "Banner", codes: [401, 403, 404, 422, 429] }),
  op("get", "/settings", "settings:read", "Settings", "List the four site settings with their value, default and version", { response: "SettingList", codes: STD_READ }),
  op("put", "/settings/{key}", "settings:write", "Settings", "Set one setting. The first save of a key needs no version; later saves need If-Match", { body: "SettingUpdate", response: "Setting", headers: ["If-Match"], codes: [200, 201, 400, 401, 403, 404, 409, 422, 428, 429] }),
  op("get", "/email-templates", "templates:read", "E-mail templates", "List the e-mail templates (the built-in text until one is saved)", { response: "EmailTemplateList", codes: STD_READ }),
  op("get", "/email-templates/{key}", "templates:read", "E-mail templates", "Read one e-mail template", { response: "EmailTemplate", codes: [...STD_READ, 404] }),
  op("put", "/email-templates/{key}", "templates:write", "E-mail templates", "Save a template as plain text. The first save needs no version; later saves need If-Match", { body: "EmailTemplateUpdate", response: "EmailTemplate", headers: ["If-Match"], codes: [200, 201, 400, 401, 403, 404, 409, 428, 429] }),
  op("post", "/email-templates/{key}/preview", "templates:read", "E-mail templates", "Render the template with sample values (sends and saves nothing). Optionally send unsaved subject and body", { body: "EmailPreviewRequest", response: "EmailPreview", codes: [200, 400, 401, 403, 404] }),
  // notifications
  op("get", "/notifications", "notifications:read", "Notifications", "List notifications, newest first (status: scheduled, live or expired)", { response: "NotificationList", query: ["limit", "cursor", "q", "status"], codes: [...STD_READ, 400] }),
  op("post", "/notifications", "notifications:write", "Notifications", "Create an in-app notification. Sends no e-mail by itself", { body: "NotificationCreate", response: "Notification", codes: [201, 400, 401, 403, 422, 429] }),
  op("get", "/notifications/{id}", "notifications:read", "Notifications", "Read a notification with how many people have read it (a count, never who)", { response: "Notification", codes: [...STD_READ, 404] }),
  op("delete", "/notifications/{id}", "notifications:write", "Notifications", "Delete a notification and its read marks", { codes: [401, 403, 404, 429] }),
  op("get", "/notifications/{id}/recipients", "notifications:read", "Notifications", "How many people the target reaches, with a sample of at most 5", { response: "NotificationRecipients", codes: [...STD_READ, 404, 422] }),
  op("post", "/notifications/{id}/send-email", "notifications:send", "Notifications", "Send the e-mail now, once (owner only). Recipients come from the target; refused above announcement-email-cap or the day's daily-email-cap", { response: "EmailSendResult", codes: [200, 401, 403, 404, 409, 422, 429, 502, 503] }),
  // one-off import (owner only)
  op("post", "/import/curriculum", "import:run", "Import", "Copy the curricula in data/learning-content.ts into the tables. Dry run unless apply is true; an existing curriculum that differs is skipped unless overwrite is true", { body: "ImportCurriculum", response: "ImportResult", codes: [400, 401, 403, 429] }),
  // enrolments, reports, exports
  op("get", "/enrolments", "enrolments:read", "Enrolments", "List enrolments, newest first (filter by cohortSlug, userId or q for name or e-mail)", { response: "EnrolmentList", query: ["limit", "cursor", "q", "cohortSlug", "userId"], codes: [...STD_READ, 400] }),
  op("post", "/enrolments", "enrolments:write", "Enrolments", "Enrol a signed-up learner by userId or e-mail (offline payment, scholarship). 409 if already enrolled", { body: "EnrolmentGrant", response: "Enrolment", codes: [201, 400, 401, 403, 404, 409, 422, 429] }),
  op("delete", "/enrolments/{id}", "enrolments:write", "Enrolments", "Remove an enrolment. One granted through this API goes freely; any other (paid, coupon, older manual) is refused with 409 unless force=true from the owner session. Progress is kept", { query: ["force"], codes: [400, 401, 403, 404, 409, 429] }),
  op("get", "/progress", "progress:read", "Progress", "Read only: one row per enrolment with videos and assignments done, the course totals and a percent (null when the course's lessons are unknown). Filter by cohortSlug, userId or q (name or e-mail)", { response: "ProgressList", query: ["limit", "cursor", "q", "cohortSlug", "userId"], codes: [...STD_READ, 400] }),
  op("get", "/submissions", "submissions:read", "Progress", "Read only: who submitted which lesson and when, newest first. The code is never in a list", { response: "SubmissionList", query: ["limit", "cursor", "q", "cohortSlug", "userId"], codes: [...STD_READ, 400] }),
  op("get", "/submissions/{id}", "submissions:read-code", "Progress", "One submission with its code. Owner and admin keys only; a read-only staff key gets 403", { response: "SubmissionWithCode", codes: [...STD_READ, 404] }),
  op("get", "/engagement", "engagement:read", "Progress", "Read only: time spent, current streak and last active day per learner, most time first. The cursor is a position in that order", { response: "EngagementList", query: ["limit", "cursor", "q"], codes: [...STD_READ, 400] }),
  op("get", "/reports/{name}", "reports:read", "Reports", "Counts only, no personal data. name: enrolments-per-cohort, signups-per-day (days 1 to 365, default 30) or coupon-usage", { response: "Report", query: ["days"], codes: [...STD_READ, 400, 404] }),
  op("get", "/exports/{file}", "exports:run", "Exports", "Download a CSV (enrolments.csv or learners.csv). Owner or admin key only; every export is audited. Cells that could run as a spreadsheet formula are neutralised", { codes: [200, 401, 403, 404, 429] }),
  // people, history, keys, spec
  op("get", "/learners", "learners:read", "Learners", "Signed-up users, newest first, searchable by name or e-mail: id, name, e-mail, joinedAt, enrolments and status (enrolled or lead). The directory screen and the picker for selected-students coupons", { response: "LearnerList", query: ["q", "limit", "cursor"], codes: [...STD_READ, 400] }),
  op("get", "/audit", "audit:read", "Audit", "Read the audit log, newest first (read only)", { response: "AuditList", query: ["limit", "cursor", "resource", "action", "resourceId"], codes: [...STD_READ, 400] }),
  op("get", "/api-keys", "keys:read", "API keys", "List API keys (owner only; secrets are never returned)", { response: "ApiKeyList", codes: STD_READ }),
  op("post", "/api-keys", "keys:write", "API keys", "Create an API key; the token is shown once", { body: "ApiKeyCreate", response: "ApiKeyCreated", codes: [201, 400, 401, 403, 429] }),
  op("delete", "/api-keys/{id}", "keys:write", "API keys", "Revoke an API key", { codes: [401, 403, 404, 429] }),
  op("get", "/openapi.json", "openapi:read", "Docs", "This document", { codes: STD_READ }),
];

const STATUS_TEXT: Record<number, string> = { 200: "OK", 201: "Created", 400: "Validation failed", 401: "Not signed in or invalid API key", 403: "Not allowed", 404: "Not found", 409: "Conflict (duplicate or changed by someone else)", 422: "A rule refuses this change", 428: "If-Match header missing", 429: "Too many changes in a short time" };

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const str = (extra: Record<string, unknown> = {}) => ({ type: "string", ...extra });
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const list = (item: string) => obj({ success: { type: "boolean" }, data: obj({ items: { type: "array", items: ref(item) }, nextCursor: str({ nullable: true }) }) });
const one = (item: string) => obj({ success: { type: "boolean" }, data: ref(item) });
const price = obj({ amount: { type: "number", minimum: 0 }, original: { type: "number", minimum: 0 } }, ["amount"]);
const pricing = { oneOf: [
  obj({ kind: str({ enum: ["single"] }), inr: price, usd: price }, ["kind", "inr"]),
  obj({ kind: str({ enum: ["plans"] }), currency: str({ enum: ["INR"] }), plans: { type: "array", minItems: 1, maxItems: 6, items: obj({ id: str(), name: str(), subtitle: str(), price, popular: { type: "boolean" }, features: { type: "array", items: str() } }, ["id", "name", "price", "features"]) } }, ["kind", "currency", "plans"]),
], description: "An amount above zero must be at least 1 in its currency (zero makes the course free)." };
const discount = { oneOf: [obj({ type: str({ enum: ["percentage"] }), percent: { type: "number", exclusiveMinimum: 0, maximum: 100 } }, ["type", "percent"]), obj({ type: str({ enum: ["fixed"] }), inr: { type: "number" }, usd: { type: "number" } }, ["type"])] };
const appliesTo = obj({ cohortSlugs: { type: "array", items: str() }, planIds: { type: "array", items: str() } });
const meta = { slug: str(), status: str({ enum: ["draft", "published", "archived"] }), version: { type: "integer" }, createdAt: str({ format: "date-time" }), updatedAt: str({ format: "date-time" }), updatedBy: str() };

const SCHEMAS: Record<string, unknown> = {
  Error: obj({ success: { type: "boolean", enum: [false] }, error: obj({ code: str(), message: str(), fields: { type: "object", additionalProperties: str() } }) }),
  Course: one("CourseData"), CourseData: obj({ ...meta, title: str(), summary: str(), pitch: { type: "object", description: "Page copy as plain JSON (limited to 100,000 characters, 8 levels, 4,000 characters per text)." } }),
  CourseList: list("CourseData"), CourseCreate: obj({ slug: str(), title: str(), summary: str(), pitch: { type: "object" } }, ["slug", "title"]), CourseUpdate: obj({ title: str(), summary: str(), pitch: { type: "object" } }), CourseDuplicate: obj({ slug: str(), title: str() }, ["slug"]),
  Cohort: one("CohortData"), CohortData: obj({ ...meta, courseSlug: str(), title: str(), statusText: str(), demoOffer: str(), duration: str(), contactPhone: str(), enrollmentClosed: { type: "boolean" }, listed: { type: "boolean" }, startsAt: str({ format: "date-time" }), endsAt: str({ format: "date-time" }), pricing }),
  CohortList: list("CohortData"), CohortLinks: one("CohortLinksData"), CohortLinksData: obj({ whatsappLink: str(), liveLink: str() }),
  CohortCreate: obj({ slug: str(), courseSlug: str(), title: str(), statusText: str(), demoOffer: str(), duration: str(), contactPhone: str(), enrollmentClosed: { type: "boolean" }, listed: { type: "boolean" }, startsAt: str(), endsAt: str(), pricing, whatsappLink: str({ description: "https only, or empty" }), liveLink: str({ description: "https only, or empty" }) }, ["slug", "courseSlug", "title", "pricing"]),
  CohortUpdate: obj({ title: str(), statusText: str(), demoOffer: str(), duration: str(), contactPhone: str(), enrollmentClosed: { type: "boolean" }, listed: { type: "boolean" }, startsAt: str(), endsAt: str(), pricing, whatsappLink: str(), liveLink: str() }),
  Coupon: one("CouponData"), CouponData: obj({ code: str(), kind: str({ enum: ["everyone", "selected", "single-use"] }), state: str({ enum: ["active", "inactive", "expired", "unused", "reserved", "redeemed", "voided"] }), discount, expiresAt: str({ format: "date-time" }), active: { type: "boolean" }, appliesTo, maxRedemptions: { type: "integer" }, redemptions: { type: "integer" }, users: { type: "array", items: obj({ id: str(), email: str(), name: str() }) }, userCount: { type: "integer" }, reservedUntil: str(), redeemedBy: str(), redeemedAt: str(), batchId: str() }),
  CouponList: list("CouponData"), CouponBatch: obj({ success: { type: "boolean" }, data: obj({ batchId: str(), count: { type: "integer" }, codes: { type: "array", items: ref("CouponData") }, repeated: { type: "boolean" } }) }),
  CouponCreate: obj({ code: str({ description: "4 to 40 letters, numbers, - or _ (stored upper case)" }), kind: str({ enum: ["everyone", "selected", "single-use"] }), discount, expiresAt: str({ format: "date-time", description: "Mandatory, must be in the future" }), users: { type: "array", items: str(), description: "E-mails of signed-up users; required for kind selected, not allowed otherwise" }, appliesTo, maxRedemptions: { type: "integer" } }, ["code", "kind", "discount", "expiresAt"]),
  CouponUpdate: obj({ discount, expiresAt: str(), active: { type: "boolean" }, users: { type: "array", items: str() }, appliesTo, maxRedemptions: { type: "integer" } }),
  CouponGenerate: obj({ count: { type: "integer", minimum: 1, maximum: 200 }, discount, expiresAt: str({ format: "date-time" }), appliesTo }, ["count", "discount", "expiresAt"]),
  Curriculum: one("CurriculumData"),
  CurriculumData: obj({ cohort: str(), status: str({ enum: ["draft", "published"] }), version: { type: "integer" }, modules: { type: "array", items: ref("Module") }, published: { type: "array", nullable: true, items: ref("Module") }, publishedAt: str({ format: "date-time" }), hasUnpublishedChanges: { type: "boolean" }, counts: obj({ modules: { type: "integer" }, lessons: { type: "integer" } }), examGrader: { type: "boolean", description: "the course has a grader in code, so an exam can be marked" }, examLessonId: { type: "string", nullable: true, description: "the lesson that is the final exam, if any" }, updatedAt: str(), updatedBy: str() }),
  CurriculumList: list("CurriculumSummary"), CurriculumSummary: obj({ cohort: str(), status: str(), version: { type: "integer" }, hasUnpublishedChanges: { type: "boolean" }, counts: obj({ modules: { type: "integer" }, lessons: { type: "integer" } }), updatedAt: str() }),
  Module: obj({ id: str({ description: "m- plus 8 characters, generated by the API" }), title: str(), advanced: { type: "boolean" }, lessons: { type: "array", items: ref("Lesson") } }),
  Lesson: obj({ id: str({ description: "YouTube video id (11 characters) or doc-... for a document" }), kind: str({ enum: ["video", "document"] }), title: str(), description: str(), assignment: ref("Assignment"), resources: { type: "array", maxItems: 20, items: ref("Resource") } }, ["id"]),
  Assignment: obj({ title: str(), labType: str({ enum: ["python", "git"] }), rawUrl: str(), solutionUrl: str(), starterCodeUrl: str(), instructionsUrl: str(), starterRepoUrl: str(), expectedStateUrl: str(), validatorUrl: str(), carryOverCode: { type: "boolean" }, isExam: { type: "boolean", readOnly: true }, serverGraded: { type: "boolean", readOnly: true }, expectedOutcomeUrl: { type: "string", readOnly: true } }, ["title"]),
  Resource: obj({ title: str(), url: str({ description: "https; s3.ap-south-1.amazonaws.com, raw.githubusercontent.com, drive/docs.google.com, github.com or YouTube" }), type: str({ enum: ["PDF", "Document", "Link"] }) }, ["title", "url", "type"]),
  CurriculumReplace: obj({ modules: { type: "array", maxItems: 60, items: ref("Module") } }, ["modules"]),
  ModuleCreate: obj({ title: str(), advanced: { type: "boolean" }, lessons: { type: "array", items: ref("Lesson") }, position: { type: "integer", minimum: 0 } }, ["title"]),
  ModuleUpdate: obj({ title: str(), advanced: { type: "boolean" } }), ModuleReorder: obj({ moduleIds: { type: "array", items: str() } }, ["moduleIds"]),
  LessonCreate: obj({ id: str(), kind: str({ enum: ["video", "document"] }), title: str(), description: str(), assignment: ref("Assignment"), resources: { type: "array", items: ref("Resource") }, position: { type: "integer", minimum: 0 } }, ["id"]),
  LessonUpdate: obj({ title: str(), description: str(), assignment: { allOf: [ref("Assignment")], nullable: true }, resources: { type: "array", items: ref("Resource") } }),
  LessonReorder: obj({ layout: { type: "array", items: obj({ moduleId: str(), lessonIds: { type: "array", items: str() } }, ["moduleId", "lessonIds"]) } }, ["layout"]),
  ExamMark: obj({ lessonId: { type: "string", nullable: true, description: "11-character video id, or null to remove the exam" }, expectedOutcomeUrl: str({ description: "https://raw.githubusercontent.com link, or empty to remove" }) }, ["lessonId"]),
  ImportCurriculum: obj({ cohorts: { type: "array", items: str(), description: "Default: all cohorts in data/learning-content.ts" }, apply: { type: "boolean", description: "false (default) = dry run, nothing is written" }, overwrite: { type: "boolean", description: "Replace a curriculum that differs from the files" } }),
  ImportResult: obj({ success: { type: "boolean" }, data: obj({ dryRun: { type: "boolean" }, results: { type: "array", items: ref("ImportItem") } }) }),
  ImportItem: obj({ cohort: str(), action: str({ enum: ["create", "unchanged", "differs", "overwrite"] }), applied: { type: "boolean" }, counts: obj({ modules: { type: "integer" }, lessons: { type: "integer" } }), existing: obj({ modules: { type: "integer" }, lessons: { type: "integer" } }), dropped: { type: "array", items: str(), description: "Entries in the files that were not copied, with the reason" } }),
  Banner: one("BannerData"),
  BannerData: obj({ ...meta, purpose: str({ enum: ["announcement", "offer", "course-promo", "learner-notice", "maintenance"] }), message: str({ description: "Plain text, 1 line, at most 280 characters, no < or >" }), ctaLabel: str(), ctaUrl: str({ description: "https, or a path on this site that starts with a single /" }), style: str({ enum: ["info", "urgent", "success", "warning"] }), placement: str({ enum: ["site-top", "courses", "course-page", "learning", "dashboard"] }), audience: ref("Audience"), startsAt: str({ format: "date-time", nullable: true }), endsAt: str({ format: "date-time", nullable: true }), countdownTo: str({ format: "date-time" }), dismissible: { type: "boolean" }, priority: { type: "integer", minimum: 0, maximum: 100 }, allowMultiple: { type: "boolean" } }),
  BannerList: list("BannerData"),
  Audience: { oneOf: [obj({ kind: str({ enum: ["all", "visitors", "learners"] }) }, ["kind"]), obj({ kind: str({ enum: ["cohort"] }), cohortSlug: str() }, ["kind", "cohortSlug"]), obj({ kind: str({ enum: ["plan"] }), planId: str() }, ["kind", "planId"])], description: "Who sees the banner. A cohort must exist." },
  BannerCreate: obj({ slug: str(), purpose: str({ enum: ["announcement", "offer", "course-promo", "learner-notice", "maintenance"] }), message: str(), placement: str({ enum: ["site-top", "courses", "course-page", "learning", "dashboard"] }), ctaLabel: str(), ctaUrl: str(), style: str({ enum: ["info", "urgent", "success", "warning"], default: "info" }), audience: ref("Audience"), startsAt: str({ format: "date-time", nullable: true }), endsAt: str({ format: "date-time", nullable: true, description: "Must be after startsAt" }), countdownTo: str({ format: "date-time" }), dismissible: { type: "boolean", default: true }, priority: { type: "integer", minimum: 0, maximum: 100, default: 0 }, allowMultiple: { type: "boolean", default: false, description: "The best-priority banner of a placement shows alone unless it allows several" } }, ["slug", "purpose", "message", "placement"]),
  BannerUpdate: obj({ purpose: str(), message: str(), placement: str(), ctaLabel: str({ nullable: true }), ctaUrl: str({ nullable: true }), style: str(), audience: ref("Audience"), startsAt: str({ nullable: true }), endsAt: str({ nullable: true }), countdownTo: str({ nullable: true }), dismissible: { type: "boolean" }, priority: { type: "integer" }, allowMultiple: { type: "boolean" } }),
  SettingList: obj({ success: { type: "boolean" }, data: obj({ items: { type: "array", items: ref("SettingData") } }) }),
  Setting: one("SettingData"),
  SettingData: obj({ key: str({ enum: ["announcement-email-cap", "daily-email-cap", "support-phone", "support-email"] }), value: { nullable: true, description: "A whole number for the caps, text or null for phone and e-mail" }, default: { nullable: true }, source: str({ enum: ["default", "custom"] }), description: str(), version: { type: "integer", nullable: true }, updatedAt: str({ nullable: true }), updatedBy: str({ nullable: true }) }),
  SettingUpdate: obj({ value: { nullable: true, description: "announcement-email-cap 1 to 200 (not above daily-email-cap), daily-email-cap 1 to 500, support-phone, support-email; null clears only the last two" } }, ["value"]),
  EmailTemplateList: obj({ success: { type: "boolean" }, data: obj({ items: { type: "array", items: ref("EmailTemplateData") } }) }),
  EmailTemplate: one("EmailTemplateData"),
  EmailTemplateData: obj({ key: str({ enum: ["welcome", "payment-receipt", "free-enrolment"] }), subject: str(), body: str(), source: str({ enum: ["default", "custom"] }), placeholders: { type: "array", items: str() }, status: str(), version: { type: "integer", nullable: true }, updatedAt: str({ nullable: true }), updatedBy: str({ nullable: true }) }),
  EmailTemplateUpdate: obj({ subject: str({ description: "One line, at most 150 characters" }), body: str({ description: "Plain text, at most 5,000 characters. Blank line = new paragraph, **bold**, [label](https://link). Placeholders such as {{name}} come from the template's list; an unknown one is refused" }) }, ["subject", "body"]),
  EmailPreviewRequest: obj({ subject: str(), body: str() }),
  EmailPreview: one("EmailPreviewData"),
  EmailPreviewData: obj({ key: str(), subject: str(), text: str(), html: str({ description: "Safe HTML: everything typed is escaped" }), values: { type: "object", additionalProperties: str() } }),
  Notification: one("NotificationData"), NotificationList: list("NotificationData"),
  NotificationData: obj({ id: str(), type: str({ enum: ["transactional", "announcement", "reminder", "progress", "marketing", "admin-alert"] }), title: str(), body: str(), link: str({ nullable: true }), channels: { type: "array", items: str({ enum: ["inbox", "email"] }) }, target: ref("NotificationTarget"), publishAt: str({ format: "date-time" }), expiresAt: str({ format: "date-time", nullable: true }), status: str({ enum: ["scheduled", "live", "expired"] }), createdBy: str(), createdAt: str(), emailSentAt: str({ nullable: true }), emailRecipients: { type: "integer", nullable: true }, readCount: { type: "integer", description: "Only on a single read" } }),
  NotificationTarget: { oneOf: [obj({ kind: str({ enum: ["all", "admins"] }) }, ["kind"]), obj({ kind: str({ enum: ["cohort"] }), cohortSlug: str() }, ["kind", "cohortSlug"]), obj({ kind: str({ enum: ["plan"] }), planId: str() }, ["kind", "planId"]), obj({ kind: str({ enum: ["user"] }), userId: str({ description: "Clerk user id" }) }, ["kind", "userId"])], description: "admins is only for type admin-alert, and admin-alert can only use it" },
  NotificationCreate: obj({ type: str({ enum: ["transactional", "announcement", "reminder", "progress", "marketing", "admin-alert"], description: "marketing, progress and admin-alert are inbox only" }), title: str({ description: "Plain text, one line, at most 120" }), body: str({ description: "Plain text, at most 2000. Blank line = paragraph, **bold**, [label](https://link)" }), link: str({ description: "https, or a path on this site" }), channels: { type: "array", items: str({ enum: ["inbox", "email"] }), default: ["inbox"], description: "Must include inbox. email only sends when you call send-email" }, target: ref("NotificationTarget"), publishAt: str({ format: "date-time", description: "Default now. A notification with the email channel cannot be scheduled for later" }), expiresAt: str({ format: "date-time", description: "After publishAt" }) }, ["type", "title", "body", "target"]),
  NotificationRecipients: obj({ success: { type: "boolean" }, data: obj({ target: ref("NotificationTarget"), count: { type: "integer" }, sample: { type: "array", maxItems: 5, items: obj({ name: str(), email: str({ nullable: true }) }) }, sampleSize: { type: "integer" } }) }),
  EmailSendResult: obj({ success: { type: "boolean" }, data: obj({ sent: { type: "integer" }, failed: { type: "integer" }, skipped: { type: "integer", description: "People with no e-mail address" }, notification: ref("NotificationData") }) }),
  Enrolment: one("EnrolmentData"), EnrolmentList: list("EnrolmentData"),
  EnrolmentData: obj({ id: str(), userId: str(), email: str({ nullable: true }), name: str(), cohortSlug: str(), planId: str({ nullable: true }), couponUsed: str({ nullable: true }), enrolledAt: str({ format: "date-time" }) }),
  EnrolmentGrant: obj({ cohortSlug: str(), userId: str({ description: "Clerk user id. Send this or email, not both" }), email: str({ description: "E-mail of a signed-up user" }), planId: str({ description: "A plan of that cohort; needs user_enrollments.plan_id in the database" }) }, ["cohortSlug"]),
  ProgressList: list("ProgressData"),
  ProgressData: obj({ userId: str(), name: str(), email: str({ nullable: true }), cohortSlug: str(), videosDone: { type: "integer" }, totalVideos: { type: "integer", nullable: true }, assignmentsDone: { type: "integer" }, totalAssignments: { type: "integer", nullable: true }, percent: { type: "integer", nullable: true, minimum: 0, maximum: 100 }, lastActivityAt: str({ format: "date-time", nullable: true }) }),
  SubmissionList: list("SubmissionData"),
  SubmissionData: obj({ id: str(), userId: str(), name: str(), email: str({ nullable: true }), cohortSlug: str(), lessonId: str(), lessonTitle: str(), completedAt: str({ format: "date-time", nullable: true }), codeLength: { type: "integer" } }),
  SubmissionWithCode: obj({ success: { type: "boolean" }, data: { allOf: [ref("SubmissionData"), obj({ submittedCode: str({ description: "The learner's code, raw text. Show it as text, never as HTML" }) })] } }),
  EngagementList: list("EngagementData"),
  EngagementData: obj({ userId: str(), name: str(), email: str({ nullable: true }), totalTimeSeconds: { type: "integer" }, currentStreak: { type: "integer" }, lastActiveDate: str({ nullable: true }) }),
  Report: obj({ success: { type: "boolean" }, data: obj({ report: str({ enum: ["enrolments-per-cohort", "signups-per-day", "coupon-usage"] }), generatedAt: str({ format: "date-time" }), rows: { type: "array", items: { type: "object", description: "cohortSlug and enrolments; or date and count; or code, kind, redemptions, maxRedemptions, active, expiresAt, expired" } }, total: { type: "integer" }, truncated: { type: "boolean", description: "True when the data was cut at a safe limit" } }) }),
  LearnerList: obj({ success: { type: "boolean" }, data: obj({ items: { type: "array", items: obj({ id: str(), email: str({ nullable: true }), name: str(), joinedAt: str({ format: "date-time", nullable: true }), enrolments: { type: "integer" }, status: str({ enum: ["enrolled", "lead"] }) }) }, nextCursor: str({ nullable: true }) }) }),
  AuditList: list("AuditEntry"), AuditEntry: obj({ id: { type: "integer" }, at: str(), actor: str(), action: str(), resource: str(), resourceId: str(), before: {}, after: {} }),
  ApiKeyList: list("ApiKey"), ApiKey: obj({ id: str(), name: str(), level: str({ enum: ["admin", "staff"] }), createdBy: str(), createdAt: str(), lastUsedAt: str(), revokedAt: str() }),
  ApiKeyCreate: obj({ name: str(), level: str({ enum: ["admin", "staff"] }) }, ["name", "level"]), ApiKeyCreated: obj({ success: { type: "boolean" }, data: obj({ id: str(), name: str(), level: str(), token: str({ description: "Shown once" }) }) }),
};

export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const o of OPERATIONS) {
    const codes = o.codes ?? [200];
    const responses: Record<string, unknown> = {};
    const okCode = codes.find((c) => c < 300) ?? 200;
    responses[okCode] = { description: STATUS_TEXT[okCode], ...(o.response ? { content: { "application/json": { schema: ref(o.response) } } } : {}) };
    for (const c of codes) if (c >= 300) responses[c] = { description: STATUS_TEXT[c], content: { "application/json": { schema: ref("Error") } } };
    const parameters = [
      ...(o.path.match(/\{(\w+)\}/g) ?? []).map((m) => ({ name: m.slice(1, -1), in: "path", required: true, schema: str() })),
      ...(o.query ?? []).map((q) => ({ name: q, in: "query", schema: q === "limit" ? { type: "integer", minimum: 1, maximum: 100 } : str() })),
      ...(o.headers ?? []).map((h) => ({ name: h, in: "header", required: h === "If-Match", schema: str() })),
    ];
    (paths[o.path] ??= {})[o.method] = {
      tags: [o.tag], summary: o.summary, "x-permission": o.permission, parameters,
      ...(o.body ? { requestBody: { required: true, content: { "application/json": { schema: ref(o.body) } } } } : {}),
      responses,
      security: [{ adminSession: [] }, { apiKey: [] }],
    };
  }
  return {
    openapi: "3.0.3",
    info: { title: "Shivam Academy Admin API", version: "1.0.0", description: "Admin only. Sign in as the admin, or send `Authorization: Bearer tmk_...` with an admin API key. Every operation lists the permission it needs (`x-permission`). Answers are `{ success, data }` or `{ success: false, error }`." },
    servers: [{ url: "/api/admin/v1" }],
    tags: ["Courses", "Cohorts", "Curriculum", "Banners", "Settings", "E-mail templates", "Notifications", "Enrolments", "Reports", "Exports", "Import", "Coupons", "Learners", "Audit", "API keys", "Docs"].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { adminSession: { type: "apiKey", in: "cookie", name: "__session", description: "The admin's signed-in browser session" }, apiKey: { type: "http", scheme: "bearer", description: "tmk_<id>_<secret>" } },
      schemas: SCHEMAS,
    },
    "x-permissions": PERMISSIONS,
  };
}
