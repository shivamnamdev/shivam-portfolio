"""Builds the manual-test-case workbook (same layout as the owner's PRD 01-03 workbooks) and the cases CSV.

Usage (needs openpyxl, e.g. in a scratch venv):
    python3 scripts/workbooks/build_workbook.py prd04
Output: docs/testing/workbooks/<name>.xlsx and docs/testing/cases/<csv>.csv
"""
import csv, importlib, sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.chart import DoughnutChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[2]
CONFIG = {
    "prd04": dict(module="prd04_cases", prefix="CHK", title="[UI] Checkout Flow Testing",
                  xlsx="[UI] Checkout Flow Testing.xlsx", csv="prd04-checkout.csv"),
    "prd05": dict(module="prd05_cases", prefix="FRE", title="[UI] Free Enrollment Flow Testing",
                  xlsx="[UI] Free Enrollment Flow Testing.xlsx", csv="prd05-free-enrollment.csv"),
    "prd06": dict(module="prd06_cases", prefix="DSH", title="[UI] Student Dashboard and Course Access Testing",
                  xlsx="[UI] Student Dashboard & Course Access Testing.xlsx", csv="prd06-student-dashboard.csv"),
    "prd07": dict(module="prd07_cases", prefix="LRN", title="[UI] Learning Experience Testing",
                  xlsx="[UI] Learning Experience Testing.xlsx", csv="prd07-learning-experience.csv"),
    "prd08": dict(module="prd08_cases", prefix="ADM", title="[UI] Admin Portal Testing",
                  xlsx="[UI] Admin Portal Testing.xlsx", csv="prd08-admin-portal.csv"),
    "prd09": dict(module="prd09_cases", prefix="PAYA", title="[API] Payment APIs Testing",
                  xlsx="[API] Payment APIs Testing.xlsx", csv="prd09-payment-api.csv"),
    "prd10": dict(module="prd10_cases", prefix="ENRA", title="[API] Enrollment APIs Testing",
                  xlsx="[API] Enrollment APIs Testing.xlsx", csv="prd10-enrollment-api.csv"),
    "prd11": dict(module="prd11_cases", prefix="CLKA", title="[API] Clerk Webhook and User Lookup APIs Testing",
                  xlsx="[API] Clerk Webhook and User Lookup APIs Testing.xlsx", csv="prd11-clerk-api.csv"),
    "prd12": dict(module="prd12_cases", prefix="EMLA", title="[API] Email API Testing",
                  xlsx="[API] Email API Testing.xlsx", csv="prd12-email-api.csv"),
    "prd13": dict(module="prd13_cases", prefix="AIA", title="[API] AI Tutor, Certificate and Learning Support APIs Testing",
                  xlsx="[API] AI Tutor Certificate and Learning Support APIs Testing.xlsx", csv="prd13-learning-api.csv"),
    "prd14": dict(module="prd14_cases", prefix="DBI", title="[DB] Database Integrity Testing",
                  xlsx="[DB] Database Integrity Testing.xlsx", csv="prd14-database.csv"),
    "prd15": dict(module="prd15_cases", prefix="PRF", title="[PERF] Performance Testing",
                  xlsx="[PERF] Performance Testing.xlsx", csv="prd15-performance.csv"),
}
HEAD = PatternFill("solid", fgColor="0B5394")
GREY = PatternFill("solid", fgColor="E5E5E5")
WRAP = Alignment(wrap_text=True, vertical="top")
WIDTHS = {"A": 15, "B": 36, "C": 32, "D": 40, "E": 44, "F": 9, "G": 13, "H": 12, "I": 34}
HEADERS = ["TC ID", "Scenario", "Preconditions", "Steps", "Expected Result", "Priority", "Result", "PRD Scenario", "Automated"]


def short(name: str) -> str:               # Excel sheet names are limited to 31 characters and some symbols
    return name.replace("&", "and")[:31]


