/**
 * Budget-Wächter ohne Zusatz-Abhängigkeit: schlägt an, wenn der
 * Editor-Chunk oder der PDF-Chunk das Budget überschreitet.
 * Läuft NACH `npm run build` und liest dist/assets aus.
 *
 * Budgets sind bewusst knapp über dem Ist-Stand (vite 8):
 *   Editor (index-*.js) ≤ 460 kB raw / ≤ 140 kB gzip
 *   PDF-Chunk (pdf-*.js) ≤ 460 kB raw / ≤ 200 kB gzip
 * Wer sie anhebt, dokumentiert den Grund im Audit.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
const files = readdirSync(assetsDir);

const pick = (prefix) => {
  const f = files.find((name) => name.startsWith(prefix) && name.endsWith('.js'));
  if (!f) throw new Error(`Chunk mit Präfix "${prefix}-" nicht gefunden in dist/assets`);
  return f;
};

const checks = [
  { prefix: 'index', rawBudget: 460 * 1024, gzipBudget: 140 * 1024 },
  { prefix: 'pdf', rawBudget: 460 * 1024, gzipBudget: 200 * 1024 },
];

let failed = false;
for (const { prefix, rawBudget, gzipBudget } of checks) {
  const name = pick(prefix);
  const buf = readFileSync(join(assetsDir, name));
  const raw = buf.byteLength;
  const gzip = gzipSync(buf, { level: 9 }).byteLength;
  const rawKb = (raw / 1024).toFixed(1);
  const gzipKb = (gzip / 1024).toFixed(1);
  const rawOk = raw <= rawBudget;
  const gzipOk = gzip <= gzipBudget;
  const status = rawOk && gzipOk ? 'OK ' : 'FEHLER';
  if (!rawOk || !gzipOk) failed = true;
  console.log(
    `${status}  ${prefix.padEnd(6)} raw ${rawKb} kB (Budget ${(rawBudget / 1024) | 0}) · gzip ${gzipKb} kB (Budget ${(gzipBudget / 1024) | 0})`,
  );
}

if (failed) {
  console.error('\nBundle-Budget überschritten. Ursache prüfen (npm run build && npm run size), nicht Budget ohne Begründung anheben.');
  process.exit(1);
}
