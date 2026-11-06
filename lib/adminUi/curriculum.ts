// lib/adminUi/curriculum.ts
// Pure helpers behind the curriculum editor: turning a pasted YouTube link into a lesson id, the move up/down/to-module arithmetic (which builds the
// exact lists the reorder endpoints want), the assignment and resource forms, and the link checks. The server decides every rule; these give early hints.
// Host lists mirror lib/adminApi/curriculum.ts (a unit test compares them, so they cannot drift).

export type Resource = { title: string; url: string; type: "PDF" | "Document" | "Link" };
export type Assignment = {
  title: string; labType?: "python" | "git"; rawUrl?: string; solutionUrl?: string; starterCodeUrl?: string; instructionsUrl?: string; starterRepoUrl?: string;
  expectedStateUrl?: string; validatorUrl?: string; carryOverCode?: boolean; isExam?: boolean; serverGraded?: boolean; expectedOutcomeUrl?: string;
};
export type Lesson = { id: string; kind: "video" | "document"; title?: string; description?: string; assignment?: Assignment; resources?: Resource[] };
export type Module = { id: string; title: string; advanced: boolean; lessons: Lesson[] };

export const ASSIGNMENT_HOSTS = ["raw.githubusercontent.com"] as const;
export const RESOURCE_HOSTS = ["s3.ap-south-1.amazonaws.com", "raw.githubusercontent.com", "drive.google.com", "docs.google.com", "github.com", "www.youtube.com", "youtu.be"] as const;
export const LIMITS = { modules: 60, lessonsPerModule: 200, resourcesPerLesson: 20 } as const;

// ---- lesson ids ----------------------------------------------------------------------------------------------------------------------------
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const DOC_ID = /^doc-[A-Za-z0-9_-]{1,60}$/;
// Accepts a bare 11-character YouTube id, a doc-... id, or a YouTube link (watch?v=, youtu.be/, /embed/, /shorts/, /live/). Anything else is null.
export function lessonIdFrom(input: string): string | null {
  const s = input.trim();
  if (VIDEO_ID.test(s) || DOC_ID.test(s)) return s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    id = u.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] ?? null : null);
  }
  return id && VIDEO_ID.test(id) ? id : null;
}
export const lessonKindOf = (id: string): "video" | "document" => (id.startsWith("doc-") ? "document" : "video");
export const lessonLabel = (l: Lesson): string => l.title?.trim() || (l.kind === "document" ? `Document ${l.id.slice(4)}` : `Video ${l.id}`);

