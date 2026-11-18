import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { runExam } from '../../lib/runExam';
import { graderFor } from '../../lib/examGraders';

// SCP-88 · the Python Batch 1 grader marks behaviour, not printed words. These run the real grader in the real sandbox
// (Pyodide in a worker thread), so each case takes a few seconds. No database, no network, no browser.
const REFERENCE = fs.readFileSync(path.join(process.cwd(), 'tests/support/exam-reference/solution.py'), 'utf8');
const grader = graderFor('python-batch-1-final')!;
const grade = async (code: string) => {
  const r = await runExam({ code, inputs: [], grader });
  if (r.status !== 'ok') throw new Error(`exam run ended with ${r.status}`);
  return r;
};
const without = (from: string, to: string | null) => {   // the reference with the part between two markers removed
  const a = REFERENCE.indexOf(from), b = to ? REFERENCE.indexOf(to) : REFERENCE.length;
  return REFERENCE.slice(0, a) + REFERENCE.slice(b);
};
const change = (from: string, to: string) => {
  expect(REFERENCE).toContain(from);
  return REFERENCE.replace(from, to);
};

test.describe('Exam grader behaviour (SCP-88) @unit', () => {
  test.describe.configure({ mode: 'default', timeout: 60_000 });

  test('[EXGB-UNIT-001] the reference solution written from the exam text scores 100', async () => {
    const r = await grade(REFERENCE);
    expect(r.report).toContain('EXAM_SCORE:100');
    expect(r.score).toBe(100);
  });

  test('[EXGB-UNIT-002] a program that only prints the words the old grader looked for scores 0', async () => {
    const r = await grade(`
print("Jaskeerat Amit Smeeta")
print("Rahul -> Yes"); print("Smeeta -> No"); print("Amit -> No"); print("Jaskeerat -> Yes"); print("Niraj -> Yes")
print("2 9 5 Py***5! Medium")
print("Finance 54000 55000 28000 Senior Mid")
def create_log_file(): pass
def add_task(): pass
def read_tasks(): pass
def search_task(): pass
def delete_task(): pass
def generate_report(): pass
class Doctor:
    def show_cabin(self): pass
class Patient:
    def calculate_discount(self): pass
class Hospital:
    def discharge_patient(self): pass
    def get_doctor_report(self): pass
`);
    expect(r.score).toBe(0);
  });

  test('[EXGB-UNIT-003] a program that prints the exact expected output of the starter data (no calculation) fails Q1 to Q3', async () => {
    const original = without('# ---- Q4 ----', null);                      // the real Q1 to Q3 code, run once for its output
    const printed = (await runExam({ code: original, inputs: [], grader: 'import sys\nprint(sys.stdout.getvalue())\nscore = 0' }));
    expect(printed.status).toBe('ok');
    const lines = (printed as { report: string }).report.split('\n').filter(l => l.trim()).map(l => `print(${JSON.stringify(l)})`);
    const r = await grade(lines.join('\n'));
    expect(r.score).toBe(0);
  });

  test('[EXGB-UNIT-004] correct Q1 to Q3 with empty function and class bodies scores 60: Q4 and Q5 are called, not just looked up', async () => {
    const stubs = `
def create_log_file(f): pass
def add_task(f, n, p): pass
def read_tasks(f): pass
def search_task(f, k): pass
def delete_task(f, n): pass
def generate_report(f, r): pass
class Person: pass
class Doctor(Person):
    def show_cabin(self): pass
class Patient(Person):
    def calculate_discount(self): pass
class Hospital:
    def discharge_patient(self, n): pass
    def get_doctor_report(self, n): pass
`;
    const r = await grade(without('# ---- Q4 ----', null) + stubs);
    expect(r.score).toBe(60);
    expect(r.report).toMatch(/Q4 \(File Handling\) (failed|crashed)/);
    expect(r.report).toMatch(/Q5 \(OOPs\) (failed|crashed)/);
  });

  test('[EXGB-UNIT-005] a learner who sets score, breaks re, prints EXAM_SCORE:100 or exits early cannot change the result', async () => {
    for (const code of [
      'score = 100\nimport re\nre = None\nprint("EXAM_SCORE:100")\n',
      'import sys\nprint("EXAM_SCORE:100")\nsys.exit(0)\n',
      `import __main__\n__main__.score = 100\n${REFERENCE.slice(0, 40)}`,
    ]) {
      const r = await grade(code);
      expect(r.score).toBeLessThan(80);
      expect(r.report.trim().split('\n').filter(l => l.startsWith('EXAM_SCORE:')).pop()).toBe(`EXAM_SCORE:${r.score}`);
    }
  });

  test('[EXGB-UNIT-006] a discount that starts at 20000 instead of above it fails Q5 only (boundary)', async () => {
    const r = await grade(change('if self.get_total_bill() > 20000:', 'if self.get_total_bill() >= 20000:'));
    expect(r.score).toBe(80);
    expect(r.report).toContain('calculate_discount');
  });

  test('[EXGB-UNIT-007] a wrong deduction rule fails Q3 only, a wrong sort order fails Q1 only', async () => {
    const q3 = await grade(change('deductions = 500 * (22 - emp["attendance"]) if emp["attendance"] < 22 else 0', 'deductions = 500 * (23 - emp["attendance"]) if emp["attendance"] < 22 else 0'));
    expect(q3.score).toBe(80);
    expect(q3.report).toMatch(/Q3 \(Dictionaries\) failed/);
    const q1 = await grade(change('if ordered[j][1] < ordered[j + 1][1]:', 'if ordered[j][1] > ordered[j + 1][1]:'));
    expect(q1.score).toBe(80);
    expect(q1.report).toMatch(/Q1 \(Lists\) failed/);
  });

  test('[EXGB-UNIT-008] a correct program with other wording and layout still scores 100', async () => {
    let code = change('print("Sorted by average:", [o[0] for o in ordered])', 'print("Sorted by average:")\nfor o in ordered:\n    print(o[0])');
    code = code.replace('print(s[0], "->", "Yes" if s[-1] > s[-2] else "No")', 'print(f"{s[0]}: {\'Yes\' if s[-1] > s[-2] else \'No\'}")');
    code = code.replace('print(dept, "Average Salary =", avg)', 'print(f"Average salary of {dept} is {avg}")');
    const r = await grade(code);
    expect(r.score).toBe(100);
  });

  test('[EXGB-UNIT-009] a program whose data is not in the variable named in the exam (here renamed) cannot pass Q1', async () => {
    const r = await grade(REFERENCE.replaceAll('students', 'marks'));
    expect(r.report).toMatch(/Q1 \(Lists\) failed: it gave the right answer on the given data but not on different data/);
  });

  test('[EXGB-UNIT-010] the grader returns one improvement note per question: all passed for the reference, the failing question named for a wrong rule', async () => {
    const ok = await grade(REFERENCE);
    expect(ok.notes.map(n => n.q)).toEqual([1, 2, 3, 4, 5]);
    expect(ok.notes.every(n => n.passed)).toBe(true);
    expect(ok.report).not.toContain('EXAM_FEEDBACK');
    const bad = await grade(change('if self.get_total_bill() > 20000:', 'if self.get_total_bill() >= 20000:'));
    const q5 = bad.notes.find(n => n.q === 5)!;
    expect(q5.passed).toBe(false);
    expect(q5.note).toContain('calculate_discount');
    expect(bad.notes.filter(n => n.passed)).toHaveLength(4);
  });
});
