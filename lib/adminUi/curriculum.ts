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
// A git lab also has a solution (a .md walk-through): the data files carry one on every git day. Dropping it here lost it on save (fixed 2026-11-14).
export const GIT_FIELDS = ["instructionsUrl", "starterRepoUrl", "expectedStateUrl", "validatorUrl", "solutionUrl"] as const;
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

// Plain words for every link field (the owner never sees a field name). The hint says what the file is and where it must live.
export const FIELD_LABELS: Record<UrlField, { label: string; hint: string }> = {
  rawUrl: { label: "Assignment file", hint: "The exercise learners read: a text, .py or .docx file on raw.githubusercontent.com" },
  solutionUrl: { label: "Solution file", hint: "Shown to the learner after submitting: .py for Python, .md for Git, on raw.githubusercontent.com" },
  starterCodeUrl: { label: "Starter code / add-on file", hint: "Code or notes the lab opens with (for a continued exercise), on raw.githubusercontent.com" },
  instructionsUrl: { label: "Instructions (.md)", hint: "What the learner has to do in the git lab, on raw.githubusercontent.com" },
  starterRepoUrl: { label: "Starter repository (.json)", hint: "The repository the simulator starts from (repo-seed), on raw.githubusercontent.com" },
  expectedStateUrl: { label: "Expected state (.json)", hint: "The repository state that counts as done, on raw.githubusercontent.com" },
  validatorUrl: { label: "Validator (.json)", hint: "The checks the simulator runs against the learner's repository, on raw.githubusercontent.com" },
};
export const CARRY_OVER_LABEL = "Continue from the previous assignment's code (the editor opens with what the learner wrote last time)";
export const LOCKED_LABEL = "Locked until the exam is passed";
export const LOCKED_HINT = "Learners see these videos after passing the final exam; admins always see them";

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
  for (const k of urlFieldsFor(f.labType)) { const p = linkProblem(f[k], ASSIGNMENT_HOSTS); if (p) out.push(`${FIELD_LABELS[k].label} ${p}`); }
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

// ---- document lessons ----------------------------------------------------------------------------------------------------------------------
// A document lesson is a doc-… id whose first resource is the document itself (what the learner opens); any further resources are extra materials.
// The owner only fills a title, a link and a type: the id comes from the title, with -2, -3… on a clash with a lesson already in the course.
export type DocumentForm = { title: string; url: string; type: Resource["type"]; description: string };
export const emptyDocumentForm = (): DocumentForm => ({ title: "", url: "", type: "PDF", description: "" });
export function documentIdFrom(title: string, existingIds: readonly string[]): string | null {
  const base = title.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
  if (!base) return null;
  let id = `doc-${base}`;
  for (let n = 2; existingIds.includes(id); n++) id = `doc-${base}-${n}`;
  return id;
}
export function documentProblems(f: DocumentForm): string[] {
  const out: string[] = [];
  if (!f.title.trim()) out.push("The document needs a title");
  if (!f.url.trim()) out.push("The document needs a link");
  else { const p = linkProblem(f.url, RESOURCE_HOSTS); if (p) out.push(`The document link ${p}`); }
  if (f.description.length > 500) out.push("The description can have at most 500 characters");
  return out;
}
// The body of POST /modules/{id}/lessons for a new document, or null while the form is incomplete.
export function documentLessonBody(f: DocumentForm, existingIds: readonly string[]): { id: string; title: string; description?: string; resources: [Resource] } | null {
  if (documentProblems(f).length) return null;
  const id = documentIdFrom(f.title, existingIds);
  if (!id) return null;
  const title = f.title.trim();
  return { id, title, ...(f.description.trim() ? { description: f.description.trim() } : {}), resources: [{ title, url: f.url.trim(), type: f.type }] };
}
// Splits a lesson's resources into the document itself (document lessons only) and the extra materials.
export const documentFile = (l: Lesson): { file: Resource | null; extras: Resource[] } =>
  l.kind === "document" ? { file: l.resources?.[0] ?? null, extras: (l.resources ?? []).slice(1) } : { file: null, extras: l.resources ?? [] };

