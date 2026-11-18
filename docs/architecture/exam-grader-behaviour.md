# Exam grader that checks behaviour (SCP-88) — approved 2026-11-18, built

## 1. North Star
A learner passes the Python Batch 1 exam only when their code *works*, not when it prints the expected words.

## 2. Today (finding, 2026-11-18)
`lib/examGraders.ts` (`PYTHON_BATCH_1_FINAL`) runs in the same Python session as the learner's code and scores 20 points per question:
- Q1, Q2, Q3: regular expressions on the printed text (names, numbers, "Rahul -> Yes"). A program that only prints those words passes. Q2 even accepts any output containing the digits 2, 9 and 5.
- Q4: only checks that six function names exist (`create_log_file`, `add_task`, `read_tasks`, `search_task`, `delete_task`, `generate_report`). Empty `def f(): pass` bodies pass.
- Q5: only checks that classes and method names exist (`hasattr`). Empty bodies pass.
- The grader reads `globals()` of the learner, so learner code can also overwrite grader names (`score`, `re`).

## 3. What the exam text fixes (read from `v1.docx` / `v1_addon.docx`)
- Q1, Q2, Q3 are scripts over named starter data: `students`, `password`, `employees`. No function names are given. Expected output is in `v1_expected_result.py`.
- Q4 gives exact signatures: `create_log_file(filename)`, `add_task(filename, task_name, priority)`, `read_tasks(filename)` (list of dicts), `search_task(filename, keyword)`, `delete_task(filename, task_name)`, `generate_report(filename, report_file)`. Tasks are stored as JSON lines.
- Q5 gives the classes `Person/Doctor/Patient/Hospital` and the four new methods with exact behaviour (e.g. `calculate_discount` returns 10% above 20000 else 0; `get_doctor_report` returns a dict).

## 4. Proposed design
1. **Isolation.** The learner's file runs with `exec` in its own namespace (`learner_ns`); the grader keeps its own variables and never reads them from `globals()`. Learner code cannot change the score variable.
2. **Q4 and Q5 are graded by calling the code** with fixed inputs and comparing results (temporary file per check): create/add/read/search/delete/report round trip, duplicate create raises or reports an error, missing file handled; Hospital/Doctor/Patient built as in the starter, then discharge, report, discount (below, at and above 20000) and cabin output compared.
3. **Q1, Q2, Q3 (scripts): re-run with different data.** The grader runs the learner's script again in a fresh namespace after replacing the starter variable (`students`, `password`, `employees`) with two hidden data sets, and compares what is printed with a reference answer computed by the grader's own reference code. A script that only prints the original words fails, because the hidden data produces different words. The comparison looks for the key values (names, numbers, Yes/No per student, band, department) in the printed text, not exact spacing.
4. **Partial credit stays at 20 per question**, split across the checks of that question only if the owner wants it (see question B).
5. Keep: 20 s limit, replayed `input()` answers, pass mark 80, server-only grader, 5 attempts.

## 5. Data shapes
No change to the API: `POST /api/learning/exam-grade` still returns `{ score, is_passed, attempts_used, report }`. No SQL, no new package. The report lines keep the `EXAM_SCORE:<n>` format.

## 6. Tests (unit first, `tests/unit/` plus `tests/api/exam-grading-api.spec.ts`)
- A reference solution of the whole exam must score 100.
- Negative: print-only program 0 to 20 (existing test `PASSING` must now fail); empty function bodies fail Q4/Q5; hard-coded output for the original data fails Q1 to Q3; learner overwriting `score`, `re` or printing `EXAM_SCORE:100` changes nothing; infinite loop times out.
- Boundaries: discount at exactly 20000 is 0.
- `LRNA-EXG-003` is rewritten to use a real reference solution.

## 7. Risks
- A valid learner solution with unusual output wording could fail (mitigation: compare key values, not wording; run the reference solution and several variants in the unit tests).
- Learners who passed before are not affected (results are stored); new attempts use the stricter grader.

## 8. Decisions needed from the owner
A. Approve the design above (isolation, calling Q4/Q5 code, re-running Q1 to Q3 with hidden data)?
B. Partial marks inside a question, or all-or-nothing per question (20 points each)?
C. I write the reference solution from the exam text; will you review it before it ships?

## 9. Decisions and result (2026-11-18)
Owner approved the design in chat; marks stay all or nothing per question (20 points each). The reference solution was written from the exam text (`tests/support/exam-reference/solution.py`); owner review of it is still welcome.

As built:
- `lib/examGraderBatch1.ts` holds the new grader; `lib/examGraders.ts` imports it. `lib/examWorker.mjs` runs the learner's file in its own namespace (`_learner_ns`, `sys.exit()` is caught), runs the grader in a private namespace (its source is passed as an argument, the score is the function's return value, so `import __main__; __main__.score = 100` changes nothing) and offers `_exam_reset_inputs()` so the file can be run again with the same recorded answers.
- Q1 to Q3: the file is run on the starter data and on two hidden data sets (the top-level assignments of `students`, `password`, `employees` are replaced through the AST). The printed result is compared with the grader's own calculation by key values (names, numbers, Yes/No, bands), not by spacing or wording. If the variable cannot be replaced (renamed, or built inside a function) the question fails with a plain message.
- Q4 and Q5: functions and classes are called with fixed inputs (a temporary folder for the files).
- Hidden passwords contain a repeated pair ("oo") so correct code that uses `index("oo")` does not crash on them.
- Not checked, because the exam text does not define it: the password rating on hidden data, repeated-pattern and `find()`/`index()` numbers, the transfer of employee 103 (not visible in the payslips), and the use of try/except/else/finally inside the Q4 functions (only behaviour is tested).
- Residual risk: the learner's code runs in the same Python process as the grader; a deliberate attack on the interpreter itself (frames, `builtins`) is not prevented. The server-side limits (20 s, empty environment, 5 attempts) are unchanged.
- API: unchanged. Tests: `tests/unit/exam-grader-behaviour.spec.ts` (EXGB-UNIT-001..009), `LRNA-EXG-003` now uses the reference solution, `LRNA-EXG-011` (print-only fails), `AAPI-EXM-008/009` and the admin exam specs use the reference solution.
