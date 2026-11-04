// lib/adminApi/openapi.ts
// The OpenAPI 3 document of the admin API, written by hand (owner decision D7: no new packages). Served to the admin only at
// /api/admin/v1/openapi.json and shown at /admin/api-docs. A contract test (tests/api/admin-api-contract.spec.ts) fails if a route exists
// that is not listed here, or a path is listed that has no route, so this file cannot drift from the code.
import { PERMISSIONS, type Permission } from "./permissions";

type Method = "get" | "post" | "patch" | "delete";
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
  // people, history, keys, spec
  op("get", "/learners", "learners:read", "Learners", "Search signed-up users by name or e-mail (the picker for selected-students coupons)", { response: "LearnerList", query: ["q", "limit"], codes: [...STD_READ, 400] }),
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
  LearnerList: obj({ success: { type: "boolean" }, data: obj({ items: { type: "array", items: obj({ id: str(), email: str(), name: str() }) } }) }),
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
    tags: ["Courses", "Cohorts", "Coupons", "Learners", "Audit", "API keys", "Docs"].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { adminSession: { type: "apiKey", in: "cookie", name: "__session", description: "The admin's signed-in browser session" }, apiKey: { type: "http", scheme: "bearer", description: "tmk_<id>_<secret>" } },
      schemas: SCHEMAS,
    },
    "x-permissions": PERMISSIONS,
  };
}
