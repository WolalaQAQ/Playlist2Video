import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import type { BundleOptions } from "@remotion/bundler";
import {
  RenderInternals,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import type {
  LogLevel,
  RemotionServer,
  RenderMediaOptions,
  SelectCompositionOptions,
} from "@remotion/renderer";
import type { ExportConfig, Project } from "@playlist2video/shared";
import { execa, type Options as ExecaOptions } from "execa";
import { resolveInside } from "../../lib/path-safety";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export type H264HardwareEncoder = "h264_nvenc" | "h264_qsv" | "h264_amf";
export type FinalVideoEncoder = H264HardwareEncoder | "libx264";

export interface DetectH264HardwareEncoderOptions {
  readEncoders?: () => Promise<string>;
  probeEncoder?: (candidate: H264HardwareEncoder) => Promise<boolean>;
  runProbe?: (command: string, args: string[]) => Promise<void>;
}

export interface RunFinalFfmpegExportOptions {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  videoBitrateKbps: number;
  detectHardwareEncoder?: () => Promise<H264HardwareEncoder | null>;
  runFfmpeg?: (args: string[]) => Promise<void>;
  logInfo?: (message: string) => void;
  logWarn?: (message: string) => void;
}

type RenderVideoOnlyForExport = (
  options: RenderProjectVideoOnlyOptions,
) => Promise<void>;
type FinalFfmpegExportForExport = (
  options: RunFinalFfmpegExportOptions,
) => Promise<void>;

type PrepareRemotionServerOptions = Parameters<
  typeof RenderInternals.prepareServer
>[0];

export interface StartRemotionBundleServerOptions {
  bundleDir: string;
  remotionRoot?: string;
  sampleRate?: number;
  port?: number | null;
  logLevel?: LogLevel;
  prepareServer?: (
    options: PrepareRemotionServerOptions,
  ) => Promise<Pick<RemotionServer, "serveUrl" | "closeServer">>;
}

export interface RenderProjectVideoOnlyOptions {
  project: Project;
  workspaceDir: string;
  tempDir: string;
  videoOnlyPath: string;
  onProgress?: (progress: number) => void;
  bundleRemotion?: (options: BundleOptions) => Promise<string>;
  startBundleServer?: (
    options: StartRemotionBundleServerOptions,
  ) => Promise<{ serveUrl: string; close: (force: boolean) => Promise<void> }>;
  selectCompositionFn?: (
    options: SelectCompositionOptions,
  ) => ReturnType<typeof selectComposition>;
  renderMediaFn?: (
    options: RenderMediaOptions,
  ) => ReturnType<typeof renderMedia>;
}

const h264HardwareEncoderPriority: H264HardwareEncoder[] = [
  "h264_nvenc",
  "h264_qsv",
  "h264_amf",
];

type RemotionChromiumOptions = NonNullable<
  RenderMediaOptions["chromiumOptions"]
>;
type RemotionOpenGlRenderer = NonNullable<RemotionChromiumOptions["gl"]>;

const validRemotionGlRenderers: RemotionOpenGlRenderer[] = [
  "swangle",
  "angle",
  "egl",
  "swiftshader",
  "vulkan",
  "angle-egl",
];

export function getRemotionChromiumOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): RemotionChromiumOptions | undefined {
  if (env.PLAYLIST2VIDEO_REMOTION_GPU !== "1") return undefined;

  const gl = env.PLAYLIST2VIDEO_REMOTION_GL ?? "angle";
  if (!validRemotionGlRenderers.includes(gl as RemotionOpenGlRenderer)) {
    throw new Error(
      `Invalid PLAYLIST2VIDEO_REMOTION_GL value "${gl}". Expected one of: ${validRemotionGlRenderers.join(", ")}.`,
    );
  }

  return { gl: gl as RemotionOpenGlRenderer };
}

export function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export async function timeAsyncStep<T>(
  label: string,
  step: () => Promise<T>,
  logInfo: (message: string) => void = console.info,
  now: () => number = () => performance.now(),
): Promise<T> {
  const startedAt = now();
  try {
    return await step();
  } finally {
    logInfo(
      `[Timing] ${label} completed in ${formatDuration(now() - startedAt)}`,
    );
  }
}

