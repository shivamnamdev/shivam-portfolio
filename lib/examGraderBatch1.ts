// lib/examGraderBatch1.ts
// Server-only. The grader of "Python Batch 1 final exam" (docs/architecture/exam-grader-behaviour.md, SCP-88).
// It runs in the sandbox of lib/examWorker.mjs, which gives it:
//   _exam_code        the learner's file as text
//   _learner_ns       the namespace the learner's file was run in (a separate dict, never this grader's globals)
//   _exam_reset_inputs()  replays the typed answers for input() from the start
// and the learner's printed text so far in sys.stdout. The grader sets the global `score` (0-100) and prints EXAM_SCORE:<n>.
//
// How each question is marked (20 points each, all or nothing):
//   Q1, Q2, Q3  the learner's file is run again on two hidden data sets (the starter variables `students`, `password`, `employees`
//               are replaced) and the printed result is compared with the grader's own calculation, as well as on the starter data.
//               A program that only prints the expected words cannot pass: with other data the right words are different.
//   Q4, Q5      the learner's functions and classes are called with fixed inputs and the results are compared.
// String.raw keeps the Python backslashes as written; the text must not contain a back-tick or a dollar-brace pair.

export const PYTHON_BATCH_1_FINAL = String.raw`
import sys, io, os, re, ast, json, copy, tempfile

_SRC = _exam_code
_NS = _learner_ns
_FIRST = sys.stdout.getvalue()
score = 0
PER_Q = 20

print("\n" + "=" * 50)
print("🤖 SHIVAM ACADEMY AUTO-GRADER RUNNING...")
print("=" * 50)

# ---------------------------------------------------------------- running the learner's code again
def _rerun(data):
    """Run the learner's file again in a fresh namespace with some top-level variables replaced.
    Returns (printed text, names of the variables that could be replaced)."""
    seen = set()
    try:
        tree = ast.parse(_SRC)
        for node in tree.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                nm = node.targets[0].id
                if nm in data and nm not in seen:
                    node.value = ast.parse(repr(data[nm]), mode="eval").body
                    seen.add(nm)
        ast.fix_missing_locations(tree)
        code = compile(tree, "main.py", "exec")
    except BaseException:
        return "", set()
    ns = {"__name__": "__main__", "__file__": "main.py"}
    old_out, old_err, old_cwd = sys.stdout, sys.stderr, os.getcwd()
    buf = io.StringIO()
    sys.stdout = buf
    sys.stderr = io.StringIO()
    try:
        os.chdir(tempfile.mkdtemp())
        _exam_reset_inputs()
        exec(code, ns)
    except BaseException:
        pass
    finally:
        sys.stdout, sys.stderr = old_out, old_err
        os.chdir(old_cwd)
    return buf.getvalue(), seen

def _call(fn, *args):
    """Call a learner function with its printing captured: (return value, printed text)."""
    old = sys.stdout
    buf = io.StringIO()
    sys.stdout = buf
    try:
        r = fn(*args)
    finally:
        sys.stdout = old
    return r, buf.getvalue()

# ---------------------------------------------------------------- reading the printed text
def _word(name):
    return re.compile(r"(?<![A-Za-z0-9_])" + re.escape(name) + r"(?![A-Za-z0-9_])")

def _names_in(text, names):
    hits = []
    for n in names:
        m = _word(n).search(text)
        if m:
            hits.append((m.start(), n))
    return [n for _, n in sorted(hits)]

def _names_near(text, rx, skip, names, stops):
    """The names printed on the first line matching rx, or, when that line has none, on the lines that follow it."""
    lines = text.splitlines()
    for i, l in enumerate(lines):
        if re.search(rx, l, re.I) and not (skip and re.search(skip, l, re.I)):
            found = _names_in(l, names)
            if not found:
                chunk = []
                for nxt in lines[i + 1:]:
                    if not nxt.strip() or any(re.search(s, nxt, re.I) for s in stops):
                        break
                    chunk.append(nxt)
                found = _names_in("\n".join(chunk), names)
            if found:
                return found
    return []

def _tok(n):
    return re.compile(r"(?<![\d.])" + re.escape(str(n)) + r"(?:\.0+)?(?!\d)")

# ---------------------------------------------------------------- Q1: students
_STUDENTS = [["Rahul", 78, 85, 90, 67, 72], ["Smeeta", 92, 88, 76, 95, 81], ["Amit", 55, 60, 45, 70, 65],
             ["Jaskeerat", 88, 91, 84, 79, 93], ["Niraj", 40, 52, 61, 73, 85]]
_STOP1 = [r"topper|highest", r"lowest", r"sort", r"improv", r"above|\b80\b|3\+|at least"]

def _q1_ok(text, students):
    names = [s[0] for s in students]
    avg = {s[0]: sum(s[1:]) / (len(s) - 1) for s in students}
    top = max(names, key=lambda n: avg[n])
    low = min(names, key=lambda n: avg[n])
    above = {s[0] for s in students if sum(1 for m in s[1:] if m > 80) >= 3}
    order = sorted(names, key=lambda n: -avg[n])
    if _names_near(text, r"topper|highest", None, names, _STOP1) != [top]:
        return False
    if _names_near(text, r"lowest", None, names, _STOP1) != [low]:
        return False
    if set(_names_near(text, r"above|\b80\b|3\+|at least", r"sort|improv|topper|lowest", names, _STOP1)) != above:
        return False
    if _names_near(text, r"sort", None, names, _STOP1) != order:
        return False
    for s in students:
        want = "yes" if s[-1] > s[-2] else "no"
        got = [m.lower() for m in re.findall(_word(s[0]).pattern + r"\W{0,6}(Yes|No)\b", text, re.I)]
        if not got or any(g != want for g in got):
            return False
    return True

# ---------------------------------------------------------------- Q2: password
_PASSWORD = "Pyth0n@School2025!"

def _label_number(text, label):
    for l in text.splitlines():
        m = re.search(r"\b" + label + r"\b[^0-9\n]*(\d+)", l, re.I)
        if m and not re.search(r"\bhas\b", l, re.I):
            return int(m.group(1))
    return None

def _yes_no(text, rx):
    out = []
    for l in text.splitlines():
        if re.search(rx, l, re.I):
            m = re.search(r"\b(yes|no)\b", l, re.I)
            out.append(m.group(1).lower() if m else None)
    return out

def _q2_ok(text, pw, original):
    up = sum(c.isupper() for c in pw)
    lo = sum(c.islower() for c in pw)
    di = sum(c.isdigit() for c in pw)
    sp = len(pw) - sum(c.isalnum() for c in pw)
    for label, want in (("uppercase", up), ("lowercase", lo), ("digits?", di), ("special", sp)):
        if _label_number(text, label) != want:
            return False
    if pw[:2] + "*" * (len(pw) - 4) + pw[-2:] not in text or pw[::-1] not in text:
        return False
    if pw[:4] not in text or pw[-4:] not in text:
        return False
    yn = lambda s: "yes" if s else "no"
    if _yes_no(text, r"has\s+upper") != [yn(any(c.isupper() for c in pw[:4])), yn(any(c.isupper() for c in pw[-4:]))]:
        return False
    if _yes_no(text, r"has\s+digit") != [yn(any(c.isdigit() for c in pw[:4])), yn(any(c.isdigit() for c in pw[-4:]))]:
        return False
    pal = {pw[i:i + 3] for i in range(len(pw) - 2) if pw[i:i + 3] == pw[i:i + 3][::-1]}
    if pal and not any(re.search("palindrom", l, re.I) and all(p in l for p in pal) for l in text.splitlines()):
        return False
    if original and not re.search(r"\bMedium\b", text, re.I):
        return False
    return True

# ---------------------------------------------------------------- Q3: payroll
_EMPLOYEES = {101: {"name": "Rahul", "department": "IT", "salary": 45000, "attendance": 20},
              102: {"name": "Priya", "department": "HR", "salary": 55000, "attendance": 22},
              103: {"name": "Amit", "department": "IT", "salary": 30000, "attendance": 18},
              104: {"name": "Smeeta", "department": "Finance", "salary": 60000, "attendance": 21},
              105: {"name": "Niraj", "department": "HR", "salary": 25000, "attendance": 22}}

def _q3_ok(text, emps):
    groups = {}
    for e in emps.values():
        groups.setdefault(e["department"], []).append(e["salary"])
    avgs = {d: sum(v) / len(v) for d, v in groups.items()}
    best = max(avgs, key=lambda d: avgs[d])
    for d, a in avgs.items():
        ok = False
        for l in text.splitlines():
            if _word(d).search(l) and re.search(r"averag", l, re.I):
                if any(abs(float(n) - a) < 0.01 for n in re.findall(r"\d+(?:\.\d+)?", l)):
                    ok = True
        if not ok:
            return False
    hl = [l for l in text.splitlines() if re.search(r"highest", l, re.I)]
    if not any(_word(best).search(l) and not any(_word(d).search(l) for d in avgs if d != best) for l in hl):
        return False
    after = copy.deepcopy(emps)
    fired = after.pop(105)
    after[101]["salary"] += 10000
    low = text.lower()
    tail = text[low.rfind("payslip"):] if "payslip" in low else text
    slips = []
    for e in after.values():
        ded = 500 * (22 - e["attendance"]) if e["attendance"] < 22 else 0
        gross = e["salary"]
        band = "Junior" if gross < 20000 else ("Mid" if gross <= 50000 else "Senior")
        slips.append((e["name"], gross, ded, gross - ded, band))
    if _word(fired["name"]).search(tail):
        return False
    marks = []
    for s in slips:
        m = _word(s[0]).search(tail)
        if not m:
            return False
        marks.append((m.start(), s))
    marks.sort(key=lambda x: x[0])
    for i, (pos, s) in enumerate(marks):
        chunk = tail[pos: marks[i + 1][0] if i + 1 < len(marks) else len(tail)]
        if not (_tok(s[1]).search(chunk) and _tok(s[2]).search(chunk) and _tok(s[3]).search(chunk)):
            return False
        if not re.search(r"\b" + s[4] + r"\b", chunk, re.I) or any(re.search(r"\b" + b + r"\b", chunk, re.I) for b in ("Junior", "Mid", "Senior") if b != s[4]):
            return False
    return True

# ---------------------------------------------------------------- hidden data (never shown to learners)
_HIDDEN = [
    {"students": [["Kiran", 82, 84, 91, 60, 70], ["Meera", 95, 55, 62, 71, 66], ["Tarun", 45, 50, 58, 52, 49], ["Zoya", 83, 87, 90, 79, 74], ["Dev", 66, 72, 68, 81, 80]],
     "password": "Tr1ckyPoor#wow77",
     "employees": {101: {"name": "Karan", "department": "Sales", "salary": 48000, "attendance": 19},
                   102: {"name": "Asha", "department": "Ops", "salary": 18500, "attendance": 22},
                   103: {"name": "Bela", "department": "Sales", "salary": 52000, "attendance": 22},
                   104: {"name": "Chirag", "department": "Tech", "salary": 70000, "attendance": 20},
                   105: {"name": "Dhruv", "department": "Ops", "salary": 21000, "attendance": 21}}},
    {"students": [["Ishaan", 90, 91, 92, 93, 70], ["Nora", 60, 61, 62, 63, 64], ["Vikram", 85, 70, 88, 90, 95], ["Lena", 30, 40, 50, 60, 55], ["Omar", 75, 76, 77, 78, 79]],
     "password": "gOLDfoolish!Secret",
     "employees": {101: {"name": "Mina", "department": "Ops", "salary": 49000, "attendance": 22},
                   102: {"name": "Raj", "department": "Tech", "salary": 20000, "attendance": 15},
                   103: {"name": "Sia", "department": "Tech", "salary": 61000, "attendance": 21},
                   104: {"name": "Tej", "department": "Ops", "salary": 35000, "attendance": 22},
                   105: {"name": "Uma", "department": "Tech", "salary": 30000, "attendance": 22}}},
]

_runs = [_rerun({"students": h["students"], "password": h["password"], "employees": h["employees"]}) for h in _HIDDEN]

def _data_question(var, check_own, check_hidden):
    """True when the question holds on the starter data and on every hidden data set."""
    if not check_own(_FIRST):
        return False, "own"
    for i, (text, seen) in enumerate(_runs):
        if var not in seen or not check_hidden(text, _HIDDEN[i]):
            return False, "hidden"
    return True, ""

_HINT = "Your program must calculate from the data (keep it in the variable named in the instructions) and print the results; printing fixed words does not count."

def _award(label, ok, why, good, bad):
    global score
    if ok:
        score += PER_Q
        print("✅ " + label + " passed! " + good)
    elif why == "hidden":
        print("❌ " + label + " failed: it gave the right answer on the given data but not on different data. " + _HINT)
    else:
        print("❌ " + label + " failed: " + bad)

# ---------------------------------------------------------------- Q1, Q2, Q3
try:
    ok, why = _data_question("students", lambda t: _q1_ok(t, _STUDENTS), lambda t, h: _q1_ok(t, h["students"]))
    _award("Q1 (Lists)", ok, why, "Excellent data extraction and improvement logic.", "Check the topper, the lowest scorer, the 3+ subjects above 80, the sorted order and the Improvement Report (Yes/No).")
except Exception as e:
    print("❌ Q1 (Lists) crashed: " + str(e))

try:
    ok, why = _data_question("password", lambda t: _q2_ok(t, _PASSWORD, True), lambda t, h: _q2_ok(t, h["password"], False))
    _award("Q2 (Strings)", ok, why, "Great slicing and formatting.", "Check your character counts, first/last 4 checks, masking, reversal, palindromes and the final rating.")
except Exception as e:
    print("❌ Q2 (Strings) crashed: " + str(e))

try:
    ok, why = _data_question("employees", lambda t: _q3_ok(t, _EMPLOYEES), lambda t, h: _q3_ok(t, h["employees"]))
    _award("Q3 (Dictionaries)", ok, why, "Perfect payroll calculations.", "Verify the department averages, the highest paying department, and every final payslip (gross, deductions, net, band).")
except Exception as e:
    print("❌ Q3 (Dictionaries) crashed: " + str(e))

# ---------------------------------------------------------------- Q4: task logger functions, called with fixed inputs
def _q4():
    f = {n: _NS.get(n) for n in ("create_log_file", "add_task", "read_tasks", "search_task", "delete_task", "generate_report")}
    missing = [n for n, v in f.items() if not callable(v)]
    if missing:
        return "these functions are missing: " + ", ".join(missing)
    d = tempfile.mkdtemp()
    log, rep, gone = os.path.join(d, "tasks.log"), os.path.join(d, "report.txt"), os.path.join(d, "nothing.log")
    _call(f["create_log_file"], log)
    if not os.path.exists(log):
        return "create_log_file did not create the file"
    _call(f["create_log_file"], log)   # a second call must be handled (FileExistsError), not crash
    for name, pr in (("Buy milk", "High"), ("Write report", "Low"), ("Call Mia", "High")):
        _call(f["add_task"], log, name, pr)
    rows = [l for l in open(log).read().splitlines() if l.strip()]
    if len(rows) != 3:
        return "add_task should add one line per task"
    parsed = [json.loads(r) for r in rows]
    if not all(isinstance(p, dict) for p in parsed) or not all(n in json.dumps(parsed) for n in ("Buy milk", "Write report", "Call Mia", "High", "Low")):
        return "add_task should store each task (name and priority) as a JSON line"
    tasks, _ = _call(f["read_tasks"], log)
    if not isinstance(tasks, list) or len(tasks) != 3 or not all(isinstance(t, dict) for t in tasks):
        return "read_tasks should return a list with one dict per task"
    _call(f["read_tasks"], gone)       # a missing file must be handled
    found, shown = _call(f["search_task"], log, "report")
    seen = json.dumps(found, default=str) + shown
    if "Write report" not in seen or "Buy milk" in seen or "Call Mia" in seen:
        return "search_task should find the tasks containing the keyword (and only those)"
    _call(f["delete_task"], log, "Buy milk")
    left, _ = _call(f["read_tasks"], log)
    if not isinstance(left, list) or len(left) != 2 or "Buy milk" in json.dumps(left) or "Call Mia" not in json.dumps(left):
        return "delete_task should remove only the matching task and keep the others"
    _call(f["delete_task"], log, "No such task")
    again, _ = _call(f["read_tasks"], log)
    if not isinstance(again, list) or len(again) != 2:
        return "delete_task of a task that does not exist should be handled and change nothing"
    _call(f["generate_report"], log, rep)
    if not os.path.exists(rep):
        return "generate_report did not write the report file"
    text = open(rep).read()
    if "Write report" not in text or "Call Mia" not in text or "Buy milk" in text:
        return "the report should list the remaining tasks"
    return ""

try:
    why = _q4()
    if why:
        print("❌ Q4 (File Handling) failed: " + why + ".")
    else:
        score += PER_Q
        print("✅ Q4 (File Handling) passed! The functions work on a real file.")
except Exception as e:
    print("❌ Q4 (File Handling) crashed: " + str(e))

# ---------------------------------------------------------------- Q5: hospital classes, called with fixed inputs
def _q5():
    H, D, P = _NS.get("Hospital"), _NS.get("Doctor"), _NS.get("Patient")
    if not (H and D and P):
        return "the classes Hospital, Doctor and Patient were not found. Did you rename them?"
    h = H()
    d1 = D("Sharma", 45, "9876543210", "Cardiology")
    d1.set_availability("Monday")
    d1.set_availability("Thursday")
    d1.add_patient("Rahul")
    d2 = D("Verma", 38, "8765432109", "Neurology")
    p1 = P("Rahul", 30, "7654321098", "Heart Block")
    p1.add_bill(15000)
    p1.add_bill(8000)
    p2 = P("Priya", 25, "6543210987", "Migraine")
    for x in (d1, d2):
        h.add_doctor(x)
    for x in (p1, p2):
        h.add_patient(x)
    _, out = _call(h.show_doctors)
    if "Dr. Sharma - Cardiology" not in out or "Dr. Verma - Neurology" not in out:
        return "show_doctors should print 'Dr. Sharma - Cardiology' and 'Dr. Verma - Neurology' (the original errors are not all fixed)"
    _, out = _call(h.show_patients)
    if "Patient: Rahul - Heart Block" not in out or "Patient: Priya - Migraine" not in out:
        return "show_patients should print each patient (the original errors are not all fixed)"
    if p1.get_total_bill() != 23000 or d1.get_age() != 45:
        return "get_total_bill / get_age give wrong values"
    for obj, text in ((d1, "Dr. Sharma is on duty."), (p1, "Patient Rahul checked in."), (h, "Hospital system running...")):
        if text not in _call(obj.execute)[1]:
            return "execute should print '" + text + "'"
    if abs(p1.calculate_discount() - 2300) > 0.01:
        return "calculate_discount should give 10% of a bill above 20000 (2300.0 for 23000)"
    for bills, want in (([20000], 0), ([20001], 2000.1), ([5000], 0)):
        t = P("T", 20, "0", "x")
        for b in bills:
            t.add_bill(b)
        if abs(t.calculate_discount() - want) > 0.01:
            return "calculate_discount should give 0 up to and including 20000 and 10% above it"
    if "Dr. Sharma - Floor: 2, Room: 5" not in _call(d1.show_cabin)[1]:
        return "show_cabin should print 'Dr. Sharma - Floor: 2, Room: 5'"
    rep, _ = _call(h.get_doctor_report, "Sharma")
    if not isinstance(rep, dict) or rep.get("name") not in ("Dr. Sharma", "Sharma") or rep.get("specialization") != "Cardiology" or rep.get("patients_count") != 1 or set(rep.get("available_days", [])) != {"Monday", "Thursday"} or len(rep) != 4:
        return "get_doctor_report should return name, specialization, patients_count and available_days"
    if "Doctor not found" not in _call(h.get_doctor_report, "Nobody")[1]:
        return "get_doctor_report should print 'Doctor not found' for an unknown doctor"
    if "Patient not found" not in _call(h.discharge_patient, "Nobody")[1]:
        return "discharge_patient should print 'Patient not found' for an unknown patient"
    _call(h.discharge_patient, "Priya")
    out = _call(h.show_patients)[1]
    if "Priya" in out or "Rahul" not in out:
        return "discharge_patient should remove only the named patient"
    return ""

try:
    why = _q5()
    if why:
        print("❌ Q5 (OOPs) failed: " + why + ".")
    else:
        score += PER_Q
        print("✅ Q5 (OOPs) passed! Errors fixed and the new methods work.")
except Exception as e:
    print("❌ Q5 (OOPs) crashed: " + str(e))

# ---------------------------------------------------------------- FINAL OUTPUT FOR THE REACT FRONTEND
print("=" * 50)
print("EXAM_SCORE:" + str(score))
print("=" * 50)
`;
