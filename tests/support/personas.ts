// Canonical personas (decision Q7: ids are namespaced per PRD/workbook, each mapped to one account).
// Emails are not secrets. Clerk ids are resolved at run time by email, never hard-coded.
// See docs/testing/TEST_DATA.md and docs/testing/CASE_INVENTORY.md.

export const EMAIL = {
  admin: 'shivamnamdev.corp@gmail.com',
  edu: 'shivamnamdev.edu@gmail.com',
  mavish: 'mavish.ps8@gmail.com',
  bazar: 'financetrail.bazar@gmail.com',
} as const;

// Course A / Course B as used by the Authentication workbook.
export const COURSE = {
  A: 'python-beginners-batch-2',
  B: 'git-beginner-batch-1',
  C: 'python-beginners',
} as const;

// AUTH.* : "[UI] Authentication & Access Control Test Cases"
export const AUTH = {
  V1: null,                 // unauthenticated visitor
  U1: EMAIL.edu,            // authenticated, not enrolled in any course
  S1: EMAIL.mavish,         // enrolled in Course A only
  S2: EMAIL.bazar,          // enrolled in Course B only
  A1: EMAIL.admin,          // authorised admin
  E1: EMAIL.bazar,          // expired / invalid session (same account as S2, session forged)
} as const;

// PUB.* : "[UI] Public Product Pages & Navigation Testing" (also used by the Course Discovery workbook)
export const PUB = {
  V1: null,                 // anonymous first-time visitor
  V2: EMAIL.edu,            // returning anonymous visitor (account used signed out)
  U1: EMAIL.mavish,         // authenticated user
  S1: EMAIL.bazar,          // enrolled learning access
  A1: EMAIL.admin,          // admin
  SL1: [EMAIL.bazar, EMAIL.mavish] as string[], // eligible share-link users
  SL2: EMAIL.mavish,        // ineligible share-link user (for a lesson of a course they do not own)
} as const;

// One enrolment state for the whole run that satisfies every workbook (applied by global-setup,
// restored exactly by global-teardown). The admin account is left untouched.
export const SEED_STATE: Record<string, string[]> = {
  [EMAIL.edu]: [],                  // AUTH.U1: not enrolled in any course
  [EMAIL.mavish]: [COURSE.A],       // AUTH.S1: Course A only
  [EMAIL.bazar]: [COURSE.B],        // AUTH.S2 / PUB.S1: Course B only
};
