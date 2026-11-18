// lib/examWorker.mjs
// Runs ONE exam attempt inside a worker thread (started by lib/runExam.ts, which kills it after the time limit).
// Pyodide lets Python reach the host through `import js`, so before any learner code runs this file removes
// every way to the server's secrets and network: empty env, no fetch/XMLHttpRequest/WebSocket/require, no `process`.
import { parentPort, workerData } from "node:worker_threads";
import { loadPyodide } from "pyodide";

const { code, inputs, grader } = workerData;
const post = parentPort.postMessage.bind(parentPort);

const py = await loadPyodide();

for (const k of ["fetch", "XMLHttpRequest", "WebSocket", "require", "Worker", "importScripts"]) {
  try { globalThis[k] = undefined; } catch {}
}
for (const k of Object.keys(process.env)) delete process.env[k];
try { Object.defineProperty(globalThis, "process", { value: undefined, configurable: true }); } catch {}

py.globals.set("_exam_inputs", py.toPy(inputs));
py.globals.set("_exam_code", code);
await py.runPythonAsync(`
import sys, io, builtins
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
_exam_values = list(_exam_inputs)
_answers = iter(_exam_values)
def _exam_reset_inputs():
    global _answers
    _answers = iter(_exam_values)
_learner_ns = {"__name__": "__main__", "__file__": "main.py"}
def _exam_input(prompt=""):
    sys.stdout.write(str(prompt))
    try:
        value = next(_answers)
    except StopIteration:
        raise EOFError("EOF when reading a line")
    sys.stdout.write(str(value) + "\\n")
    return str(value)
builtins.input = _exam_input
del _exam_inputs
`);

// The learner's code runs first in its own namespace (_learner_ns), so it can never overwrite the grader's names or score; the grader then
// reads that namespace (the learner's functions and classes), the text printed so far, and may run the code again on other data.
// BaseException is caught inside Python so that sys.exit() in the learner's file ends only their program, not the worker.
try { await py.runPythonAsync("try:\n    exec(compile(_exam_code, 'main.py', 'exec'), _learner_ns)\nexcept BaseException:\n    pass"); } catch {}
// The grader runs in a private namespace of its own (not in the module `__main__` the learner can import), and its source is passed as an
// argument and never stored in a global; the score is returned by the function, so learner code cannot set or overwrite it.
const gradeFn = py.runPython(`
def _exam_grade(src):
    g = {"__name__": "exam_grader", "_exam_code": _exam_code, "_learner_ns": _learner_ns, "_exam_reset_inputs": _exam_reset_inputs}
    exec(compile(src, "grader", "exec"), g)
    return g["score"]
_exam_grade
`);
let graded = true;
let score = NaN;
try { score = Number(gradeFn(grader)); } catch { graded = false; }

const report = String(py.runPython("sys.stdout.getvalue()"));
post({ score: Number.isInteger(score) ? Math.min(100, Math.max(0, score)) : 0, graded, report });
