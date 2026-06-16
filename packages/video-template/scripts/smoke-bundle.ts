import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'p2v-remotion-bundle-'));

try {
  const serveUrl = await bundle({
    entryPoint: path.join(repoRoot, 'packages/video-template/src/render-entry.tsx'),
    outDir: tempDir,
    publicDir: path.join(repoRoot, 'assets'),
  });

  const stats = await fs.stat(serveUrl);
  if (!stats.isDirectory()) {
    throw new Error(`Expected Remotion bundle output to be a directory: ${serveUrl}`);
  }

  console.info(`[Remotion smoke] Bundle created at ${serveUrl}`);
} finally {
  await fs.rm(tempDir, {recursive: true, force: true});
}