export function escapeFfmpegConcatPath(filePath: string): string {
  return filePath.replaceAll("'", "'\\''");
}

export function buildFfmpegConcatList(filePaths: string[]): string {
  return (
    filePaths
      .map((filePath) => `file '${escapeFfmpegConcatPath(filePath)}'`)
      .join("\n") + "\n"
  );
}

export function getOutputPath(
  outputDir: string,
  outputFileName: string,
): string {
  return resolveInside(outputDir, outputFileName);
}

export function getRemotionEntryPoint(): string {
  return path.resolve(
    moduleDir,
    "../../../../..",
    "packages/video-template/src/render-entry.tsx",
  );
}

export function normalizeRemotionServeUrl(serveUrl: string): string {
  const url = new URL(serveUrl);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }
  return url.toString();
}

export async function startRemotionBundleServer(
  options: StartRemotionBundleServerOptions,
): Promise<{ serveUrl: string; close: (force: boolean) => Promise<void> }> {
  const prepareServer = options.prepareServer ?? RenderInternals.prepareServer;
  const server = await prepareServer({
    webpackConfigOrServeUrl: options.bundleDir,
    port: options.port ?? null,
    remotionRoot: options.remotionRoot ?? path.dirname(getRemotionEntryPoint()),
    offthreadVideoThreads: 0,
    logLevel: options.logLevel ?? "info",
    indent: false,
    offthreadVideoCacheSizeInBytes: null,
    binariesDirectory: null,
    forceIPv4: true,
    sampleRate: options.sampleRate ?? 48000,
  });

  return {
    serveUrl: normalizeRemotionServeUrl(server.serveUrl),
    close: async (force: boolean) => {
      await server.closeServer(force);
    },
  };
}

export async function renderProjectVideoOnly(
  options: RenderProjectVideoOnlyOptions,
): Promise<void> {
  const bundleRemotion = options.bundleRemotion ?? bundle;
  const startBundleServer =
    options.startBundleServer ?? startRemotionBundleServer;
  const selectCompositionFn = options.selectCompositionFn ?? selectComposition;
  const renderMediaFn = options.renderMediaFn ?? renderMedia;
  const bundleDir = path.join(options.tempDir, "remotion-bundle");
  const renderProject = prepareProjectForRemotionRender(options.project);
  const frameImageFormat =
    options.project.exportConfig.frameImageFormat ?? "jpeg";
  const jpegQuality = options.project.exportConfig.jpegQuality ?? 100;
  const remotionChromiumOptions = getRemotionChromiumOptionsFromEnv();
  const bundledServeUrl = await timeAsyncStep("Remotion bundle", () =>
    bundleRemotion({
      entryPoint: getRemotionEntryPoint(),
      outDir: bundleDir,
      publicDir: path.join(options.workspaceDir, "assets"),
    }),
  );
  const server = await startBundleServer({
    bundleDir: bundledServeUrl,
    sampleRate: options.project.exportConfig.audioSampleRate,
  });

  try {
    const composition = await timeAsyncStep("Remotion select composition", () =>
      selectCompositionFn({
        serveUrl: server.serveUrl,
        id: "PlaylistVideo",
        inputProps: { project: renderProject },
      }),
    );
    await timeAsyncStep("Remotion render video", () =>
      renderMediaFn({
        composition,
        serveUrl: server.serveUrl,
        codec: options.project.exportConfig.videoCodec,
        imageFormat: frameImageFormat,
        ...(frameImageFormat === "jpeg" ? { jpegQuality } : {}),
        hardwareAcceleration: "if-possible",
        ...(remotionChromiumOptions
          ? { chromiumOptions: remotionChromiumOptions }
          : {}),
        disallowParallelEncoding: false,
        concurrency: 4,
        videoBitrate: `${options.project.exportConfig.videoBitrateKbps}k`,
        outputLocation: options.videoOnlyPath,
        inputProps: { project: renderProject },
        onProgress: ({ progress }) => {
          options.onProgress?.(progress);
          process.stdout.write(
            `\r[Remotion] Rendering video ${(progress * 100).toFixed(1)}%`,
          );
          if (progress >= 1) process.stdout.write("\n");
        },
      }),
    );
  } finally {
    await server.close(false);
  }
}

export function prepareProjectForRemotionRender(project: Project): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({ ...track })),
  };
}

