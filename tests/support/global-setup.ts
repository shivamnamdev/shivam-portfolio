import fs from 'node:fs';
import path from 'node:path';
import { adminDb, applySeedState, personaIds, readRows, restoreRows, seedEnabled } from './db';

export const SNAPSHOT = path.resolve('.tmp/e2e-enrollment-snapshot.json');

// Applies the canonical persona enrolment state once per run. The original rows are written to a snapshot
// file first; global-teardown restores them. A snapshot left by a crashed run is restored before anything else.
export default async function globalSetup() {
  if (!seedEnabled()) return;
  const db = adminDb();
  const ids = await personaIds();
  const userIds = Object.values(ids);

  if (fs.existsSync(SNAPSHOT)) {
    const left = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
    await restoreRows(db, left.userIds, left.rows);
    fs.rmSync(SNAPSHOT);
    console.log('[e2e] restored enrolments left by a previous interrupted run');
  }

  const rows = await readRows(db, userIds);
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify({ userIds, rows }, null, 2));
  await applySeedState(db, ids);
  console.log(`[e2e] persona enrolments seeded (snapshot of ${rows.length} rows saved)`);
}
