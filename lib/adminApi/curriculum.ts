// lib/adminApi/curriculum.ts
// Curriculum = the modules and lessons of one cohort (the slug learners enrol in). Pure rules only: nothing here touches the database,
// so every rule is unit-tested (tests/unit/admin-api-curriculum.spec.ts). The store and routes are in curriculumStore.ts and app/api/admin/v1/curriculum.
// Blueprint: docs/architecture/admin-portal-phase2-content-api.md
import { createHash, randomBytes } from "node:crypto";
import { badRequest, notFound, unprocessable } from "./envelope";
import { arrayOf, bool, httpsUrl, objectOf, oneOf, optional, str, type Check } from "./validate";

export const LIMITS = { modules: 60, lessonsPerModule: 200, resourcesPerLesson: 20 } as const;
export const ASSIGNMENT_HOSTS = ["raw.githubusercontent.com"] as const;
export const RESOURCE_HOSTS = ["s3.ap-south-1.amazonaws.com", "raw.githubusercontent.com", "drive.google.com", "docs.google.com", "github.com", "www.youtube.com", "youtu.be"] as const;
// Set by the owner in git only (exam graders run on the server): the API can neither set nor change them (blueprint R6).
export const PROTECTED_ASSIGNMENT_FIELDS = ["isExam", "serverGraded", "expectedOutcomeUrl"] as const;

export type Resource = { title: string; url: string; type: "PDF" | "Document" | "Link" };
export type Assignment = {
  title: string; labType?: "python" | "git";
  rawUrl?: string; solutionUrl?: string; starterCodeUrl?: string;
  instructionsUrl?: string; starterRepoUrl?: string; expectedStateUrl?: string; validatorUrl?: string;
  carryOverCode?: boolean;
  isExam?: boolean; serverGraded?: boolean; expectedOutcomeUrl?: string;
};
export type Lesson = { id: string; kind: "video" | "document"; title?: string; description?: string; assignment?: Assignment; resources?: Resource[] };
export type Module = { id: string; title: string; advanced: boolean; lessons: Lesson[] };
export type CurriculumDoc = { modules: Module[]; published: Module[] | null; publishedAt?: string };

export const emptyDoc = (): CurriculumDoc => ({ modules: [], published: null });

// ---------- validators ----------

const hostLink = (hosts: readonly string[], allowEmpty: boolean): Check<string> => (v) => {
  if (allowEmpty && v === "") return { ok: true, value: "" };
  const r = httpsUrl(v);
  if (!r.ok) return r;
  return hosts.includes(new URL(r.value).hostname) ? r : { ok: false, message: `must be a link on ${hosts.join(" or ")}` };
};

const lessonId = str({ max: 70, pattern: /^(doc-[A-Za-z0-9_-]{1,60}|[A-Za-z0-9_-]{11})$/ });
const moduleId = str({ max: 10, pattern: /^m-[a-z0-9]{8}$/ });
const assignmentLink = optional(hostLink(ASSIGNMENT_HOSTS, true));

const assignmentShape = {
  title: str({ max: 200 }),
  labType: optional(oneOf("python", "git")),
  rawUrl: assignmentLink, solutionUrl: assignmentLink, starterCodeUrl: assignmentLink,
  instructionsUrl: assignmentLink, starterRepoUrl: assignmentLink, expectedStateUrl: assignmentLink, validatorUrl: assignmentLink,
  carryOverCode: optional(bool),
  isExam: optional(bool), serverGraded: optional(bool), expectedOutcomeUrl: assignmentLink,
};
export const assignmentCheck: Check<Assignment> = objectOf(assignmentShape) as Check<Assignment>;
export const resourceCheck: Check<Resource> = objectOf({ title: str({ max: 200 }), url: hostLink(RESOURCE_HOSTS, false), type: oneOf("PDF", "Document", "Link") }) as Check<Resource>;

