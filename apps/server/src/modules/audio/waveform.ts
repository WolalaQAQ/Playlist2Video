import {execa} from 'execa';

export async function extractWaveformPeaks(options: {filePath: string; samples?: number}): Promise<number[]> {
  const samples = options.samples ?? 96;
  const result = await execa('ffmpeg', [
    '-v',
    'error',
    '-i',
    options.filePath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '8000',
    '-f',
    's16le',
    '-',
  ], {encoding: 'buffer', maxBuffer: 100 * 1024 * 1024});

  const bytes = Buffer.from(result.stdout);
  const totalPcmSamples = Math.floor(bytes.length / 2);
  if (totalPcmSamples === 0) return Array.from({length: samples}, () => 0);

  const bucketSize = Math.max(1, Math.ceil(totalPcmSamples / samples));
  const rawPeaks: number[] = [];

  for (let bucket = 0; bucket < samples; bucket++) {
    const startSample = bucket * bucketSize;
    const endSample = Math.min(totalPcmSamples, startSample + bucketSize);
    let peak = 0;
    for (let sample = startSample; sample < endSample; sample++) {
      peak = Math.max(peak, Math.abs(bytes.readInt16LE(sample * 2)) / 32768);
    }
    rawPeaks.push(peak);
  }

  const max = Math.max(...rawPeaks);
  if (max <= 0) return rawPeaks.map(() => 0);
  return rawPeaks.map((peak) => Number((peak / max).toFixed(4)));
}
