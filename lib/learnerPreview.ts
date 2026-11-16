// lib/learnerPreview.ts
// Pure rules of the admin's learner preview (docs/architecture/learner-draft-preview.md). The curriculum editor opens the real course page with
// ?preview=draft; only the admin gets the draft, and nothing is written for the preview (progress, likes, comments, submissions, exam attempts, time).
export const DRAFT_FLAG = "draft";
export const PREVIEW_BANNER = "Preview of the unpublished draft. Nothing here is saved.";
export const PREVIEW_BLOCKED = "Preview only. Nothing is saved.";

/** Is this page view the draft preview? Only the admin can ever be in it; anyone else with the flag in the address sees the normal course. */
export const isDraftPreview = (isAdmin: boolean, flag: string | null | undefined): boolean => isAdmin && flag === DRAFT_FLAG;

/** Where the editor's "Preview as learner" button goes (opened in a new tab). */
export const previewUrl = (cohort: string): string => `/learning/${encodeURIComponent(cohort)}?preview=${DRAFT_FLAG}`;

/** The address of the lesson list the page reads: the draft only for the admin's preview. */
export const contentUrl = (slug: string, preview: boolean): string => `/api/learning/content/${encodeURIComponent(slug)}${preview ? `?draft=1` : ""}`;

/** The time tracker must not count a preview as study time. */
export const isPreviewAddress = (search: string): boolean => new URLSearchParams(search).get("preview") === DRAFT_FLAG;