export function buildAudioFfmpegArgs(
  concatListPath: string,
  concatAudioPath: string,
  exportConfig: ExportConfig,
): string[] {
  return [
    "-y",
    "-stats",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-map",
    "0:a:0",
    "-vn",
    "-c:a",
    exportConfig.audioCodec,
    "-b:a",
    `${exportConfig.audioBitrateKbps}k`,
    "-ar",
    String(exportConfig.audioSampleRate),
    "-ac",
    String(exportConfig.audioChannels),
    "-filter:a",
    `volume=${exportConfig.audioVolumePercent / 100}`,
    concatAudioPath,
  ];
}

export function selectH264HardwareEncoder(
  encodersOutput: string,
): H264HardwareEncoder | null {
  return (
    h264HardwareEncoderPriority.find((encoder) =>
      ffmpegEncoderListIncludes(encodersOutput, encoder),
    ) ?? null
  );
}

function ffmpegEncoderListIncludes(
  encodersOutput: string,
  encoder: H264HardwareEncoder,
): boolean {
  return encodersOutput.split(/\s+/).includes(encoder);
}

export async function detectH264HardwareEncoder(
  options: DetectH264HardwareEncoderOptions = {},
): Promise<H264HardwareEncoder | null> {
  try {
    const readEncoders = options.readEncoders ?? readFfmpegEncoders;
    const probeEncoder =
      options.probeEncoder ??
      ((candidate: H264HardwareEncoder) =>
        probeH264HardwareEncoder(candidate, options.runProbe));
    const encodersOutput = await readEncoders();
    const candidates = h264HardwareEncoderPriority.filter((encoder) =>
      ffmpegEncoderListIncludes(encodersOutput, encoder),
    );

    for (const candidate of candidates) {
      if (await probeEncoder(candidate).catch(() => false)) return candidate;
    }

    return null;
  } catch {
    return null;
  }
}

async function readFfmpegEncoders(): Promise<string> {
  const result = await execa("ffmpeg", ["-hide_banner", "-encoders"]);
  return result.stdout;
}

async function probeH264HardwareEncoder(
  encoder: H264HardwareEncoder,
  runProbe: (command: string, args: string[]) => Promise<void> = runFfmpegProbe,
): Promise<boolean> {
  try {
    await runProbe("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=256x144:rate=1:duration=1",
      "-frames:v",
      "1",
      "-an",
      "-c:v",
      encoder,
      "-f",
      "null",
      "-",
    ]);
    return true;
  } catch {
    return false;
  }
}

async function runFfmpegProbe(command: string, args: string[]): Promise<void> {
  await execa(command, args, { stdout: "ignore", stderr: "ignore" });
}

export function buildFinalFfmpegArgs(options: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  videoEncoder: FinalVideoEncoder;
  videoBitrateKbps: number;
}): string[] {
  const args = [
    "-y",
    "-stats",
    "-i",
    options.videoPath,
    "-i",
    options.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    options.videoEncoder,
    "-b:v",
    `${options.videoBitrateKbps}k`,
  ];

  if (options.videoEncoder === "libx264") {
    args.push("-preset", "medium");
  }

  args.push(
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-shortest",
    options.outputPath,
  );
  return args;
}

export function buildFinalFfmpegCopyArgs(options: {
  videoPath: string;
  audioPath: string;
  outputPath: string;
}): string[] {
  return [
    "-y",
    "-stats",
    "-i",
    options.videoPath,
    "-i",
    options.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-shortest",
    options.outputPath,
  ];
}

export function getVisibleFfmpegOptions(): ExecaOptions {
  return { stdio: "inherit" };
}

