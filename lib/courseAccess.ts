// lib/courseAccess.ts
// Who may see a course that is not listed in the catalog (the old live cohorts, hidden since the recorded courses replaced them).
// "hasAccess" means enrolled in that course or admin (hasCourseAccess in lib/learnerApi.ts). Pure, so the rules are unit-tested (tests/unit/course-access.spec.ts).

// A listed course has a public sales page. An unlisted one is for the people who own it (and the admin); everyone else gets "not found".
export function canOpenSalesPage(input: { listed: boolean; hasAccess: boolean }): boolean {
  return input.listed || input.hasAccess;
}

// A shared lesson link: owners go to the lesson; everyone else goes to the course page when it is public, and to the catalog when it is not,
// so a hidden course's page is never revealed through a share link.
export function shareDestination(input: { slug: string; videoId: string; listed: boolean; hasAccess: boolean }): string {
  if (input.hasAccess) return `/learning/${input.slug}?v=${input.videoId}`;
  return input.listed ? `/courses/${input.slug}` : "/courses";
}

// The link preview (WhatsApp and other crawlers) is public by design. A hidden course's lesson shows no lesson title and no thumbnail.
export function sharePreviewIsPublic(listed: boolean): boolean {
  return listed;
}
