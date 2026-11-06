// lib/catalog/tags.ts
// Cache tags of the learner-facing reads and which admin writes must refresh them. Pure; the revalidation call itself is in lib/adminApi/audit.ts.
export const CATALOG_TAG = "catalog";

// The admin resources whose change alters what the course list or a sales page shows (courses and cohorts, and the settings that hold the support
// phone and e-mail). Curriculum, banners and notifications have their own tags in later slices.
const CATALOG_RESOURCES = new Set(["course", "cohort", "setting"]);
const WRITES = new Set(["create", "update", "delete", "publish", "unpublish", "archive", "restore", "duplicate", "open", "close"]);

export const touchesCatalog = (resource: string, action: string): boolean => CATALOG_RESOURCES.has(resource) && WRITES.has(action);