const lessonShape = {
  id: lessonId,
  kind: optional(oneOf("video", "document")),
  title: optional(str({ max: 200 })),
  description: optional(str({ max: 500 })),
  assignment: optional(assignmentCheck),
  resources: optional(arrayOf(resourceCheck, { max: LIMITS.resourcesPerLesson })),
};
export const lessonCheck: Check<Lesson> = (v) => {
  const r = objectOf(lessonShape)(v);
  if (!r.ok) return r;
  const l = clean(r.value) as Lesson;
  const natural = l.id.startsWith("doc-") ? "document" : "video";
  if (l.kind && l.kind !== natural) return { ok: false, message: `kind ${l.kind} does not match the id (ids starting with doc- are documents)` };
  return { ok: true, value: { ...l, kind: natural } };
};

export const moduleBodyShape = {
  title: str({ max: 200 }),
  advanced: optional(bool),
  lessons: optional(arrayOf(lessonCheck, { max: LIMITS.lessonsPerModule })),
  position: optional((v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? { ok: true as const, value: v as number } : { ok: false as const, message: "must be a whole number from 0" })),
};
export const modulePatchShape = { title: optional(str({ max: 200 })), advanced: optional(bool) };
export const lessonCreateShape = { ...lessonShape, position: moduleBodyShape.position };
// The patch cannot change the id. `assignment: null` removes the assignment, `resources: []` removes the resources.
export const lessonPatchShape = {
  title: optional(str({ max: 200 })),
  description: optional(str({ max: 500 })),
  assignment: (v: unknown) => (v === null ? { ok: true as const, value: null } : v === undefined ? { ok: true as const, value: undefined } : assignmentCheck(v)),
  resources: optional(arrayOf(resourceCheck, { max: LIMITS.resourcesPerLesson })),
};
export const reorderModulesShape = { moduleIds: arrayOf(moduleId, { min: 1, max: LIMITS.modules }) };
export const reorderLessonsShape = { layout: arrayOf(objectOf({ moduleId, lessonIds: arrayOf(lessonId, { max: LIMITS.lessonsPerModule }) }), { min: 1, max: LIMITS.modules }) };
export const wholeShape = {
  modules: arrayOf((v: unknown) => {
    const r = objectOf({ id: optional(moduleId), title: str({ max: 200 }), advanced: optional(bool), lessons: arrayOf(lessonCheck, { max: LIMITS.lessonsPerModule }) })(v);
    return r.ok ? { ok: true as const, value: r.value as { id?: string; title: string; advanced?: boolean; lessons: Lesson[] } } : r;
  }, { max: LIMITS.modules }),
};

// ---------- helpers ----------

// Removes undefined values (a missing optional field must not become a key).
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as unknown as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as object).filter(([, x]) => x !== undefined).map(([k, x]) => [k, clean(x)])) as T;
  return v;
}
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const newModuleId = () => `m-${Array.from(randomBytes(8), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("")}`;
// Stable ids for an import, so running it twice gives the same ids.
export const stableModuleId = (cohort: string, index: number, title: string) =>
  `m-${createHash("sha1").update(`${cohort}|${index}|${title}`).digest("hex").slice(0, 8).replace(/[^a-z0-9]/g, "0")}`;

export const allLessons = (mods: Module[]): Lesson[] => mods.flatMap((m) => m.lessons);
export const lessonIds = (mods: Module[]): string[] => allLessons(mods).map((l) => l.id);
export const countLessons = (mods: Module[]) => allLessons(mods).length;

