import fs from 'node:fs/promises';
import path from 'node:path';
import {execa} from 'execa';

export async function hasFfmpeg(): Promise<boolean> {
  try {
    await execa('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

export async function createFixtureAudio(folderPath: string): Promise<string[]> {
  await fs.mkdir(folderPath, {recursive: true});
  const first = path.join(folderPath, '01 - sine.mp3');
  const second = path.join(folderPath, '02 - higher_sine.mp3');
  await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', first]);
  await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=1', second]);
  return [first, second];
}
