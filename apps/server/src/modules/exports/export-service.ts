import fs from "node:fs/promises";
import { createRequire } from "node:module";
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
  FfmpegOverrideFn,
  LogLevel,
  RemotionServer,
  RenderMediaOptions,
  SelectCompositionOptions,
} from "@remotion/renderer";
import type { ExportConfig, Project } from "@playlist2video/shared";
import { execa, type Options as ExecaOptions } from "execa";
import { resolveInside } from "../../lib/path-safety";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export type H264HardwareEncoder = "h264_nvenc" | "h264_qsv" | "h264_amf";
export type FinalVideoEncoder = H264HardwareEncoder | "libx264";
export type H264EncoderPreference = FinalVideoEncoder | null;

export interface DetectH264HardwareEncoderOptions {
  readEncoders?: () => Promise<string>;
  probeEncoder?: (candidate: H264HardwareEncoder) => Promise<boolean>;
  runProbe?: (command: string, args: string[]) => Promise<void>;
  logWarn?: (message: string) => void;
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
  forceNvenc?: boolean;
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
  detectHardwareEncoder?: () => Promise<H264HardwareEncoder | null>;
  prepareForcedNvencBinariesDirectory?: (options: {
    targetDir: string;
  }) => Promise<string>;
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
  const gpuSetting = env.PLAYLIST2VIDEO_REMOTION_GPU?.toLowerCase();
  if (gpuSetting === "0" || gpuSetting === "false" || gpuSetting === "off") {
    return undefined;
  }

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
  const remotionEncoderOptions = await resolveRemotionEncoderOptions({
    detectHardwareEncoder: options.detectHardwareEncoder,
    prepareForcedNvencBinariesDirectory:
      options.prepareForcedNvencBinariesDirectory,
    targetDir: path.join(options.tempDir, "remotion-nvenc-binaries"),
  });
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
        // Remotion 4.0.477's ESM renderer currently rejects
        // `hardwareAcceleration: "required"` for H.264 on Windows before
        // `ffmpegOverride` gets a chance to rewrite the encoder. Keep the
        // renderer path enabled and make NVENC fail-fast through the forced
        // `-c:v h264_nvenc` override instead of relying on Remotion's platform
        // hardware-acceleration gate.
        hardwareAcceleration: "if-possible",
        ...remotionEncoderOptions,
        ...(remotionChromiumOptions
          ? { chromiumOptions: remotionChromiumOptions }
          : {}),
        disallowParallelEncoding: false,
        concurrency: 16,
        // Export audio is generated and volume-adjusted by the explicit FFmpeg
        // audio concat step below, then muxed in the final export stage. Muting
        // the Remotion render keeps this pass video-only and avoids Remotion's
        // internal AAC preprocessing from constraining which FFmpeg build can be
        // used for forced NVENC stitching.
        muted: true,
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

export function shouldForceNvenc(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const setting = env.PLAYLIST2VIDEO_FORCE_NVENC?.toLowerCase();
  return setting === "1" || setting === "true" || setting === "on";
}

export function resolveH264EncoderPreference(
  env: NodeJS.ProcessEnv = process.env,
): H264EncoderPreference {
  const setting = env.PLAYLIST2VIDEO_H264_ENCODER?.toLowerCase();
  if (!setting) return null;

  if (
    setting === "h264_nvenc" ||
    setting === "h264_qsv" ||
    setting === "h264_amf" ||
    setting === "libx264"
  ) {
    return setting;
  }

  throw new Error(
    `Invalid PLAYLIST2VIDEO_H264_ENCODER value "${setting}". Expected one of: h264_nvenc, h264_qsv, h264_amf, libx264.`,
  );
}

async function resolveRemotionEncoderOptions(options: {
  detectHardwareEncoder?: () => Promise<H264HardwareEncoder | null>;
  prepareForcedNvencBinariesDirectory?: (options: {
    targetDir: string;
  }) => Promise<string>;
  targetDir: string;
}): Promise<
  Partial<Pick<RenderMediaOptions, "binariesDirectory" | "ffmpegOverride">>
> {
  const explicitEncoder = resolveH264EncoderPreference();

  if (explicitEncoder) {
    if (explicitEncoder === "h264_nvenc") {
      return getForcedNvencRemotionOptions(
        await (
          options.prepareForcedNvencBinariesDirectory ??
          prepareForcedNvencBinariesDirectory
        )({
          targetDir: options.targetDir,
        }),
      );
    }

    return {
      ffmpegOverride: createForceH264EncoderFfmpegOverride(explicitEncoder),
    };
  }

  const hardwareEncoder = shouldForceNvenc()
    ? "h264_nvenc"
    : await (
        options.detectHardwareEncoder ??
        (() => detectH264HardwareEncoder({ logWarn: console.warn }))
      )();

  if (hardwareEncoder !== "h264_nvenc") return {};

  return getForcedNvencRemotionOptions(
    await (
      options.prepareForcedNvencBinariesDirectory ??
      prepareForcedNvencBinariesDirectory
    )({
      targetDir: options.targetDir,
    }),
  );
}

export function forceH264EncoderFfmpegArgs(
  args: string[],
  encoder: FinalVideoEncoder,
): string[] {
  const nextArgs = [...args];
  const videoCodecIndex = nextArgs.lastIndexOf("-c:v");

  if (videoCodecIndex >= 0 && videoCodecIndex + 1 < nextArgs.length) {
    nextArgs[videoCodecIndex + 1] = encoder;
    return nextArgs;
  }

  const outputIndex = Math.max(nextArgs.length - 1, 0);
  nextArgs.splice(outputIndex, 0, "-c:v", encoder);
  return nextArgs;
}

export function forceNvencFfmpegArgs(args: string[]): string[] {
  return forceH264EncoderFfmpegArgs(args, "h264_nvenc");
}

export function createForceH264EncoderFfmpegOverride(
  encoder: FinalVideoEncoder,
): FfmpegOverrideFn {
  return ({ args }) => forceH264EncoderFfmpegArgs(args, encoder);
}

export function createForceNvencFfmpegOverride(): FfmpegOverrideFn {
  return createForceH264EncoderFfmpegOverride("h264_nvenc");
}

function getForcedNvencRemotionOptions(
  binariesDirectory: string,
): Pick<RenderMediaOptions, "binariesDirectory" | "ffmpegOverride"> {
  return {
    binariesDirectory,
    ffmpegOverride: createForceNvencFfmpegOverride(),
  };
}

export async function prepareForcedNvencBinariesDirectory(options: {
  targetDir: string;
  remotionBinariesSourceDir?: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  resolveExecutablePath?: (
    commandName: "ffmpeg" | "ffprobe",
  ) => Promise<string>;
}): Promise<string> {
  const resolveExecutablePath =
    options.resolveExecutablePath ?? resolveExecutableOnPath;
  const sourceDir =
    options.remotionBinariesSourceDir ?? getRemotionCompositorDir();
  const ffmpegPath =
    options.ffmpegPath ?? (await resolveExecutablePath("ffmpeg"));
  const ffprobePath =
    options.ffprobePath ?? (await resolveExecutablePath("ffprobe"));

  await fs.rm(options.targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(options.targetDir), { recursive: true });
  await fs.cp(sourceDir, options.targetDir, { recursive: true });
  await fs.copyFile(
    ffmpegPath,
    path.join(options.targetDir, getRemotionBinaryFileName("ffmpeg")),
  );
  await fs.copyFile(
    ffprobePath,
    path.join(options.targetDir, getRemotionBinaryFileName("ffprobe")),
  );

  return options.targetDir;
}

function getRemotionCompositorDir(): string {
  const packageName = getRemotionCompositorPackageName();
  const compositorPackage = require(packageName) as { dir?: unknown };
  if (typeof compositorPackage.dir !== "string") {
    throw new Error(
      `Could not resolve Remotion compositor directory from ${packageName}.`,
    );
  }
  return compositorPackage.dir;
}

function getRemotionCompositorPackageName(): string {
  if (process.platform === "win32" && process.arch === "x64") {
    return "@remotion/compositor-win32-x64-msvc";
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "@remotion/compositor-darwin-arm64";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    return "@remotion/compositor-darwin-x64";
  }
  if (process.platform === "linux" && process.arch === "x64") {
    return "@remotion/compositor-linux-x64-gnu";
  }
  if (process.platform === "linux" && process.arch === "arm64") {
    return "@remotion/compositor-linux-arm64-gnu";
  }
  throw new Error(
    `Unsupported Remotion compositor platform: ${process.platform}-${process.arch}.`,
  );
}

async function resolveExecutableOnPath(
  commandName: "ffmpeg" | "ffprobe",
): Promise<string> {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = await execa(locator, [commandName]);
  const candidates = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const nonRemotionCandidate =
    candidates.find(
      (candidate) =>
        !candidate.toLowerCase().includes(`${path.sep}@remotion${path.sep}`),
    ) ?? candidates[0];

  if (!nonRemotionCandidate) {
    throw new Error(`Could not find ${commandName} on PATH.`);
  }

  return nonRemotionCandidate;
}

function getRemotionBinaryFileName(commandName: "ffmpeg" | "ffprobe"): string {
  return process.platform === "win32" ? `${commandName}.exe` : commandName;
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
        probeH264HardwareEncoder(candidate, options.runProbe, options.logWarn));
    const encodersOutput = await readEncoders();
    const candidates = h264HardwareEncoderPriority.filter((encoder) =>
      ffmpegEncoderListIncludes(encodersOutput, encoder),
    );