export async function runFinalFfmpegExport(
  options: RunFinalFfmpegExportOptions,
): Promise<void> {
  const detectHardwareEncoder =
    options.detectHardwareEncoder ?? detectH264HardwareEncoder;
  const runFfmpeg =
    options.runFfmpeg ??
    ((args: string[]) =>
      execa("ffmpeg", args, getVisibleFfmpegOptions()).then(() => undefined));
  const logInfo = options.logInfo ?? console.info;
  const logWarn = options.logWarn ?? console.warn;
  const finalArgsBase = {
    videoPath: options.videoPath,
    audioPath: options.audioPath,
    outputPath: options.outputPath,
    videoBitrateKbps: options.videoBitrateKbps,
  };

  logInfo("[FFmpeg] Attempting stream-copy final mux without re-encoding.");
  try {
    await runFfmpeg(buildFinalFfmpegCopyArgs(finalArgsBase));
    return;
  } catch {
    logWarn(
      "[FFmpeg] Stream-copy final mux failed. Falling back to GPU/CPU re-encode path.",
    );
  }

  const hardwareEncoder = await detectHardwareEncoder();

  if (!hardwareEncoder) {
    logWarn(
      "[FFmpeg] No supported H.264 GPU encoder detected. Falling back to CPU encoder libx264.",
    );
    await runFfmpeg(
      buildFinalFfmpegArgs({ ...finalArgsBase, videoEncoder: "libx264" }),
    );
    return;
  }

  logInfo(
    `[FFmpeg] Detected GPU encoder ${hardwareEncoder}; attempting hardware-accelerated final export.`,
  );
  try {
    await runFfmpeg(
      buildFinalFfmpegArgs({ ...finalArgsBase, videoEncoder: hardwareEncoder }),
    );
  } catch {
    logWarn(
      `[FFmpeg] GPU encoder ${hardwareEncoder} failed. Falling back to CPU encoder libx264.`,
    );
    await runFfmpeg(
      buildFinalFfmpegArgs({ ...finalArgsBase, videoEncoder: "libx264" }),
    );
  }
}

export async function exportProject(options: {
  project: Project;
  outputDir: string;
  workspaceDir: string;
  onProgress?: (progress: number) => void;
  keepTempFiles?: boolean;
  runFfmpeg?: (args: string[]) => Promise<void>;
  renderVideoOnly?: RenderVideoOnlyForExport;
  finalFfmpegExport?: FinalFfmpegExportForExport;
}): Promise<{ outputPath: string }> {
  await fs.mkdir(options.outputDir, { recursive: true });
  const tempDir = path.join(
    options.workspaceDir,
    ".tmp",
    `export-${Date.now()}`,
  );
  await fs.mkdir(tempDir, { recursive: true });

  const tracks = [...options.project.tracks].sort((a, b) => a.order - b.order);
  const concatListPath = path.join(tempDir, "audio-list.txt");
  const concatAudioPath = path.join(tempDir, "audio.m4a");
  const videoOnlyPath = path.join(tempDir, "video.mp4");
  const outputPath = getOutputPath(
    options.outputDir,
    options.project.exportConfig.outputFileName,
  );

  const runFfmpeg =
    options.runFfmpeg ??
    ((args: string[]) =>
      execa("ffmpeg", args, getVisibleFfmpegOptions()).then(() => undefined));
  const renderVideoOnly = options.renderVideoOnly ?? renderProjectVideoOnly;
  const finalFfmpegExport = options.finalFfmpegExport ?? runFinalFfmpegExport;

  try {
    await fs.writeFile(
      concatListPath,
      buildFfmpegConcatList(tracks.map((track) => track.sourcePath)),
      "utf8",
    );
    console.info(
      "[FFmpeg] Concatenating playlist audio. FFmpeg progress is shown below.",
    );
    await timeAsyncStep("FFmpeg audio concat/transcode", () =>
      runFfmpeg(
        buildAudioFfmpegArgs(
          concatListPath,
          concatAudioPath,
          options.project.exportConfig,
        ),
      ),
    );
    options.onProgress?.(0.2);

    await renderVideoOnly({
      project: options.project,
      workspaceDir: options.workspaceDir,
      tempDir,
      videoOnlyPath,
      onProgress: options.onProgress,
    });

    console.info(
      "[FFmpeg] Combining video and audio. Attempting GPU acceleration when available.",
    );
    await timeAsyncStep("Final mux/re-encode", () =>
      finalFfmpegExport({
        videoPath: videoOnlyPath,
        audioPath: concatAudioPath,
        outputPath,
        videoBitrateKbps: options.project.exportConfig.videoBitrateKbps,
      }),
    );
    options.onProgress?.(1);
    return { outputPath };
  } finally {
    if (!options.keepTempFiles) {
      await timeAsyncStep("Temp cleanup", () =>
        fs.rm(tempDir, { recursive: true, force: true }),
      );
    }
  }
}
