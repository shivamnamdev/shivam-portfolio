import fs from 'node:fs';
import { adminDb, restoreRows, seedEnabled } from './db';
import { SNAPSHOT } from './global-setup';

export default async function globalTeardown() {
  if (!seedEnabled() || !fs.existsSync(SNAPSHOT)) return;
  const { userIds, rows } = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  await restoreRows(adminDb(), userIds, rows);
  fs.rmSync(SNAPSHOT);
  console.log(`[e2e] persona enrolments restored (${rows.length} rows)`);
}
