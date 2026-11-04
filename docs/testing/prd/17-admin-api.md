# **Product Requirements Document (PRD)**

**Product Name:** TM – Digital Learning Experience Platform  
**Feature:** \[API\] Admin API v1 and Swagger (phase 1 of the admin portal epic)  
**Prepared By:** Shivam Namdev & Claude Code  
**Date:** Nov 4, 2026  
**Status:** PRD draft — cases written before the code (data-first), approved with the Blueprint on 2026-11-04

---

## 1. Feature Overview

The admin API at `/api/admin/v1` lets the owner create, read, update and delete courses, cohorts (with single-price or plan-based pricing) and coupons, and read the audit log, with every write checked on the server and recorded. An OpenAPI document is served to the admin only and shown at `/admin/api-docs`. Phase 1 does not change what learners see.

Plan: `docs/architecture/admin-portal-plan.md` (sections 4, 4.1, 4.2, 5, 6). Branch: `admin-portal/p1-api-foundation` from `epic/admin-portal`.

## 2. Business Objectives

* Only the admin (or an admin API key) can change anything; learners and visitors never see admin data or the spec.
* Coupons always expire, and are one of three kinds: open for all, selected students, or one-time codes.
* No price can be saved that Razorpay would refuse (above zero and below its minimum).
* Every change is traceable: who, what, before and after.

## 3. Scope

**In scope:** guard (`requirePermission`), envelope and errors, versioning (If-Match), idempotency, audit, API keys, courses, cohorts, coupons (including one-time codes and reservation), OpenAPI, the contract test, the import of today's courses, the new tables and their SQL. **Out of scope (later phases):** curriculum content, banners, notifications, e-mail templates, enrolment screens, the admin UI, the learner portal reading the database. Existing coupons in `data/coupons.ts` are **not** imported (owner decision).

## 4. Rules the tests rely on

* Packages: none added; validators and the OpenAPI object are written by hand.
* Tables (4): `content_docs`, `coupons`, `admin_audit`, `api_keys`; RLS on, no policy, no public grants; SQL and rollback in `docs/testing/sql/` run by the owner on QA first.
* One-time code: reserved when the order is created (hold of about 30 minutes), consumed when the payment is verified or the free enrolment is created, released on failure or timeout.
* Payment minimum: a price or a discount result above zero and below the minimum is refused at creation.
* Test accounts and fixtures: the QA project only; automation never runs on production.

## 5. Cases

`docs/testing/cases/prd17-admin-api.csv` (47 cases, ids `AAPI-…`).

**Automated (2026-11-04, QA):** `tests/unit/admin-api-core.spec.ts` (validators, key handling, permissions, payment minimum, audit redaction), `tests/api/admin-api-access.spec.ts` (AUTH, ENV-001, OAS-001/002/004, includes the contract test), `admin-api-courses.spec.ts` (CRS, ENV-002/003, VAL, AUD, RTE-001), `admin-api-cohorts.spec.ts` (COH, VAL-002), `admin-api-coupons.spec.ts` (CPN, AUD), `tests/db/admin-coupon-redemption.spec.ts` (CPN-007/008/009).

**Not automated yet:** `AAPI-DB-001` (policy inventory, manual SQL), `AAPI-DB-002` (the import script, waits for `course-cta-update-3`), `AAPI-OAS-003` (every documented status code reachable: most are covered case by case, a full sweep is not written), `AAPI-COH-005` (skips until `user_enrollments.plan_id` exists on the QA project: run `docs/SUPABASE_PLAN_COLUMN.md`).

## 5b. Decisions recorded while building

* Coupon scope is `appliesTo: { cohortSlugs, planIds }` (cohort slug = the slug enrolments use).
* Idempotency-Key is supported where a retry would create more records: `POST /coupons/generate` (the batch id is derived from the key). Other creates are already safe because slugs and codes are unique.
* The write limit is 120 a minute per admin or key, a fixed 60-second window; the admin check is cached for 60 seconds per server instance so a burst of calls does not hit Clerk's own rate limit.
* `pitch` (course page copy) is bounded free-form JSON for now; exact blocks are fixed with the admin screens (phase 4).

## 6. Open items

Exact length and alphabet of one-time codes, hold time of a reservation, and the payment minimum per currency are fixed in the first code review and written here.
