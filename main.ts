// Copper Ladle — Rush Hour Kitchen: hand-in program.
//
// The game itself is the static site under game/ (open game/index.html in a
// desktop browser, no server or network needed). This program is only the
// courier: it delivers a copy of game/ and screenshots/ into the grading
// output folder and asks the vendored make.fun library to summarise that
// delivery into dossier.json, which is what the judge reads.
//
// Run it the way the grader does (output folder defaults to /output):
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Stop immediately and say why, rather than handing in a broken entry.
function refuse(reason: string): never {
  console.error(`hand-in refused: ${reason}`);
  process.exit(1);
}

const repoRoot = dirname(fileURLToPath(import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSource = join(repoRoot, 'game');
const shotsSource = join(repoRoot, 'screenshots');

// Pre-flight: the entry is only worth delivering if the game page is there
// and the judge gets at least three screenshots to look at.
if (!existsSync(join(gameSource, 'index.html'))) {
  refuse('game/index.html not found — the game itself is missing');
}
const shotFiles = existsSync(shotsSource)
  ? readdirSync(shotsSource).filter((name) => /\.(png|jpe?g)$/i.test(name))
  : [];
if (shotFiles.length < 3) {
  refuse(`screenshots/ holds ${shotFiles.length} image(s); at least 3 are required`);
}

// Copy a directory tree file by file, creating folders as needed.
function deliverTree(fromDir: string, toDir: string): void {
  mkdirSync(toDir, { recursive: true });
  for (const entryName of readdirSync(fromDir).sort()) {
    const fromPath = join(fromDir, entryName);
    const toPath = join(toDir, entryName);
    if (statSync(fromPath).isDirectory()) {
      deliverTree(fromPath, toPath);
    } else {
      copyFileSync(fromPath, toPath);
    }
  }
}

deliverTree(gameSource, join(targetDir, 'game'));
deliverTree(shotsSource, join(targetDir, 'screenshots'));

// The dossier caps mirror the scorer's own limits: how much game text the
// summary may quote, how many screenshots it may carry and how large each
// may be, and the size ceilings for the game folder as a whole.
const summaryCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
writeFileSync(join(targetDir, 'dossier.json'), buildDossier(targetDir, summaryCaps));

console.log(`handed in: game/ + ${shotFiles.length} screenshots + dossier.json -> ${targetDir}`);