// Rules that need the whole curriculum (R1, R3).
export function checkCurriculum(mods: Module[]): void {
  if (mods.length > LIMITS.modules) throw badRequest(`A curriculum can have at most ${LIMITS.modules} modules`);
  const seenM = new Set<string>(); const seenL = new Set<string>();
  for (const m of mods) {
    if (seenM.has(m.id)) throw badRequest(`Module id ${m.id} is used twice`, { modules: `duplicate module id ${m.id}` });
    seenM.add(m.id);
    if (m.lessons.length > LIMITS.lessonsPerModule) throw badRequest(`A module can have at most ${LIMITS.lessonsPerModule} lessons`);
    for (const l of m.lessons) {
      if (seenL.has(l.id)) throw badRequest(`Lesson ${l.id} appears twice in this course`, { lessons: `duplicate lesson id ${l.id}` });
      seenL.add(l.id);
    }
  }
}

function moduleIndex(mods: Module[], id: string): number {
  const i = mods.findIndex((m) => m.id === id);
  if (i < 0) throw notFound("module not found");
  return i;
}
function lessonPos(mods: Module[], id: string): { mi: number; li: number } {
  for (let mi = 0; mi < mods.length; mi++) {
    const li = mods[mi].lessons.findIndex((l) => l.id === id);
    if (li >= 0) return { mi, li };
  }
  throw notFound("lesson not found");
}
const insertAt = <T,>(list: T[], item: T, position?: number): T[] => {
  const out = [...list];
  out.splice(position === undefined ? out.length : Math.min(position, out.length), 0, item);
  return out;
};

// ---------- operations (pure: they return a new list and throw 400/404/422 on a bad request) ----------

export function addModule(mods: Module[], input: { title: string; advanced?: boolean; lessons?: Lesson[]; position?: number }, id = newModuleId()): Module[] {
  const next = insertAt(copy(mods), { id, title: input.title, advanced: input.advanced ?? false, lessons: copy(input.lessons ?? []) }, input.position);
  checkCurriculum(next);
  return next;
}
export function patchModule(mods: Module[], id: string, patch: { title?: string; advanced?: boolean }): Module[] {
  const next = copy(mods); const m = next[moduleIndex(next, id)];
  if (patch.title !== undefined) m.title = patch.title;
  if (patch.advanced !== undefined) m.advanced = patch.advanced;
  return next;
}
export function removeModule(mods: Module[], id: string): Module[] {
  moduleIndex(mods, id);
  return mods.filter((m) => m.id !== id).map(copy);
}
export function reorderModules(mods: Module[], ids: string[]): Module[] {
  const have = mods.map((m) => m.id);
  if (ids.length !== have.length || new Set(ids).size !== ids.length || !ids.every((i) => have.includes(i))) {
    throw badRequest("moduleIds must list every module exactly once", { moduleIds: "must contain exactly the current module ids" });
  }
  return ids.map((id) => copy(mods[have.indexOf(id)]));
}
export function addLesson(mods: Module[], moduleId: string, lesson: Lesson, position?: number): Module[] {
  const next = copy(mods); const m = next[moduleIndex(next, moduleId)];
  m.lessons = insertAt(m.lessons, copy(lesson), position);
  checkCurriculum(next);
  return next;
}
export function patchLesson(mods: Module[], id: string, patch: { title?: string; description?: string; assignment?: Assignment | null; resources?: Resource[] }): Module[] {
  const next = copy(mods); const { mi, li } = lessonPos(next, id); const l = next[mi].lessons[li];
  if (patch.title !== undefined) l.title = patch.title;
  if (patch.description !== undefined) l.description = patch.description;
  if (patch.assignment === null) delete l.assignment; else if (patch.assignment !== undefined) l.assignment = clean(patch.assignment);
  if (patch.resources !== undefined) { if (patch.resources.length) l.resources = patch.resources; else delete l.resources; }
  return next;
}
export function removeLesson(mods: Module[], id: string): Module[] {
  const { mi, li } = lessonPos(mods, id);
  const next = copy(mods); next[mi].lessons.splice(li, 1);
  return next;
}
// layout lists EVERY module with its lessons in the new order; lessons may move between modules; the module order does not change (R8).
export function reorderLessons(mods: Module[], layout: Array<{ moduleId: string; lessonIds: string[] }>): Module[] {
  const haveM = mods.map((m) => m.id); const gotM = layout.map((x) => x.moduleId);
  if (gotM.length !== haveM.length || new Set(gotM).size !== gotM.length || !gotM.every((i) => haveM.includes(i))) {
    throw badRequest("layout must list every module exactly once", { layout: "must contain exactly the current module ids" });
  }
  const byId = new Map(allLessons(mods).map((l) => [l.id, l]));
  const flat = layout.flatMap((x) => x.lessonIds);
  if (flat.length !== byId.size || new Set(flat).size !== flat.length || !flat.every((i) => byId.has(i))) {
    throw badRequest("layout must list every lesson exactly once", { layout: "must contain exactly the current lesson ids" });
  }
  return mods.map((m) => ({ ...copy(m), lessons: layout.find((x) => x.moduleId === m.id)!.lessonIds.map((id) => copy(byId.get(id)!)) }));
}
export function replaceModules(input: Array<{ id?: string; title: string; advanced?: boolean; lessons: Lesson[] }>): Module[] {
  const mods = input.map((m) => ({ id: m.id ?? newModuleId(), title: m.title, advanced: m.advanced ?? false, lessons: copy(m.lessons) }));
  checkCurriculum(mods);
  return mods;
}

