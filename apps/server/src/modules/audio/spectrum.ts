import {execa} from 'execa';

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function hannWindow(index: number, size: number): number {
  if (size <= 1) return 1;
  return 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1)));
}

function fft(real: Float32Array, imag: Float32Array): void {
  const size = real.length;

  for (let index = 1, reverse = 0; index < size; index++) {
    let bit = size >> 1;
    for (; (reverse & bit) !== 0; bit >>= 1) {
      reverse ^= bit;
    }
    reverse ^= bit;

    if (index < reverse) {
      const realValue = real[index];
      real[index] = real[reverse];
      real[reverse] = realValue;

      const imagValue = imag[index];
      imag[index] = imag[reverse];
      imag[reverse] = imagValue;
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wLengthReal = Math.cos(angle);
    const wLengthImag = Math.sin(angle);

    for (let offset = 0; offset < size; offset += length) {
      let wReal = 1;
      let wImag = 0;
      const halfLength = length >> 1;

      for (let step = 0; step < halfLength; step++) {
        const even = offset + step;
        const odd = even + halfLength;
        const oddReal = real[odd] * wReal - imag[odd] * wImag;
        const oddImag = real[odd] * wImag + imag[odd] * wReal;

        real[odd] = real[even] - oddReal;
        imag[odd] = imag[even] - oddImag;
        real[even] += oddReal;
        imag[even] += oddImag;

        const nextWReal = wReal * wLengthReal - wImag * wLengthImag;
        wImag = wReal * wLengthImag + wImag * wLengthReal;
        wReal = nextWReal;
      }
    }
  }
}

function makeLogFrequencyBands(options: {bands: number; minFrequency: number; maxFrequency: number}): Array<{low: number; high: number}> {
  const minLog = Math.log2(options.minFrequency);
  const maxLog = Math.log2(options.maxFrequency);
  return Array.from({length: options.bands}, (_, index) => {
    const low = 2 ** (minLog + (index / options.bands) * (maxLog - minLog));
    const high = 2 ** (minLog + ((index + 1) / options.bands) * (maxLog - minLog));
    return {low, high};
  });
}

function readPcmSamples(bytes: Buffer): Float32Array {
  const totalSamples = Math.floor(bytes.length / 2);
  const samples = new Float32Array(totalSamples);
  for (let index = 0; index < totalSamples; index++) {
    samples[index] = bytes.readInt16LE(index * 2) / 32768;
  }
  return samples;
}

function extractWindow(samples: Float32Array, centerSample: number, windowSize: number): Float32Array {
  const window = new Float32Array(windowSize);
  const start = Math.round(centerSample - windowSize / 2);

  for (let index = 0; index < windowSize; index++) {
    const sampleIndex = start + index;
    const sample = sampleIndex >= 0 && sampleIndex < samples.length ? samples[sampleIndex] : 0;
    window[index] = sample * hannWindow(index, windowSize);
  }

  return window;
}

function makeBandBins(options: {bands: Array<{low: number; high: number}>; sampleRate: number; windowSize: number}): Array<{start: number; end: number}> {
  const nyquistBin = Math.floor(options.windowSize / 2);
  return options.bands.map((band) => {
    const start = clamp(Math.floor((band.low / options.sampleRate) * options.windowSize), 1, nyquistBin);
    const end = clamp(Math.ceil((band.high / options.sampleRate) * options.windowSize), start, nyquistBin);
    return {start, end};
  });
}

function spectrumBandsForWindow(window: Float32Array, bandBins: Array<{start: number; end: number}>): number[] {
  const real = new Float32Array(window);
  const imag = new Float32Array(window.length);
  fft(real, imag);

  return bandBins.map((band) => {
    let sum = 0;
    let count = 0;

    for (let bin = band.start; bin <= band.end; bin++) {
      const magnitude = Math.sqrt(real[bin] * real[bin] + imag[bin] * imag[bin]) / window.length;
      sum += magnitude * magnitude;
      count++;
    }

    return count > 0 ? Math.sqrt(sum / count) : 0;
  });
}

function normalizeFrames(frames: number[][]): number[][] {
  let max = 0;
  for (const frame of frames) {
    for (const value of frame) {
      max = Math.max(max, value);
    }
  }
  if (max <= 0) return frames.map((frame) => frame.map(() => 0));

  return frames.map((frame) =>
    frame.map((value) => {
      const normalized = Math.log1p((value / max) * 24) / Math.log1p(24);
      return Number(clamp(normalized).toFixed(4));
    }),
  );
}

export async function extractSpectrumFrames(options: {
  filePath: string;
  bands?: number;
  framesPerSecond?: number;
  sampleRate?: number;
  windowSize?: number;
}): Promise<number[][]> {
  const bands = options.bands ?? 48;
  const framesPerSecond = options.framesPerSecond ?? 30;
  const sampleRate = options.sampleRate ?? 8000;
  const windowSize = nextPowerOfTwo(options.windowSize ?? sampleRate / framesPerSecond);

  const result = await execa(
    'ffmpeg',
    ['-v', 'error', '-i', options.filePath, '-vn', '-ac', '1', '-ar', String(sampleRate), '-f', 's16le', '-'],
    {encoding: 'buffer', maxBuffer: 100 * 1024 * 1024},
  );

  const samples = readPcmSamples(Buffer.from(result.stdout));
  if (samples.length === 0) return [Array.from({length: bands}, () => 0)];

  const hopSize = Math.max(1, Math.round(sampleRate / framesPerSecond));
  const frameCount = Math.max(1, Math.ceil(samples.length / hopSize));
  const frequencyBands = makeLogFrequencyBands({bands, minFrequency: 60, maxFrequency: Math.min(3600, sampleRate / 2 - 50)});
  const bandBins = makeBandBins({bands: frequencyBands, sampleRate, windowSize});
  const frames: number[][] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const centerSample = frameIndex * hopSize + hopSize / 2;
    const window = extractWindow(samples, centerSample, windowSize);
    frames.push(spectrumBandsForWindow(window, bandBins));
  }

  return normalizeFrames(frames);
}
