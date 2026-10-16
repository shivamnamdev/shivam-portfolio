"""Regenerate docs/blast/progress.md from git history.
Usage: python3 -I scripts/generate-progress.py docs/blast/progress.md"""
import subprocess, re, datetime, collections, sys

def g(*a):
    return subprocess.check_output(['git', *a], text=True)

raw = g('log', '--date=short', '--format=@@%ad|%h|%an|%p|%s', '--shortstat')
days = collections.OrderedDict()
cur = None
for line in raw.splitlines():
    if line.startswith('@@'):
        d, h, a, p, s = line[2:].split('|', 4)
        cur = {'h': h, 'a': a, 'm': len(p.split()) > 1, 's': s, 'st': ''}
        days.setdefault(d, []).append(cur)
    elif 'changed' in line and cur:
        f = re.search(r'(\d+) file', line)
        i = re.search(r'(\d+) insertion', line)
        de = re.search(r'(\d+) deletion', line)
        cur['st'] = f" ({f.group(1)} files, +{i.group(1) if i else 0}/−{de.group(1) if de else 0})"

status = [l for l in g('status', '--short').splitlines() if 'progress.md' not in l]
out = [
    "# Progress Log", "",
    "Date-wise log of changes, generated from `git log` (see [CONSTITUTION.md](../../CONSTITUTION.md) §2).",
    "Newest first. Format: `hash` subject — author (files changed, +added/−deleted). Merge commits are tagged **[merge]**.", "",
    f"_Last generated: {datetime.date.today()} from `{g('rev-parse', '--short', 'HEAD').strip()}` on branch `{g('rev-parse', '--abbrev-ref', 'HEAD').strip()}`._", "",
    "## Working tree (not yet committed)", "",
]
out += [f"- `{l}`" for l in status] + ["", "## Commit history"]
for d, cs in days.items():
    out += ["", f"### {d}", ""]
    for c in cs:
        out.append(f"- `{c['h']}` {c['s']}{' **[merge]**' if c['m'] else ''} — {c['a']}{c['st']}")
open(sys.argv[1], 'w').write("\n".join(out) + "\n")
print(len(days), 'days', sum(map(len, days.values())), 'commits')
