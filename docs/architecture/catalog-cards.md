# Catalog cards: instructor, currency toggle, quick preview (SCP-43; SCP-61, 62, 63)

Status: **built (owner approved the Blueprint 2026-11-18).** Ratings are out of scope (owner decision 2026-11-18: there is no review data and none is invented).

## 1. North Star
A visitor can compare courses on `/courses` without opening each one: who teaches it, the price in their currency, and a quick look at what is inside.

## 2. What is built (the three parts)
1. **Instructor line** on every card: "Taught by Shivam Namdev" (one constant; the only instructor on the platform today).
2. **Currency toggle** above the grid: INR (default) and USD, as two buttons with `aria-pressed`. Card prices follow it. Rules, all from the existing pricing rules:
   - a closed cohort keeps "Closed" / "Soon" (no price);
   - a plan course ("From ..." price) is INR only (`getBasePrice` refuses USD for plans), so in USD mode it keeps its INR price and shows the small note "INR only";
   - a course with no USD price (some portal cohorts) does the same.
   The choice is held in the page only (not remembered, not shared with the sales page, which has its own toggle).
3. **Quick preview** on every card: a "Quick preview" button opens a panel inside the card (`aria-expanded`), with the highlights (the course's `vsl.facts`, at most 6) and the syllabus (the first 6 module titles, "+ N more modules" after that), and the existing "View Details" link. A click or tap, not a hover, so it also works on phones and from the keyboard.

Not built: rating. Test `CDP-005` stays a documented known gap (`test.fixme`, "no review data") and SCP-61 is closed for the instructor part with that note.

## 3. Data shapes (before code)
```ts
// lib/catalogCard.ts (pure, unit-tested)
export const INSTRUCTOR = "Shivam Namdev";
export type CardCourse = { enrollmentClosed: boolean; format?: "live" | "recorded";
  pricing?: { inr: { currentPrice: string }; usd?: { currentPrice: string } }; pricingPlans?: Array<{ price: string }>;
  vsl?: { facts?: string[] }; modules?: Array<{ title: string; week?: string }> };
export function cardPrice(c: CardCourse, currency: "INR" | "USD"): { label: string; note?: "INR only" };
export function cardPreview(c: CardCourse): { highlights: string[]; modules: string[]; moreModules: number };
```
`GridCourse` (the card's props) gains `highlights: string[]`, `modules: string[]`, `moreModules: number`. The server page builds these with `cardPreview`, so the browser receives only the card fields, not whole course objects (the grid becomes a client component for the toggle and the panels). Source of truth is unchanged (`getCatalog`, data files or portal database).

## 4. Integrations, links, delivery
None new: no SQL, no package, no env var, no API route. Delivered on `/courses` and the admin preview `/preview/courses` (they share `CourseGrid`). The catalog page stays statically built (SCP-80).

## 5. Behavioural rules
- Pricing numbers come only from the existing course price labels; nothing is computed or converted.
- Archived cards in the admin preview keep their grey style; the preview panel still works.
- Must not widen the page on a phone (SCP-114): `PUB-MOB-017`-style check on `/courses`.

## 6. Tests (ship with the code)
- Unit (`tests/unit/catalog-card.spec.ts`): `cardPrice` (INR, USD, USD missing, plans, closed, recorded "Soon"), `cardPreview` (facts capped at 6, modules capped at 6 with the remainder count, no modules, no facts).
- UI: update `CDP-003`, `CDP-008`, `CDP-CUR-003`, `CDP-009/010` to the new controls; `CDP-005` becomes `test.fixme` with the reason; add keyboard cases (toggle and panel reachable and operable by keyboard) and the phone width check.
- Run: `tests/ui/discovery`, `tests/ui/public`, and the preview specs of the admin portal that share the grid.

## 7. Decisions for the owner
1. Instructor wording "Taught by Shivam Namdev".
2. Toggle not remembered between visits (simplest); say if it should be remembered for the session.
3. Quick preview opens on click or tap (not on hover).
4. Plan courses and courses without a USD price keep their INR price with the note "INR only" in USD mode.

Rollback: revert the PR; no data or schema is touched.

## 8. Result
Built as above. Note: every listed course is closed today (Closed or Soon), so the card price cannot change with the currency on the live catalog yet; the price rules are covered by `CARD-UNIT-002` to `005`, the controls by the UI cases `CDP-008`, `CDP-009/010`, `CDP-014`, `CDP-015`.