// ---------- publish, discard ----------

export function publishDoc(doc: CurriculumDoc, now = new Date().toISOString()): CurriculumDoc {
  if (doc.modules.length === 0) throw unprocessable("An empty curriculum cannot be published");
  return { ...doc, published: copy(doc.modules), publishedAt: now };
}
export function discardDoc(doc: CurriculumDoc): CurriculumDoc {
  if (!doc.published) throw unprocessable("Nothing is published yet, so there is nothing to go back to");
  return { ...doc, modules: copy(doc.published) };
}
export const hasUnpublishedChanges = (doc: CurriculumDoc): boolean =>
  doc.published === null ? doc.modules.length > 0 : JSON.stringify(doc.modules) !== JSON.stringify(doc.published);

// ---------- protected fields (R6) and removed lessons (R4) ----------

// Compares the new modules with the stored ones: the protected assignment fields can neither be set nor changed; when omitted they are kept.
// `allowProtected` is only for the repo's own import script, which copies them from data/learning-content.ts.
export function enforceProtected(before: Module[], after: Module[], allowProtected = false): Module[] {
  if (allowProtected) return after;
  const old = new Map(allLessons(before).map((l) => [l.id, l]));
  const out = copy(after);
  for (const l of allLessons(out)) {
    const was = old.get(l.id)?.assignment;
    const now = l.assignment;
    if (now) {
      for (const f of PROTECTED_ASSIGNMENT_FIELDS) {
        const given = (now as Record<string, unknown>)[f];
        const kept = was ? (was as Record<string, unknown>)[f] : undefined;
        if (given !== undefined && given !== kept) throw badRequest(`${f} cannot be set through the API`, { [`lesson ${l.id}`]: `${f} is read-only` });
        if (kept !== undefined) (now as Record<string, unknown>)[f] = kept;
      }
    } else if (was && was.isExam) {
      throw unprocessable(`Lesson ${l.id} holds the exam; its assignment cannot be removed through the API`);
    }
  }
  return out;
}

// Lesson ids present before and gone after (R4 checks these against learner progress).
export const removedLessonIds = (before: Module[], after: Module[]): string[] => {
  const keep = new Set(lessonIds(after));
  return lessonIds(before).filter((id) => !keep.has(id));
};

export function summary(mods: Module[]) {
  return { modules: mods.length, lessons: countLessons(mods) };
}

// ---------- conversion to and from today's data/learning-content.ts shape ----------

