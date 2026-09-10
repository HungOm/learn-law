/**
 * Build what is COMMITTED, and copy it to the repository root.
 *
 * GitHub Pages here serves this branch from its root, so the root has to hold a
 * built site. The obvious way to produce one is to build the working copy — and
 * on a checkout five sessions share, that is a trap with no safe branch:
 *
 *   * publish assets built from uncommitted work and the site in front of
 *     readers cannot be reproduced from its own source. Worse than
 *     irreproducible, it is unfixable by rollback: reverting the commits does
 *     not remove content that was never in them.
 *   * commit the source to fix that, and you have committed somebody's lesson
 *     mid-sentence. That happened tonight in miniature — three lines of debug
 *     CSS reached readers this way — and the next one was 1,082 new lines.
 *
 * So the build happens in a throwaway worktree checked out at HEAD. The output
 * embeds exactly what is committed, whatever the shared tree looks like at that
 * moment, and the question stops needing judgement. `prebuild` regenerates
 * src/generated inside the worktree, so the content split is the committed
 * content too.
 *
 * node_modules is symlinked rather than installed: it is 200MB of dependencies
 * that the lockfile already pins, and a second `npm ci` per publish would make
 * the safe path the slow one.
 *
 *     npm run pages
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const head = git('rev-parse', 'HEAD');
const subject = git('log', '-1', '--format=%s');
const work = mkdtempSync(join(tmpdir(), 'warta-publish-'));
const tree = join(work, 'src');

console.log(`publish-pages: building ${head.slice(0, 8)} — ${subject}`);

let added = false;
try {
  execFileSync('git', ['worktree', 'add', '--detach', '--quiet', tree, head], { cwd: root, stdio: 'inherit' });
  added = true;

  symlinkSync(join(root, 'node_modules'), join(tree, 'node_modules'), 'dir');

  execFileSync('npm', ['run', 'build'], { cwd: tree, stdio: 'inherit' });

  const dist = join(tree, 'dist');
  const entries = readdirSync(dist);
  if (!entries.includes('index.html')) {
    throw new Error('the build produced no index.html — refusing to publish a partial build');
  }

  // Copied, never mirrored: an old hashed asset stays behind on purpose. A
  // reader mid-session holds an index.html naming the previous chunks, and
  // deleting them turns their next navigation into a blank page.
  for (const name of entries) {
    cpSync(join(dist, name), join(root, name), { recursive: true, force: true });
  }
  console.log(`publish-pages: copied ${entries.length} entries to the repository root`);
  console.log('publish-pages: this output is exactly HEAD — nothing uncommitted can be in it');
} finally {
  if (added) {
    try { execFileSync('git', ['worktree', 'remove', '--force', tree], { cwd: root, stdio: 'ignore' }); }
    catch { /* the temp dir goes below regardless */ }
  }
  if (existsSync(work)) rmSync(work, { recursive: true, force: true });
}
