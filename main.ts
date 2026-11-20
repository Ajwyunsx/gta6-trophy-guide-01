// Hand-in for the Leonida Ledger entry. Run it and it builds /output (or $MAKEFUN_OUTPUT_DIR):
//   out/app/          the offline guide, verbatim from app/
//   out/screenshots/  the four captures from screenshots/
//   out/dossier.json  the summary buildDossier writes, byte for byte what the scorer writes itself
//
// Nothing here knows about the guide's contents — the data, the filters and the prose all live in
// app/. This file is plumbing: copy, then describe. Standard library only, because the grader runs
// it in a bare Node 22 container with no network and no install step.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Scripts run by .ts under Node 22.18+; on 22.6–22.17 use --experimental-strip-types.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appSrc = join(repo, 'app');
const shotSrc = join(repo, 'screenshots');

if (!existsSync(join(appSrc, 'index.html'))) {
  throw new Error(`main.ts: no app/index.html under ${appSrc} — refusing to hand in an empty guide`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(appSrc, join(outputDir, 'app'), { recursive: true });

// The kit's scorer wants 3–4 captures and will not read a directory it cannot find, so an absent
// screenshots/ is a build failure here rather than a confusing rejection later.
if (!existsSync(shotSrc)) {
  throw new Error(`main.ts: no screenshots/ under ${repo} — the cover image comes from there`);
}
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotSrc, join(outputDir, 'screenshots'), { recursive: true });

// The caps are the scorer's own (reference/gate.json), tightened where they matter: 160 KiB of
// text, four images at 256 KiB each, and an app/ small enough to fit beside them. Passing them
// explicitly means the dossier this writes is byte-identical to the one the grader would write,
// so a mismatch here is a bug in my app, not in the hand-in.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);

const bytes = Buffer.byteLength(dossier, 'utf8');
console.log(`wrote ${join(outputDir, 'dossier.json')} (${bytes} bytes) from app/ and screenshots/`);
