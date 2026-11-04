// lib/adminApi/courses.ts
// Course = the content shared by every batch (pitch copy). `pitch` is bounded free-form JSON for now: the admin screens (phase 4)
// will fix its exact blocks; the limits below already keep it safe (plain data, size, depth, string length).
import { boundedJson, optional, slug, str } from "./validate";

export const courseCreateShape = {
  slug,
  title: str({ max: 200 }),
  summary: optional(str({ max: 500 })),
  pitch: optional(boundedJson({ maxBytes: 100_000, maxDepth: 8, maxString: 4000 })),
};
export const courseUpdateShape = {
  title: optional(str({ max: 200 })),
  summary: optional(str({ max: 500 })),
  pitch: optional(boundedJson({ maxBytes: 100_000, maxDepth: 8, maxString: 4000 })),
};

export type CourseStatus = "draft" | "published" | "archived";
// publish: draft to published; unpublish: published to draft; archive: draft or published to archived; restore: archived to draft.
export const COURSE_ACTIONS: Record<string, { from: CourseStatus[]; to: CourseStatus }> = {
  publish: { from: ["draft"], to: "published" },
  unpublish: { from: ["published"], to: "draft" },
  archive: { from: ["draft", "published"], to: "archived" },
  restore: { from: ["archived"], to: "draft" },
};
