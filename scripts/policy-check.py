"""Grades the CSV exported from docs/testing/sql/policy-inventory.sql (cases DBI-POL-001..010, 013).

Usage: python3 -I scripts/policy-check.py <export.csv> <label, for example QA> [--write docs/testing/runs/policy-QA-YYYY-MM-DD.md]
Each case prints PASS / FAIL / REVIEW with the evidence. REVIEW means a person has to decide (for example a table that is not in the catalog).
Cases POL-012, 014, 015, 016 are manual (dashboard, a re-test, a comparison, a deletion) and are not graded here.
"""
import csv, re, sys
from collections import defaultdict
from pathlib import Path

APP = ["user_enrollments", "video_progress", "video_comments", "assignment_progress", "exam_progress", "user_stats", "admin_activity_log"]
CMS = ["cms_courses", "cms_curriculum", "cms_coupons"]
UNIQUE = {"user_enrollments": ("user_id", "course_slug"), "video_progress": ("user_id", "course_slug", "video_id"),
          "assignment_progress": ("user_id", "course_slug", "video_id"), "exam_progress": ("user_id", "course_slug")}
WRITE = {"INSERT", "UPDATE", "DELETE", "ALL", "TRUNCATE"}


def load(path):
    rows = defaultdict(list)
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            rows[r["case_id"].strip()].append((r["item"].strip(), (r["detail"] or "").strip()))
    return rows


