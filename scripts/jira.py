"""Small Jira helper for the bug-fix workflow (.claude/skills/bug-fix-workflow/SKILL.md). Reads .env.jira (git-ignored): JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY.

  python3 -I scripts/jira.py create-bug --parent SCP-2 --priority High --labels a,b --summary "..." --description-file desc.txt
  python3 -I scripts/jira.py comment SCP-85 --file comment.txt        (paragraphs separated by a blank line; lines starting with "- " become bullets)
  python3 -I scripts/jira.py link SCP-85 SCP-44                       (type Relates)
  python3 -I scripts/jira.py transition SCP-85 "In Review"

Only these four actions exist on purpose. Text files are plain text, never HTML.
"""
import argparse, base64, json, sys, urllib.request
from pathlib import Path

ENV = dict(l.strip().split("=", 1) for l in open(Path(__file__).resolve().parents[1] / ".env.jira") if "=" in l)
AUTH = base64.b64encode(f"{ENV['JIRA_EMAIL']}:{ENV['JIRA_API_TOKEN']}".encode()).decode()
HEAD = {"Authorization": "Basic " + AUTH, "Content-Type": "application/json"}


def call(path, body=None, method=None):
    req = urllib.request.Request(ENV["JIRA_BASE_URL"] + path, json.dumps(body).encode() if body is not None else None, HEAD, method=method or ("POST" if body is not None else "GET"))
    raw = urllib.request.urlopen(req).read()
    return json.loads(raw) if raw else {}


def adf(text):
    blocks = []
    for para in text.strip().split("\n\n"):
        lines = para.split("\n")
        if all(l.startswith("- ") for l in lines):
            blocks.append({"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": l[2:]}]}]} for l in lines]})
        else:
            blocks.append({"type": "paragraph", "content": [{"type": "text", "text": para.replace("\n", " ")}]})
    return {"type": "doc", "version": 1, "content": blocks}


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create-bug"); c.add_argument("--summary", required=True); c.add_argument("--description-file", required=True)
    c.add_argument("--parent", default="SCP-2"); c.add_argument("--priority", default="Medium"); c.add_argument("--labels", default="qa-automation")
    m = sub.add_parser("comment"); m.add_argument("key"); m.add_argument("--file", required=True)
    l = sub.add_parser("link"); l.add_argument("a"); l.add_argument("b")
    t = sub.add_parser("transition"); t.add_argument("key"); t.add_argument("name")
    a = p.parse_args()
    if a.cmd == "create-bug":
        r = call("/rest/api/3/issue", {"fields": {"project": {"key": ENV["JIRA_PROJECT_KEY"]}, "issuetype": {"name": "Bug"}, "parent": {"key": a.parent},
              "priority": {"name": a.priority}, "labels": a.labels.split(","), "summary": a.summary, "description": adf(Path(a.description_file).read_text())}})
        print(r["key"])
    elif a.cmd == "comment":
        call(f"/rest/api/3/issue/{a.key}/comment", {"body": adf(Path(a.file).read_text())}); print("commented", a.key)
    elif a.cmd == "link":
        call("/rest/api/3/issueLink", {"type": {"name": "Relates"}, "inwardIssue": {"key": a.a}, "outwardIssue": {"key": a.b}}); print("linked", a.a, a.b)
    else:
        ts = call(f"/rest/api/3/issue/{a.key}/transitions")["transitions"]
        hit = [x for x in ts if x["name"].lower() == a.name.lower()]
        if not hit: sys.exit(f"no transition '{a.name}'; available: {', '.join(x['name'] for x in ts)}")
        call(f"/rest/api/3/issue/{a.key}/transitions", {"transition": {"id": hit[0]["id"]}}); print(a.key, "->", hit[0]["name"])


main()
