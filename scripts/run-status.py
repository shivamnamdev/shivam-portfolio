"""Turns a Playwright JSON report into a dated run-status page.

Usage: python3 -I scripts/run-status.py <report.json> <YYYY-MM-DD> [--retries N] [--note "text"]
Writes docs/testing/runs/<date>.md and refreshes docs/testing/runs/README.md (newest first).
A test counts as: passed (first try), flaky (passed after a retry), failed (every attempt failed), skipped (fixme/skip).
"""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ID = re.compile(r"\[([A-Z]+(?:-[A-Z0-9]+)+-\d+)\]")
TICKET = re.compile(r"SCP-\d+")


def walk(suite, trail=()):
    here = trail + ((suite["title"],) if suite.get("title") else ())
    for spec in suite.get("specs", []):
        yield spec, here
    for child in suite.get("suites", []):
        yield from walk(child, here)


def first_line(text: str) -> str:
    text = re.sub(r"\x1b\[[0-9;]*m", "", text or "")
    for line in text.splitlines():
        if line.strip():
            return line.strip()[:160]
    return ""


def main() -> None:
    report, date = Path(sys.argv[1]), sys.argv[2]
    retries = sys.argv[sys.argv.index("--retries") + 1] if "--retries" in sys.argv else "?"
    note = sys.argv[sys.argv.index("--note") + 1] if "--note" in sys.argv else ""
    data = json.loads(report.read_text())
    rows = []
    for spec, trail in walk({"suites": data["suites"]}):
        for t in spec["tests"]:
            results = t["results"]
            statuses = [r["status"] for r in results]
            final = statuses[-1] if statuses else "skipped"
            if t["status"] == "skipped" or final == "skipped":
                kind = "skipped"
            elif t["status"] == "flaky":
                kind = "flaky"
            elif t["status"] == "expected":
                kind = "passed"
            else:
                kind = "failed"
            err = ""
            for r in results:
                if r.get("error", {}).get("message"):
                    err = first_line(r["error"]["message"])
            rows.append(dict(file=spec["file"], title=spec["title"], kind=kind, attempts=len(results), error=err,
                             ids=ID.findall(spec["title"]), tickets=TICKET.findall(spec["title"]),
                             ms=sum(r.get("duration", 0) for r in results)))
    total = Counter(r["kind"] for r in rows)
    by_folder = defaultdict(Counter)
    for r in rows:
        folder = "/".join(r["file"].split("/")[:2]) if "/" in r["file"] else r["file"]
        by_folder[folder][r["kind"]] += 1
    stats = data.get("stats", {})
    mins = round(stats.get("duration", 0) / 60000, 1)

    out = [f"# Automation run status: {date}", "",
           f"Chromium, `--workers=1 --retries={retries}`, QA Supabase project, QA fixture course on, personas seeded. Duration {mins} min.",
           note, "",
           "| Result | Tests |", "| --- | --- |",
           f"| Passed (first try) | {total['passed']} |", f"| Flaky (passed after a retry) | {total['flaky']} |",
           f"| **Failed (every attempt)** | **{total['failed']}** |", f"| Skipped (`test.fixme` or a visible skip) | {total['skipped']} |",
           f"| Total | {len(rows)} |", "", "## By folder", "", "| Folder | Passed | Flaky | Failed | Skipped |", "| --- | --- | --- | --- | --- |"]
    for folder in sorted(by_folder):
        c = by_folder[folder]
        out.append(f"| `{folder}` | {c['passed']} | {c['flaky']} | {c['failed']} | {c['skipped']} |")

    failed = [r for r in rows if r["kind"] == "failed"]
    out += ["", f"## Failed after {int(retries) + 1 if retries.isdigit() else 'all'} attempts ({len(failed)})", "",
            "| Case ids | Test | Attempts | Ticket | First error |", "| --- | --- | --- | --- | --- |"]
    for r in sorted(failed, key=lambda r: r["file"]):
        title = r["title"].replace("|", "/")[:110]
        out.append(f"| {' '.join(r['ids']) or '-'} | `{r['file']}`: {title} | {r['attempts']} | {' '.join(r['tickets']) or '**none**'} | {r['error'].replace('|', '/')} |")
    flaky = [r for r in rows if r["kind"] == "flaky"]
    out += ["", f"## Flaky ({len(flaky)})", ""]
    out += [f"- `{r['file']}`: {r['title'][:120]} ({r['attempts']} attempts)" for r in flaky] or ["None."]
    skipped = [r for r in rows if r["kind"] == "skipped"]
    out += ["", f"## Skipped ({len(skipped)})", ""]
    out += [f"- {' '.join(r['ids']) or r['title'][:80]}" for r in skipped] or ["None."]
    runs = ROOT / "docs/testing/runs"
    runs.mkdir(parents=True, exist_ok=True)
    (runs / f"{date}.md").write_text("\n".join(out) + "\n")

    index = ["# Automation run history", "", "One page per full run (newest first). Produced by `scripts/run-status.py` from the Playwright JSON report.", "",
             "| Date | Passed | Flaky | Failed | Skipped | Page |", "| --- | --- | --- | --- | --- | --- |"]  # Jira keys are added by hand in the README
    summaries = {}
    for p in runs.glob("20*.md"):
        text = p.read_text()
        g = lambda label: (re.search(rf"\| \**(?:{label})[^|]*\| \**(\d+)\**", text) or [0, "0"])[1]
        summaries[p.stem] = (g("Passed"), g("Flaky"), g("Failed"), g("Skipped"))
    for d in sorted(summaries, reverse=True):
        a, b, c, s = summaries[d]
        index.append(f"| {d} | {a} | {b} | {c} | {s} | [{d}.md]({d}.md) |")
    (runs / "README.md").write_text("\n".join(index) + "\n")
    print(dict(total), "failed with no ticket:", sum(1 for r in failed if not r["tickets"]))


main()
