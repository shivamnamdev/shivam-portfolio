// scripts/cutover-rules.mjs
// Pure readiness rules for turning a PORTAL_* flag to "database" (phase 6c). Input: counts read from the database (see cutover-check.mjs).
// No database, no environment, no printing: unit-tested in tests/unit/cutover-readiness.spec.ts.
export const FLAGS = ["PORTAL_CATALOG", "PORTAL_LEARNING", "PORTAL_ENGAGEMENT", "PORTAL_COUPONS"];

/**
 * @typedef {{
 *   publishedCourses: number, publishedCohorts: number, cohortsWithPublishedCourse: number,
 *   cohortsWithEnrolmentsMissingCurriculum: string[], publishedCurricula: number,
 *   plansCohorts: number, planIdColumn: boolean, notificationTables: boolean,
 *   activeCoupons: number, cohortsWithoutPrice: string[]
 * }} Counts
 */

/** @param {Counts} c @param {string[]} flags @returns {Array<{ flag: string, ready: boolean, reasons: string[] }>} */
export function readiness(c, flags = FLAGS) {
  const out = [];
  for (const flag of flags) {
    const reasons = [];
    if (flag === "PORTAL_CATALOG") {
      if (c.publishedCourses === 0) reasons.push("no published course (import the courses and publish them)");
      if (c.publishedCohorts === 0) reasons.push("no published cohort (import the cohorts and publish them)");
      else if (c.cohortsWithPublishedCourse < c.publishedCohorts) reasons.push(`${c.publishedCohorts - c.cohortsWithPublishedCourse} published cohort(s) belong to a course that is not published, so they will not show`);
    } else if (flag === "PORTAL_LEARNING") {
      if (c.publishedCurricula === 0) reasons.push("no published curriculum (import the curriculum and publish it)");
      if (c.cohortsWithEnrolmentsMissingCurriculum.length) reasons.push(`learners are enrolled in cohort(s) with no published curriculum: ${c.cohortsWithEnrolmentsMissingCurriculum.join(", ")} (their lessons would come from the data files until published)`);
    } else if (flag === "PORTAL_ENGAGEMENT") {
      if (!c.notificationTables) reasons.push("the notifications tables are missing (run docs/testing/sql/step8-notifications.sql)");
    } else if (flag === "PORTAL_COUPONS") {
      if (c.publishedCohorts === 0) reasons.push("no published cohort to sell (PORTAL_CATALOG must be ready first, and set to database: prices come from the portal only when both flags are database)");
      if (c.cohortsWithoutPrice.length) reasons.push(`published cohort(s) without a valid price: ${c.cohortsWithoutPrice.join(", ")}`);
      if (c.plansCohorts > 0 && !c.planIdColumn) reasons.push("a published cohort sells plans but user_enrollments has no plan_id column (run docs/SUPABASE_PLAN_COLUMN.md)");
      if (c.activeCoupons === 0) reasons.push("no active coupon (the four old file codes stop working; create the ones you still need)");
    } else {
      reasons.push(`unknown flag ${flag}`);
    }
    out.push({ flag, ready: reasons.length === 0, reasons });
  }
  return out;
}

/** One line per flag: "PORTAL_CATALOG: OK" or "PORTAL_CATALOG: NOT READY: reason; reason". */
export const lines = (results) => results.map((r) => (r.ready ? `${r.flag}: OK` : `${r.flag}: NOT READY: ${r.reasons.join("; ")}`));