def main():
    rows, label = load(sys.argv[1]), sys.argv[2]
    out, res = [], {}

    def add(case, verdict, text, evidence=()):
        res[case] = verdict
        out.append(f"### {case}: {verdict}\n\n{text}\n" + "".join(f"- {e}\n" for e in evidence))

    # POL-001 row level security
    rls = {i: d for i, d in rows["POL-001"]}
    off = [t for t in APP + CMS if t in rls and "rls=true" not in rls[t]]
    missing = [t for t in APP if t not in rls]
    add("DBI-POL-001", "PASS" if not off and not missing else "FAIL", "Row level security is on for every table.",
        [f"RLS OFF: {', '.join(off)}"] * bool(off) + [f"table missing: {', '.join(missing)}"] * bool(missing) or ["all app tables have rls=true"])

    # POL-002 policies and POL-005 per-user rule
    pols = rows["POL-002"]
    risky = []
    for item, d in pols:
        table = item.split(" / ")[0]
        cmd = re.search(r"cmd=(\w+)", d).group(1)
        roles = re.search(r"roles=(\{[^}]*\}|\S+)", d).group(1)
        public_role = any(x in roles for x in ("anon", "authenticated", "public"))
        if table == "user_enrollments" and cmd in WRITE and public_role:
            risky.append(f"{item}: {cmd} for {roles} (user_enrollments must be written by the server only)")
    cmd_of = lambda d: re.search(r"cmd=(\w+)", d).group(1)
    wide = [f"{i}: {cmd_of(d)} using true" for i, d in pols
            if re.search(r"using=\(?true\)?( |$)", d) and cmd_of(d) in ("INSERT", "UPDATE", "DELETE", "ALL")]
    add("DBI-POL-002", "FAIL" if risky else ("REVIEW" if wide else "PASS"),
        "No write policy for anon or authenticated on user_enrollments; no 'using (true)' write policy elsewhere.",
        risky + [f"open write policy: {w}" for w in wide] or ["no risky policy found"])
    per_user = [i for i, d in pols if re.search(r"jwt|auth\.uid|'sub'", d)]
    add("DBI-POL-005", "PASS" if per_user else "FAIL", "Learner rows are limited to the caller's own user_id (JWT subject).",
        [f"per-user policy: {p}" for p in per_user] or [f"{len(pols)} policies, none refers to the JWT or auth.uid(): every row is open to every caller"])

    # POL-003 grants
    grants = rows["POL-003"]
    bad = [f"{i}: {d}" for i, d in grants if i.startswith("user_enrollments") and WRITE & set(d.split(","))]
    other = [f"{i}: {d}" for i, d in grants if not i.startswith("user_enrollments") and WRITE & set(d.split(",")) and i.split(" / ")[1] in ("anon", "authenticated")]
    add("DBI-POL-003", "FAIL" if bad else ("REVIEW" if other else "PASS"), "No write privilege for anon or authenticated on user_enrollments.",
        bad + [f"also writable by a public role: {o}" for o in other] or ["no write grant on user_enrollments"])

    # POL-004 constraints and indexes
    defs = " | ".join(f"{i} {d}" for i, d in rows["POL-004"]).lower()
    missing_u = []
    for table, cols in UNIQUE.items():
        found = any(f"{table}" in (i + d).lower() and "unique" in d.lower() and all(c in d.lower() for c in cols) for i, d in rows["POL-004"])
        if not found: missing_u.append(f"{table} ({', '.join(cols)})")
    no_idx = [t for t in APP if t != "user_stats" and not any(i.lower().startswith(t) and "user_id" in d.lower() for i, d in rows["POL-004"] if "unique" not in d.lower() or True)]
    add("DBI-POL-004", "FAIL" if missing_u else ("REVIEW" if no_idx else "PASS"), "Unique rules and an index on user_id exist.",
        [f"missing unique rule: {m}" for m in missing_u] + [f"no index or key containing user_id: {t}" for t in no_idx] or ["all expected unique rules and indexes found"])

    # POL-006 functions and views
    fv = rows["POL-006"]
    definer = [i for i, d in fv if "security=DEFINER" in d]
    add("DBI-POL-006", "FAIL" if definer else ("REVIEW" if fv else "PASS"), "No SECURITY DEFINER function callable by anon; views and functions are known.",
        [f"SECURITY DEFINER: {d}" for d in definer] + [f"{d}: {i}" for i, d in fv if "DEFINER" not in d] or ["no public functions or views"])

    # POL-007 cms tables
    cms = {i: d for i, d in rows["POL-007"]}
    add("DBI-POL-007", "REVIEW", "The cms_ tables are not used by the application: decide to drop them or lock them to the service role.",
        [f"{t}: {cms.get(t, '?')} rows" for t in CMS])

    # POL-008 orphans
    orphan = rows["POL-008"]
    add("DBI-POL-008", "REVIEW", "Orphan counts are known and explained (no foreign keys exist because user ids come from Clerk).", [f"{i}: {d}" for i, d in orphan])

    # POL-009 publications, POL-010 buckets
    pub = rows["POL-009"]
    add("DBI-POL-009", "FAIL" if pub else "PASS", "No learner table is published to Realtime.", [f"published: {i}" for i, _ in pub] or ["no publication on public tables"])
    bk = rows["POL-010"]
    pub_bk = [i for i, d in bk if d == "public=true"]
    add("DBI-POL-010", "REVIEW" if pub_bk else "PASS", "No public storage bucket holds private data.", [f"public bucket: {b}" for b in pub_bk] or [f"{len(bk)} buckets, none public"])

    # POL-013 extensions
    ext = {i: d for i, d in rows["POL-013"]}
    add("DBI-POL-013", "PASS" if "uuid-ossp" in ext else "FAIL", "uuid-ossp is present (the id defaults use extensions.uuid_generate_v4()).", [f"{k} {v}" for k, v in sorted(ext.items())])

    head = [f"# Policy inventory result: {label}", "", f"Graded from `{Path(sys.argv[1]).name}` by `scripts/policy-check.py`. Manual cases POL-012, 014, 015, 016 are not graded here.", "",
            "| Case | Result |", "| --- | --- |"] + [f"| {c} | {v} |" for c, v in sorted(res.items())] + [""]
    text = "\n".join(head + out)
    if "--write" in sys.argv:
        Path(sys.argv[sys.argv.index("--write") + 1]).write_text(text)
    print(text)


main()