type LegacyModule = { moduleTitle: string; isAdvancedModule?: boolean; videoIds?: string[]; githubAssignments?: Record<string, Record<string, unknown>>; resources?: Record<string, unknown> };
const ASSIGNMENT_KEYS = ["title", "labType", "rawUrl", "solutionUrl", "starterCodeUrl", "instructionsUrl", "starterRepoUrl", "expectedStateUrl", "validatorUrl", "carryOverCode", "isExam", "serverGraded", "expectedOutcomeUrl"];

// Copies today's data into the new shape. Anything that cannot be kept is listed in `dropped` (never silently lost): an assignment or resource
// with no matching lesson, an empty id, or a link that is not allowed (for example a placeholder).
export function fromLegacy(cohort: string, legacy: LegacyModule[]): { modules: Module[]; dropped: string[] } {
  const dropped: string[] = [];
  const modules: Module[] = legacy.map((lm, index) => {
    const ids = lm.videoIds ?? [];
    const lessons: Lesson[] = ids.map((id) => ({ id, kind: id.startsWith("doc-") ? "document" : "video" }) as Lesson);
    const known = new Set(ids);
    for (const [key, raw] of Object.entries(lm.githubAssignments ?? {})) {
      if (!known.has(key)) { dropped.push(`${cohort} / ${lm.moduleTitle}: assignment "${raw.title ?? ""}" has ${key === "" ? "an empty lesson id" : `no lesson ${key}`}`); continue; }
      const a = clean(Object.fromEntries(ASSIGNMENT_KEYS.filter((k) => raw[k] !== undefined).map((k) => [k, raw[k]]))) as Record<string, unknown>;
      const checked = assignmentCheck(a);
      if (!checked.ok) { dropped.push(`${cohort} / ${lm.moduleTitle}: assignment "${a.title ?? key}" on ${key} was not kept (${checked.message})`); continue; }
      lessons.find((l) => l.id === key)!.assignment = clean(checked.value);
    }
    for (const [key, raw] of Object.entries(lm.resources ?? {})) {
      const lesson = lessons.find((l) => l.id === key);
      if (!lesson) { dropped.push(`${cohort} / ${lm.moduleTitle}: resource on ${key || "an empty id"} has no lesson`); continue; }
      const list = Array.isArray(raw) ? raw : [raw];   // a document lesson has one object, a video has a list
      const kept: Resource[] = [];
      for (const r of list as Array<Record<string, unknown>>) {
        const c = resourceCheck({ title: r.title, url: r.url, type: r.type });
        if (c.ok) kept.push(c.value); else dropped.push(`${cohort} / ${lm.moduleTitle}: resource "${r.title ?? key}" was not kept (${c.message})`);
      }
      if (kept.length) lesson.resources = kept;
      if (!Array.isArray(raw)) { const d = raw as { title?: string; description?: string }; if (d.title) lesson.title = d.title; if (d.description) lesson.description = d.description; }
    }
    return { id: stableModuleId(cohort, index, lm.moduleTitle), title: lm.moduleTitle, advanced: lm.isAdvancedModule === true, lessons };
  });
  return { modules: clean(modules), dropped };
}

// The reverse, producing the shape the learner pages read today.
export function toLegacy(mods: Module[]): LegacyModule[] {
  return mods.map((m) => {
    const githubAssignments: Record<string, Record<string, unknown>> = {};
    const resources: Record<string, unknown> = {};
    for (const l of m.lessons) {
      if (l.assignment) githubAssignments[l.id] = { ...l.assignment };
      if (l.resources?.length) {
        resources[l.id] = l.kind === "document" ? { title: l.title ?? l.resources[0].title, description: l.description, url: l.resources[0].url, type: l.resources[0].type } : l.resources.map((r) => ({ ...r }));
      }
    }
    return { moduleTitle: m.title, ...(m.advanced ? { isAdvancedModule: true } : {}), videoIds: m.lessons.map((l) => l.id), githubAssignments, resources } as LegacyModule;
  });
}