    const logWarn = options.logWarn;

    for (const candidate of candidates) {
      const probePassed = await probeEncoder(candidate).catch((error) => {
        logWarn?.(
          `[FFmpeg] Hardware encoder probe for ${candidate} failed: ${formatProbeError(error)}`,
        );
        return false;
      });
      if (probePassed) return candidate;
    }

    return null;
  } catch (error) {
    options.logWarn?.(
      `[FFmpeg] Hardware encoder detection failed: ${formatProbeError(error)}`,
    );
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
  logWarn?: (message: string) => void,
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
  } catch (error) {
    logWarn?.(
      `[FFmpeg] Hardware encoder probe for ${encoder} failed: ${formatProbeError(error)}`,
    );
    return false;
  }
}

async function runFfmpegProbe(command: string, args: string[]): Promise<void> {
  try {
    await execa(command, args, { stdout: "pipe", stderr: "pipe" });
  } catch (error) {
    throw new Error(formatProbeError(error));
  }
}

function formatProbeError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = "stderr" in error ? String(error.stderr ?? "").trim() : "";
    return stderr ? `${error.message}\n${stderr}` : error.message;
  }
  return String(error);
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
  const runFfmpeg =
    options.runFfmpeg ??
    ((args: string[]) =>
      execa("ffmpeg", args, getVisibleFfmpegOptions()).then(() => undefined));
  const logInfo = options.logInfo ?? console.info;
  const logWarn = options.logWarn ?? console.warn;
  const forceNvenc = options.forceNvenc ?? shouldForceNvenc();
  const explicitEncoder = resolveH264EncoderPreference();
  const finalArgsBase = {
    videoPath: options.videoPath,
    audioPath: options.audioPath,
    outputPath: options.outputPath,
    videoBitrateKbps: options.videoBitrateKbps,
  };

  if (forceNvenc) {
    logInfo(
      "[FFmpeg] Forcing final export through NVIDIA NVENC encoder h264_nvenc.",
    );
    await runFfmpeg(
      buildFinalFfmpegArgs({ ...finalArgsBase, videoEncoder: "h264_nvenc" }),
    );
    return;
  }

  logInfo("[FFmpeg] Attempting stream-copy final mux without re-encoding.");
  try {
    await runFfmpeg(buildFinalFfmpegCopyArgs(finalArgsBase));
    return;
  } catch {
    logWarn(
      "[FFmpeg] Stream-copy final mux failed. Falling back to GPU/CPU re-encode path.",
    );
  }

  if (explicitEncoder) {
    logInfo(
      `[FFmpeg] Using environment-specified H.264 encoder ${explicitEncoder}.`,
    );
    try {
      await runFfmpeg(
        buildFinalFfmpegArgs({
          ...finalArgsBase,
          videoEncoder: explicitEncoder,
        }),
      );
    } catch (error) {
      if (explicitEncoder === "libx264") throw error;
      logWarn(
        `[FFmpeg] GPU encoder ${explicitEncoder} failed. Falling back to CPU encoder libx264.`,
      );
      await runFfmpeg(
        buildFinalFfmpegArgs({ ...finalArgsBase, videoEncoder: "libx264" }),
      );
    }
    return;
  }

  const hardwareEncoder = options.detectHardwareEncoder
    ? await options.detectHardwareEncoder()
    : await detectH264HardwareEncoder({ logWarn });

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
