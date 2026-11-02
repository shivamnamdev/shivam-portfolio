// lib/runExam.ts
// Server-only. Grades one exam attempt: the learner's code plus the course's grader run in Pyodide inside a worker
// thread with an empty environment (lib/examWorker.mjs). Time is measured on compute only: the answers for input()
// were typed earlier in the browser, so a slow typist never counts against the limit.
import { Worker } from "node:worker_threads";
import path from "node:path";

export const EXAM_TIME_LIMIT_MS = 20_000;
const REPORT_LIMIT = 64 * 1024;

export type ExamRun = { status: "ok"; score: number; report: string } | { status: "timeout" } | { status: "error" };

export function runExam(input: { code: string; inputs: string[]; grader: string }): Promise<ExamRun> {
  return new Promise(resolve => {
    let done = false;
    const finish = (r: ExamRun) => { if (!done) { done = true; clearTimeout(timer); void worker.terminate(); resolve(r); } };
    const worker = new Worker(path.join(process.cwd(), "lib", "examWorker.mjs"), {
      workerData: input,
      env: {},                                   // the worker sees no secrets
      resourceLimits: { maxOldGenerationSizeMb: 512 },
    });
    const timer = setTimeout(() => finish({ status: "timeout" }), EXAM_TIME_LIMIT_MS);
    worker.on("message", (m: { score: number; graded: boolean; report: string }) =>
      finish(m.graded ? { status: "ok", score: m.score, report: m.report.slice(0, REPORT_LIMIT) } : { status: "error" }));
    worker.on("error", () => finish({ status: "error" }));
    worker.on("exit", () => finish({ status: "error" }));
  });
}
