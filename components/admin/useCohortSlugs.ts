'use client';
import { useAdminGet } from './useAdminApi';

// The cohorts that have at least one enrolment, A to Z (`reload` after a grant or removal changes who has enrolments): what a "filter by cohort" box should offer. It comes from the enrolments-per-cohort report,
// so it also lists courses of the older static list, which the cohorts API does not know. (Grant access still picks from real cohorts.)
export function useCohortSlugs(): { slugs: string[]; reload: () => Promise<void> } {
  const r = useAdminGet<{ rows: Array<{ cohortSlug: string }> }>('/reports/enrolments-per-cohort');
  return { slugs: (r.data?.rows ?? []).map((x) => x.cohortSlug).sort((a, b) => a.localeCompare(b)), reload: r.reload };
}