// ---- moving --------------------------------------------------------------------------------------------------------------------------------
// New order of `ids` after moving the one at `index` by `delta` (-1 up, +1 down). null at the ends (nothing to do).
export function moved<T>(items: T[], index: number, delta: -1 | 1): T[] | null {
  const to = index + delta;
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return null;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
export const moduleOrderAfterMove = (mods: Module[], moduleId: string, delta: -1 | 1): string[] | null => moved(mods.map((m) => m.id), mods.findIndex((m) => m.id === moduleId), delta);

type Layout = Array<{ moduleId: string; lessonIds: string[] }>;
const layoutOf = (mods: Module[]): Layout => mods.map((m) => ({ moduleId: m.id, lessonIds: m.lessons.map((l) => l.id) }));
// The full layout the lessons/reorder endpoint wants after moving a lesson up or down inside its module (null at the ends).
export function layoutAfterMove(mods: Module[], lessonId: string, delta: -1 | 1): Layout | null {
  const layout = layoutOf(mods);
  const m = layout.find((x) => x.lessonIds.includes(lessonId));
  if (!m) return null;
  const next = moved(m.lessonIds, m.lessonIds.indexOf(lessonId), delta);
  if (!next) return null;
  m.lessonIds = next;
  return layout;
}
// Move a lesson to the end of another module. null when it is already there or either id is unknown.
export function layoutAfterMoveToModule(mods: Module[], lessonId: string, targetModuleId: string): Layout | null {
  const layout = layoutOf(mods);
  const from = layout.find((x) => x.lessonIds.includes(lessonId));
  const to = layout.find((x) => x.moduleId === targetModuleId);
  if (!from || !to || from === to) return null;
  from.lessonIds = from.lessonIds.filter((i) => i !== lessonId);
  to.lessonIds = [...to.lessonIds, lessonId];
  return layout;
}

// ---- links ---------------------------------------------------------------------------------------------------------------------------------
export function linkProblem(url: string, hosts: readonly string[]): string | null {
  const s = url.trim();
  if (!s) return null;
  let u: URL;
  try { u = new URL(s); } catch { return "must be a full https link"; }
  if (u.protocol !== "https:") return "must start with https://";
  return hosts.includes(u.hostname) ? null : `must be a link on ${hosts.join(" or ")}`;
}

// ---- assignment form -----------------------------------------------------------------------------------------------------------------------
export const PYTHON_FIELDS = ["rawUrl", "solutionUrl", "starterCodeUrl"] as const;
export const GIT_FIELDS = ["instructionsUrl", "starterRepoUrl", "expectedStateUrl", "validatorUrl"] as const;
export type UrlField = (typeof PYTHON_FIELDS)[number] | (typeof GIT_FIELDS)[number];
export type AssignmentForm = { title: string; labType: "python" | "git"; carryOverCode: boolean } & Record<UrlField, string>;

export const emptyAssignmentForm = (): AssignmentForm => ({ title: "", labType: "python", carryOverCode: false, rawUrl: "", solutionUrl: "", starterCodeUrl: "", instructionsUrl: "", starterRepoUrl: "", expectedStateUrl: "", validatorUrl: "" });
export function assignmentToForm(a: Assignment | undefined): AssignmentForm {
  const f = emptyAssignmentForm();
  if (!a) return f;
  f.title = a.title; f.labType = a.labType ?? "python"; f.carryOverCode = !!a.carryOverCode;
  for (const k of [...PYTHON_FIELDS, ...GIT_FIELDS]) f[k] = a[k] ?? "";
  return f;
}
export const urlFieldsFor = (labType: "python" | "git"): readonly UrlField[] => (labType === "git" ? GIT_FIELDS : PYTHON_FIELDS);

// The assignment sent to the API. Only the fields of the chosen lab type, empty boxes left out. The read-only exam fields (isExam, serverGraded,
// expectedOutcomeUrl) are never sent: the server keeps what it already has.
export function formToAssignment(f: AssignmentForm): Assignment {
  const out: Assignment = { title: f.title.trim(), labType: f.labType };
  for (const k of urlFieldsFor(f.labType)) if (f[k].trim()) out[k] = f[k].trim();
  if (f.carryOverCode) out.carryOverCode = true;
  return out;
}
export function assignmentProblems(f: AssignmentForm): string[] {
  const out: string[] = [];
  if (!f.title.trim()) out.push("The assignment needs a title");
  for (const k of urlFieldsFor(f.labType)) { const p = linkProblem(f[k], ASSIGNMENT_HOSTS); if (p) out.push(`${k} ${p}`); }
  return out;
}

// ---- resources -----------------------------------------------------------------------------------------------------------------------------
export function resourceProblems(list: Resource[]): string[] {
  const out: string[] = [];
  if (list.length > LIMITS.resourcesPerLesson) out.push(`At most ${LIMITS.resourcesPerLesson} resources per lesson`);
  list.forEach((r, i) => {
    const n = i + 1;
    if (!r.title.trim()) out.push(`Resource ${n} needs a title`);
    if (!r.url.trim()) out.push(`Resource ${n} needs a link`);
    else { const p = linkProblem(r.url, RESOURCE_HOSTS); if (p) out.push(`Resource ${n} link ${p}`); }
  });
  return out;
}
export const cleanResources = (list: Resource[]): Resource[] => list.map((r) => ({ title: r.title.trim(), url: r.url.trim(), type: r.type }));

// ---- counts and the learner-style outline -----------------------------------------------------------------------------------------------------
export const countLessons = (mods: Module[]): number => mods.reduce((n, m) => n + m.lessons.length, 0);
// What the learner will see: numbering restarts in each module; advanced modules are marked; assignments, exams and resources are flagged.
export type OutlineRow = { moduleTitle: string; advanced: boolean; lessons: Array<{ number: number; label: string; assignment: boolean; exam: boolean; resources: number }> };
export const outline = (mods: Module[]): OutlineRow[] => mods.map((m) => ({
  moduleTitle: m.title, advanced: m.advanced,
  lessons: m.lessons.map((l, i) => ({ number: i + 1, label: lessonLabel(l), assignment: !!l.assignment, exam: !!l.assignment?.isExam, resources: l.resources?.length ?? 0 })),
}));
