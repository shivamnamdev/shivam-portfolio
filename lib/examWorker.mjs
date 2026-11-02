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
await py.runPythonAsync(`
import sys, io, builtins
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
_answers = iter(list(_exam_inputs))
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

// Same order as the browser: the learner's code, then the grader, in one Python session (the grader needs the learner's classes).
try { await py.runPythonAsync(code); } catch {}
let graded = true;
try { await py.runPythonAsync(grader); } catch { graded = false; }

const score = graded ? Number(py.globals.get("score")) : NaN;
const report = String(py.runPython("sys.stdout.getvalue()"));
post({ score: Number.isInteger(score) ? Math.min(100, Math.max(0, score)) : 0, graded, report });
