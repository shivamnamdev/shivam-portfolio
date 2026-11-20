import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { activeCoupons } from '../../data/coupons';

// SCP-53 · the coupon codes must never be reachable from browser code. Every file marked 'use client' is a root of the browser bundle; this walks
// the local imports from each root (type-only imports are erased, so they do not count) and fails if data/coupons.ts or lib/couponFiles.ts is reached.
const ROOT = process.cwd();
const FORBIDDEN = new Set(['data/coupons.ts', 'lib/couponFiles.ts']);
const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(dir, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []);
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');
const isClient = (src: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const ext of ['', ...EXTS]) { const f = base + ext; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  return null;
}
function importsOf(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/gm)) {
    const r = resolveImport(file, m[1] ?? m[2] ?? m[3]);
    if (r) out.push(r);
  }
  return out;
}
function reachable(root: string): Set<string> {
  const seen = new Set<string>([root]); const queue = [root];
  while (queue.length) for (const next of importsOf(queue.pop()!)) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  return seen;
}

test.describe('coupon codes stay out of the browser (SCP-53) @regression', () => {
  const files = ['app', 'components', 'hooks', 'lib'].filter((d) => fs.existsSync(path.join(ROOT, d))).flatMap((d) => walk(path.join(ROOT, d)));
  const roots = files.filter((f) => isClient(fs.readFileSync(f, 'utf8')));

  test('[PRC-UNIT-020] no browser component can reach data/coupons.ts or lib/couponFiles.ts', () => {
    expect(roots.length, 'the walker must find the browser components').toBeGreaterThan(30);
    const leaks = roots.flatMap((r) => [...reachable(r)].filter((f) => FORBIDDEN.has(rel(f))).map((f) => `${rel(r)} -> ${rel(f)}`));
    expect(leaks, 'browser code imports the coupon codes').toEqual([]);
  });

  test('[PRC-UNIT-021] the walker does see a real chain (it reaches lib/pricing.ts from the checkout box)', () => {
    const box = path.join(ROOT, 'components/ActiveCohorts.tsx');
    expect([...reachable(box)].map(rel)).toContain('lib/pricing.ts');
  });

  test('[PRC-UNIT-022] the walker would catch a leak (a temporary client file importing the codes)', () => {
    const tmp = path.join(ROOT, 'components/zz-leak-probe.tsx');
    fs.writeFileSync(tmp, `'use client';\nimport { activeCoupons } from '@/data/coupons';\nexport default () => activeCoupons.length;\n`);
    try { expect([...reachable(tmp)].map(rel)).toContain('data/coupons.ts'); } finally { fs.rmSync(tmp); }
  });

  test('[PRC-UNIT-023] no real coupon code is written in a page or component (docs examples included)', () => {
    const codes = activeCoupons.map((c) => c.code).filter((c) => c !== 'QA100');
    expect(codes.length).toBeGreaterThan(0);
    const hits = files.filter((f) => /^(app|components)\//.test(rel(f))).flatMap((f) => { const src = fs.readFileSync(f, 'utf8'); return codes.filter((c) => src.includes(c)).map((c) => `${rel(f)}: ${c}`); });
    expect(hits, 'a real coupon code appears in a page or component source').toEqual([]);
  });
});