// ---- the exam ------------------------------------------------------------------------------------------------------------------------------
// The final exam is the lesson whose assignment has isExam (set in the repository, rule R6 of phase 2). At most one is expected; the first wins.
export type ExamInfo = { moduleId: string; moduleTitle: string; lesson: Lesson; number: number; serverGraded: boolean; files: Array<{ label: string; url: string }> };
export function examOf(mods: Module[]): ExamInfo | null {
  for (const m of mods) {
    const i = m.lessons.findIndex((l) => l.assignment?.isExam);
    if (i < 0) continue;
    const a = m.lessons[i].assignment!;
    const files = ([["Exam file", a.rawUrl], ["Add-on file", a.starterCodeUrl], ["Expected result", a.expectedOutcomeUrl], ["Solution", a.solutionUrl]] as Array<[string, string | undefined]>)
      .filter((x): x is [string, string] => !!x[1]).map(([label, url]) => ({ label, url }));
    return { moduleId: m.id, moduleTitle: m.title, lesson: m.lessons[i], number: i + 1, serverGraded: !!a.serverGraded, files };
  }
  return null;
}

// ---- video details from YouTube (read only, shown in the editor, never stored) ----------------------------------------------------------------
// The same public call the learner page makes (NEXT_PUBLIC_YOUTUBE_API_KEY), at most 50 ids per request. Document ids are never sent.
export type VideoDetails = { title: string; description: string; duration: string; thumbnail: string };
export const YOUTUBE_BATCH = 50;
export const thumbnailUrl = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
export function youtubeRequestUrls(ids: readonly string[], key: string): string[] {
  const videos = [...new Set(ids.filter((id) => VIDEO_ID.test(id)))];
  const out: string[] = [];
  for (let i = 0; i < videos.length; i += YOUTUBE_BATCH) {
    out.push(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videos.slice(i, i + YOUTUBE_BATCH).join(",")}&key=${encodeURIComponent(key)}`);
  }
  return out;
}
// "PT1H2M3S" to "1:02:03", "PT5M30S" to "5:30"; anything unreadable is "".
export function formatDuration(iso: string | undefined): string {
  const m = typeof iso === "string" ? iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) : null;
  if (!m) return "";
  const h = Number(m[1] ?? 0), min = Number(m[2] ?? 0), s = Number(m[3] ?? 0);
  return h > 0 ? `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${min}:${String(s).padStart(2, "0")}`;
}
// Tolerant of a partial answer: an item without a snippet is skipped, missing fields become empty strings.
export function parseYoutubeItems(json: unknown): Record<string, VideoDetails> {
  const out: Record<string, VideoDetails> = {};
  const items = (json as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    const v = it as { id?: unknown; snippet?: { title?: unknown; description?: unknown; thumbnails?: { medium?: { url?: unknown } } }; contentDetails?: { duration?: unknown } };
    if (typeof v?.id !== "string" || !VIDEO_ID.test(v.id) || !v.snippet) continue;
    const thumb = v.snippet.thumbnails?.medium?.url;
    out[v.id] = {
      title: typeof v.snippet.title === "string" ? v.snippet.title : "", description: typeof v.snippet.description === "string" ? v.snippet.description : "",
      duration: formatDuration(typeof v.contentDetails?.duration === "string" ? v.contentDetails.duration : undefined),
      thumbnail: typeof thumb === "string" && /^https:\/\/i\.ytimg\.com\//.test(thumb) ? thumb : thumbnailUrl(v.id),
    };
  }
  return out;
}

// ---- counts and the learner-style outline -----------------------------------------------------------------------------------------------------
export const countLessons = (mods: Module[]): number => mods.reduce((n, m) => n + m.lessons.length, 0);
// What the learner will see: numbering restarts in each module; advanced modules are marked; assignments, exams and resources are flagged.
export type OutlineRow = { moduleTitle: string; advanced: boolean; lessons: Array<{ number: number; label: string; assignment: boolean; exam: boolean; resources: number }> };
export const outline = (mods: Module[]): OutlineRow[] => mods.map((m) => ({
  moduleTitle: m.title, advanced: m.advanced,
  lessons: m.lessons.map((l, i) => ({ number: i + 1, label: lessonLabel(l), assignment: !!l.assignment, exam: !!l.assignment?.isExam, resources: l.resources?.length ?? 0 })),
}));
