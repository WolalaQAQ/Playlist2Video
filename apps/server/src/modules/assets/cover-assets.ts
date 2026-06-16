import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {IAudioMetadata} from 'music-metadata';

export interface WrittenCoverAsset {
  filePath: string;
  renderPath: string;
}

const embeddedCoverRenderSize = 768;

export async function writeCoverAsset(options: {
  metadata: IAudioMetadata;
  assetsDir: string;
  trackId: string;
}): Promise<WrittenCoverAsset | null> {
  const picture = options.metadata.common.picture?.[0];
  if (!picture) return null;

  await fs.mkdir(options.assetsDir, {recursive: true});
  const fileName = `${options.trackId}.jpg`;
  const outputPath = path.join(options.assetsDir, fileName);
  await sharp(picture.data)
    .resize(embeddedCoverRenderSize, embeddedCoverRenderSize, {fit: 'cover'})
    .jpeg({quality: 88})
    .toFile(outputPath);
  return {filePath: outputPath, renderPath: fileName};
}

export async function writeFallbackCover(options: {
  assetsDir: string;
  trackId: string;
  title: string;
}): Promise<WrittenCoverAsset> {
  await fs.mkdir(options.assetsDir, {recursive: true});
  const fileName = `${options.trackId}-fallback.jpg`;
  const outputPath = path.join(options.assetsDir, fileName);
  const letter = options.title.trim().charAt(0).toUpperCase() || '♪';
  const escapedLetter = letter.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const svg = `<svg width="900" height="900" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="0.5" stop-color="#f97316"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="900" height="900" rx="72" fill="url(#g)"/><text x="450" y="535" font-size="260" font-family="Arial" font-weight="800" text-anchor="middle" fill="white">${escapedLetter}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({quality: 90}).toFile(outputPath);
  return {filePath: outputPath, renderPath: fileName};
}
