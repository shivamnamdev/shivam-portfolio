import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';
import { courseCurriculumMap } from '../../data/learning-content';

// Recorded-courses blueprint: the new Python course is upcoming, recorded, and carries no live-only wording; the old live cohorts are hidden.
const find = (slug: string) => activeCourses.find((c: { slug: string }) => c.slug === slug) as Record<string, any> | undefined;

test.describe('Recorded course data @regression', () => {
  test('[REC-UNIT-001] python-foundation exists, is recorded, listed, and upcoming (enrolment closed)', () => {
    const c = find('python-foundation')!;
    expect(c).toBeTruthy();
    expect(c.format).toBe('recorded');
    expect(c.listed).not.toBe(false);
    expect(c.enrollmentClosed).toBe(true);
    expect(c.statusText).toBe('Coming Soon');
  });

  test('[REC-UNIT-002] python-foundation keeps today\'s plans and prices and says nothing about live classes', () => {
    const c = find('python-foundation')!;
    expect(c.pricingPlans.map((p: { id: string; price: string }) => [p.id, p.price])).toEqual([['community', '₹1999'], ['personal', '₹2999']]);
    const text = JSON.stringify(c).toLowerCase();
    for (const live of ['live:', 'sat & sun', 'max 20', 'live class', 'live interactive', 'live mentorship', 'live session', '75% attendance']) {
      expect(text, live).not.toContain(live);
    }
    expect(c.liveLink).toBe('');
  });

  test('[REC-UNIT-003] the old Python cohorts are hidden and closed; Git stays listed and closed for now', () => {
    for (const slug of ['python-beginners-batch-2', 'python-beginners']) {
      expect(find(slug)!.listed, slug).toBe(false);
      expect(find(slug)!.enrollmentClosed, slug).toBe(true);
    }
    expect(find('git-beginner-batch-1')!.listed).not.toBe(false);
    expect(find('git-beginner-batch-1')!.enrollmentClosed).toBe(true);
  });

  test('[REC-UNIT-004] every course slug is unique', () => {
    const slugs = activeCourses.map((c: { slug: string }) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('[REC-UNIT-005] old courses keep their lessons so enrolled learners still reach them', () => {
    for (const slug of ['python-beginners-batch-2', 'python-beginners', 'git-beginner-batch-1']) {
      expect((courseCurriculumMap as Record<string, unknown[]>)[slug]?.length, slug).toBeGreaterThan(0);
    }
  });
});
