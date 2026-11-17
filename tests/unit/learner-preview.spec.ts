import { test, expect } from '@playwright/test';
import { DRAFT_FLAG, PREVIEW_BANNER, PREVIEW_BLOCKED, contentUrl, isDraftPreview, isPreviewAddress, previewUrl } from '../../lib/learnerPreview';

// Unit level: the rules of the admin's learner preview (docs/architecture/learner-draft-preview.md). No browser, no network.
test.describe('Learner draft preview @regression', () => {
  test('[ADMUI-UNIT-PRV-001] only the admin is ever in the preview; the flag alone does nothing for anyone else', () => {
    expect(isDraftPreview(true, 'draft')).toBe(true);
    expect(isDraftPreview(false, 'draft')).toBe(false);            // a learner who adds ?preview=draft sees the normal course
    expect(isDraftPreview(true, null)).toBe(false);
    expect(isDraftPreview(true, undefined)).toBe(false);
    for (const other of ['', 'DRAFT', 'drafts', 'true', '1', 'draft ']) expect(isDraftPreview(true, other), other).toBe(false);
    expect(DRAFT_FLAG).toBe('draft');
  });

  test('[ADMUI-UNIT-PRV-002] the editor opens the course page with the flag (the cohort is encoded); the page reads the draft only in the preview', () => {
    expect(previewUrl('python-beginners')).toBe('/learning/python-beginners?preview=draft');
    expect(previewUrl('a b/c')).toBe('/learning/a%20b%2Fc?preview=draft');
    expect(contentUrl('python-beginners', false)).toBe('/api/learning/content/python-beginners');
    expect(contentUrl('python-beginners', true)).toBe('/api/learning/content/python-beginners?draft=1');
    expect(contentUrl('a/b', true)).toBe('/api/learning/content/a%2Fb?draft=1');
  });

  test('[ADMUI-UNIT-PRV-003] a preview is not study time: the time tracker recognises the address', () => {
    expect(isPreviewAddress('?preview=draft')).toBe(true);
    expect(isPreviewAddress('?x=1&preview=draft')).toBe(true);
    expect(isPreviewAddress('')).toBe(false);
    expect(isPreviewAddress('?preview=other')).toBe(false);
  });

  test('[ADMUI-UNIT-PRV-004] the words the admin sees say that nothing is saved', () => {
    expect(PREVIEW_BANNER).toMatch(/unpublished draft/i); expect(PREVIEW_BANNER).toMatch(/Nothing here is saved/);
    expect(PREVIEW_BLOCKED).toMatch(/Nothing is saved/);
  });
});