def build(key: str) -> None:
    cfg = CONFIG[key]
    sys.path.insert(0, str(Path(__file__).parent))
    m = importlib.import_module(cfg["module"])
    wb = Workbook()

    ws = wb.active
    ws.title = "Test User Data"
    ws["A2"] = "Test Data / User Accounts"; ws["A2"].font = Font(bold=True, size=12)
    for col, h in zip("ABC", ["Test Data", "Description", "User ID"]):
        c = ws[f"{col}3"]; c.value = h; c.fill = HEAD; c.font = Font(bold=True, color="FFFFFF")
    for i, (pid, desc, who) in enumerate(m.PERSONAS, start=4):
        ws[f"A{i}"], ws[f"B{i}"], ws[f"C{i}"] = pid, desc, who
        for col in "ABC": ws[f"{col}{i}"].alignment = WRAP
    ws[f"A{len(m.PERSONAS) + 5}"] = "Notes"; ws[f"A{len(m.PERSONAS) + 5}"].font = Font(bold=True)
    ws[f"B{len(m.PERSONAS) + 5}"] = m.LEGEND; ws[f"B{len(m.PERSONAS) + 5}"].alignment = WRAP
    ws.column_dimensions["A"].width = 12; ws.column_dimensions["B"].width = 70; ws.column_dimensions["C"].width = 42

    stats = []        # (requirement label, sheet title, first row, last row)
    rows_csv = []
    for sheet_name, frs, cases in m.SHEETS:
        title = short(sheet_name)
        s = wb.create_sheet(title)
        for col, h in zip("ABCDEFGHI", HEADERS):
            c = s[f"{col}1"]; c.value = h; c.fill = HEAD; c.font = Font(bold=True, color="FFFFFF"); c.alignment = WRAP
        for r, (suffix, scen, pre, steps, exp, prio, ck, auto) in enumerate(cases, start=2):
            tcid = f"{cfg['prefix']}-{suffix}"
            for col, v in zip("ABCDEFGHI", [tcid, scen, pre, steps, exp, prio, None, ck, auto]):
                c = s[f"{col}{r}"]; c.value = v; c.alignment = WRAP
            rows_csv.append([tcid, sheet_name, scen, pre, steps, exp, prio, ""])
        last = len(cases) + 1
        for col, w in WIDTHS.items(): s.column_dimensions[col].width = w
        s.freeze_panes = "A2"
        dv = DataValidation(type="list", formula1='"Passed,Failed,NA"', allow_blank=True)
        s.add_data_validation(dv); dv.add(f"G2:G{last}")
        s.conditional_formatting.add(f"G2:G{last}", CellIsRule(operator="equal", formula=['"Passed"'], fill=PatternFill("solid", bgColor="B7E1CD")))
        s.conditional_formatting.add(f"G2:G{last}", CellIsRule(operator="equal", formula=['"Failed"'], fill=PatternFill("solid", bgColor="F4C7C3")))
        s.conditional_formatting.add(f"G2:G{last}", CellIsRule(operator="equal", formula=['"NA"'], fill=PatternFill("solid", bgColor="FCE8B2")))
        cov = last + 1
        s[f"F{cov}"] = "Coverage"; s[f"F{cov}"].font = Font(bold=True)
        s[f"G{cov}"] = f'=IF(COUNTA(A2:A{last})=0,0,(COUNTIF(G2:G{last},"Passed")+COUNTIF(G2:G{last},"Failed")+COUNTIF(G2:G{last},"NA"))/COUNTA(A2:A{last}))'
        s[f"G{cov}"].number_format = "0%"
        stats.append((f"{frs} — {sheet_name}", title, last, cov))

    t = wb.create_sheet("Traceability to Functional Requ")
    t["A1"], t["B1"] = "Requirement", "Coverage Rate"
    for c in (t["A1"], t["B1"], t["D2"], t["E2"]):
        c.font = Font(bold=True)
    for i, (label, title, last, cov) in enumerate(stats, start=2):
        t[f"A{i}"] = label; t[f"B{i}"] = f"='{title}'!G{cov}"; t[f"B{i}"].number_format = "0%"
    def total(crit):   # sum of COUNTIFs over every case sheet
        return "=" + " + ".join(f"COUNTIF('{ti}'!G2:G{la}, \"{crit}\")" for _, ti, la, _ in stats)
    t["D2"], t["E2"] = "Status", "Count"
    t["D3"], t["E3"] = "Passed", total("Passed")
    t["D4"], t["E4"] = "Failed", total("Failed")
    t["D5"], t["E5"] = "Not Applicable", total("NA")
    t["D6"], t["E6"] = "Not Tested Yet", "=E7-E3-E4-E5"
    t["D7"], t["E7"] = "Total Test Cases", "=" + " + ".join(f"COUNTA('{ti}'!A2:A{la})" for _, ti, la, _ in stats)
    t.column_dimensions["A"].width = 56; t.column_dimensions["B"].width = 14; t.column_dimensions["D"].width = 18
    ch = DoughnutChart(); ch.title = "Execution status"; ch.holeSize = 50
    ch.add_data(Reference(t, min_col=5, min_row=3, max_row=6)); ch.set_categories(Reference(t, min_col=4, min_row=3, max_row=6))
    ch.height, ch.width = 7.5, 11
    t.add_chart(ch, "D9")

    out = ROOT / "docs/testing/workbooks"; out.mkdir(parents=True, exist_ok=True)
    wb.save(out / cfg["xlsx"])
    with open(ROOT / "docs/testing/cases" / cfg["csv"], "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["id", "sheet", "scenario", "preconditions", "steps", "expected", "priority", "manual_result"]); w.writerows(rows_csv)
    print(f"{cfg['xlsx']}: {len(rows_csv)} cases in {len(stats)} sheets")


if __name__ == "__main__":
    build(sys.argv[1])
