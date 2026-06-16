import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import type { ExportConfig, Project } from "@playlist2video/shared";
import {
  buildAudioFfmpegArgs,
  buildFfmpegConcatList,
  buildFinalFfmpegArgs,
  buildFinalFfmpegCopyArgs,
  detectH264HardwareEncoder,
  exportProject,
  normalizeRemotionServeUrl,
  prepareProjectForRemotionRender,
  renderProjectVideoOnly,
  runFinalFfmpegExport,
  startRemotionBundleServer,
  getOutputPath,
  getRemotionEntryPoint,
  getVisibleFfmpegOptions,
  selectH264HardwareEncoder,
} from "./export-service";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

it("builds a quoted concat list for FFmpeg", () => {
  expect(
    buildFfmpegConcatList(["C:/Music/01.mp3", "C:/Music/O'Hara.mp3"]),
  ).toBe("file 'C:/Music/01.mp3'\nfile 'C:/Music/O'\\''Hara.mp3'\n");
});

it("resolves output path inside output directory", () => {
  expect(getOutputPath(path.resolve("output"), "playlist-video.mp4")).toBe(
    path.join(path.resolve("output"), "playlist-video.mp4"),
  );
});

it("uses a Remotion entry point that registers the root component", async () => {
  const entryPoint = getRemotionEntryPoint();
  expect(path.basename(entryPoint)).toBe("render-entry.tsx");
  await expect(fs.readFile(entryPoint, "utf8")).resolves.toContain(
    "registerRoot(",
  );
});

it("resolves the Remotion entry point when the server runs from the apps/server workspace cwd", async () => {
  const originalCwd = process.cwd();
  try {
    process.chdir(path.join(repoRoot, "apps/server"));

    const entryPoint = getRemotionEntryPoint();

    expect(entryPoint).toBe(
      path.join(repoRoot, "packages/video-template/src/render-entry.tsx"),
    );
    await expect(fs.readFile(entryPoint, "utf8")).resolves.toContain(
      "registerRoot(",
    );
  } finally {
    process.chdir(originalCwd);
  }
});

it("starts a stable Remotion bundle server over IPv4 loopback and closes it", async () => {
  const calls: unknown[] = [];
  let closedWith: boolean | null = null;

  const server = await startRemotionBundleServer({
    bundleDir: "C:/tmp/remotion-bundle",
    sampleRate: 48000,
    prepareServer: async (options) => {
      calls.push(options);
      return {
        serveUrl: "http://localhost:3000",
        closeServer: async (force: boolean) => {
          closedWith = force;
        },
      };
    },
  });

  expect(calls).toEqual([
    expect.objectContaining({
      webpackConfigOrServeUrl: "C:/tmp/remotion-bundle",
      forceIPv4: true,
      sampleRate: 48000,
    }),
  ]);
  expect(server.serveUrl).toBe("http://127.0.0.1:3000/");

  await server.close(true);

  expect(closedWith).toBe(true);
});

it("normalizes Remotion localhost serve URLs to IPv4 loopback", () => {
  expect(normalizeRemotionServeUrl("http://localhost:3000")).toBe(
    "http://127.0.0.1:3000/",
  );
  expect(normalizeRemotionServeUrl("http://127.0.0.1:3001/index.html")).toBe(
    "http://127.0.0.1:3001/index.html",
  );
});

it("preserves dense spectrum frames so exported visuals match preview behavior", () => {
  const project = createTestProject();
  const spectrumFrames = Array.from({ length: 1800 }, (_, frameIndex) => [
    frameIndex / 1800,
    1 - frameIndex / 1800,
  ]);
  project.tracks[0] = {
    ...project.tracks[0],
    durationSeconds: 60,
    spectrumFrames,
  };

  const prepared = prepareProjectForRemotionRender(project);

  expect(prepared).not.toBe(project);
  expect(prepared.tracks[0].spectrumFrames).toBe(spectrumFrames);
  expect(prepared.tracks[0].spectrumFrames?.length).toBe(1800);
  expect(prepared.tracks[0].spectrumFrames?.[0]).toEqual([0, 1]);
  expect(prepared.tracks[0].spectrumFrames?.at(-1)?.[0]).toBeGreaterThan(0.95);
});

it("renders Remotion through one stable IPv4 bundle server", async () => {
  const project = createTestProject();
  const selectedServeUrls: string[] = [];
  const renderedServeUrls: string[] = [];
  const renderOptions: unknown[] = [];
  const closed: boolean[] = [];
  const bundleDirs: string[] = [];

  await renderProjectVideoOnly({
    project,
    workspaceDir: "C:/workspace",
    tempDir: "C:/workspace/.tmp/export-123",
    videoOnlyPath: "C:/workspace/.tmp/export-123/video.mp4",
    bundleRemotion: async (options) => {
      bundleDirs.push(String(options.outDir));
      return String(options.outDir);
    },
    startBundleServer: async () => ({
      serveUrl: "http://127.0.0.1:3000/",
      close: async (force) => {
        closed.push(force);
      },
    }),
    selectCompositionFn: async (options) => {
      selectedServeUrls.push(options.serveUrl);
      return {
        id: "PlaylistVideo",
        width: project.exportConfig.width,
        height: project.exportConfig.height,
        fps: project.exportConfig.fps,
        durationInFrames: 30,
        props: {},
        defaultProps: {},
        defaultCodec: null,
        defaultOutName: null,
        defaultVideoImageFormat: null,
        defaultPixelFormat: null,
        defaultProResProfile: null,
        defaultSampleRate: null,
      };
    },
    renderMediaFn: async (options) => {
      renderOptions.push(options);
      renderedServeUrls.push(options.serveUrl);
      options.onProgress?.({
        renderedFrames: 30,
        encodedFrames: 30,
        encodedDoneIn: 1,
        renderedDoneIn: 1,
        renderEstimatedTime: 0,
        progress: 1,
        stitchStage: "encoding",
      });
      return { buffer: null, slowestFrames: [], contentType: "video/mp4" };
    },
  });

  expect(bundleDirs).toEqual([
    path.join("C:/workspace/.tmp/export-123", "remotion-bundle"),
  ]);
  expect(selectedServeUrls).toEqual(["http://127.0.0.1:3000/"]);
  expect(renderedServeUrls).toEqual(["http://127.0.0.1:3000/"]);
  expect(renderOptions[0]).toMatchObject({
    disallowParallelEncoding: false,
    imageFormat: "jpeg",
    jpegQuality: 100,
    videoBitrate: "12000k",
  });
  expect(renderOptions[0]).toHaveProperty("concurrency");
  expect(closed).toEqual([false]);
});

it("passes Remotion render progress through without export-stage remapping", async () => {
  const project = createTestProject();
  const progressUpdates: number[] = [];
  const stdoutWrite = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

  let stdoutCalls: unknown[][] = [];
  let timingMessages: string[] = [];

  try {
    await renderProjectVideoOnly({
      project,
      workspaceDir: "C:/workspace",
      tempDir: "C:/workspace/.tmp/export-123",
      videoOnlyPath: "C:/workspace/.tmp/export-123/video.mp4",
      onProgress: (progress) => progressUpdates.push(progress),
      bundleRemotion: async (options) => String(options.outDir),
      startBundleServer: async () => ({
        serveUrl: "http://127.0.0.1:3000/",
        close: async () => undefined,
      }),
      selectCompositionFn: async () => ({
        id: "PlaylistVideo",
        width: project.exportConfig.width,
        height: project.exportConfig.height,
        fps: project.exportConfig.fps,
        durationInFrames: 30,
        props: {},
        defaultProps: {},
        defaultCodec: null,
        defaultOutName: null,
        defaultVideoImageFormat: null,
        defaultPixelFormat: null,
        defaultProResProfile: null,
        defaultSampleRate: null,
      }),
      renderMediaFn: async (options) => {
        options.onProgress?.({
          renderedFrames: 15,
          encodedFrames: 15,
          encodedDoneIn: null,
          renderedDoneIn: null,
          renderEstimatedTime: 1,
          progress: 0.5,
          stitchStage: "encoding",
        });
        options.onProgress?.({
          renderedFrames: 30,
          encodedFrames: 30,
          encodedDoneIn: 1,
          renderedDoneIn: 1,
          renderEstimatedTime: 0,
          progress: 1,
          stitchStage: "encoding",
        });
        return { buffer: null, slowestFrames: [], contentType: "video/mp4" };
      },
    });
    stdoutCalls = [...stdoutWrite.mock.calls];
    timingMessages = info.mock.calls.map(([message]) => String(message));
  } finally {
    stdoutWrite.mockRestore();
    info.mockRestore();
  }

  expect(progressUpdates).toEqual([0.5, 1]);
  expect(stdoutCalls).toEqual(
    expect.arrayContaining([
      [expect.stringContaining("[Remotion] Rendering video 50.0%")],
    ]),
  );
  expect(timingMessages).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[Timing\] Remotion bundle completed in \d+\.\d{2}s$/,
      ),
      expect.stringMatching(
        /^\[Timing\] Remotion select composition completed in \d+\.\d{2}s$/,
      ),
      expect.stringMatching(
        /^\[Timing\] Remotion render video completed in \d+\.\d{2}s$/,
      ),
    ]),
  );
});
it("passes PNG intermediate frame settings to Remotion without JPEG quality", async () => {
  const project = createTestProject();
  project.exportConfig = {
    ...project.exportConfig,
    frameImageFormat: "png",
    jpegQuality: 92,
  };
  let renderOptions: unknown = null;

  await renderProjectVideoOnly({
    project,
    workspaceDir: "C:/workspace",
    tempDir: "C:/workspace/.tmp/export-123",
    videoOnlyPath: "C:/workspace/.tmp/export-123/video.mp4",
    bundleRemotion: async (options) => String(options.outDir),
    startBundleServer: async () => ({
      serveUrl: "http://127.0.0.1:3000/",
      close: async () => undefined,
    }),
    selectCompositionFn: async () => ({
      id: "PlaylistVideo",
      width: project.exportConfig.width,
      height: project.exportConfig.height,
      fps: project.exportConfig.fps,
      durationInFrames: 30,
      props: {},
      defaultProps: {},
      defaultCodec: null,
      defaultOutName: null,
      defaultVideoImageFormat: null,
      defaultPixelFormat: null,
      defaultProResProfile: null,
      defaultSampleRate: null,
    }),
    renderMediaFn: async (options) => {
      renderOptions = options;
      return { buffer: null, slowestFrames: [], contentType: "video/mp4" };
    },
  });

  expect(renderOptions).toMatchObject({ imageFormat: "png" });
  expect(renderOptions).not.toHaveProperty("jpegQuality");
});

it("logs timing for export audio, video render, final mux, and cleanup steps", async () => {
  const workspaceDir = await fs.mkdtemp(
    path.join(process.cwd(), ".tmp-export-test-"),
  );
  const outputDir = path.join(workspaceDir, "output");
  const project = createTestProject();
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

  let messages: string[] = [];

  try {
    await exportProject({
      project,
      outputDir,
      workspaceDir,
      runFfmpeg: async (args) => {
        const outputPath = args.at(-1);
        if (outputPath) await fs.writeFile(outputPath, "");
      },
      renderVideoOnly: async ({ videoOnlyPath }) => {
        await fs.writeFile(videoOnlyPath, "");
      },
      finalFfmpegExport: async ({ outputPath }) => {
        await fs.writeFile(outputPath, "");
      },
    });
    messages = info.mock.calls.map(([message]) => String(message));
  } finally {
    info.mockRestore();
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }
  expect(messages).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[Timing\] FFmpeg audio concat\/transcode completed in \d+\.\d{2}s$/,
      ),
      expect.stringMatching(
        /^\[Timing\] Final mux\/re-encode completed in \d+\.\d{2}s$/,
      ),
      expect.stringMatching(
        /^\[Timing\] Temp cleanup completed in \d+\.\d{2}s$/,
      ),
    ]),
  );
});
it("cleans temporary export files by default after a successful export", async () => {
  const workspaceDir = await fs.mkdtemp(
    path.join(process.cwd(), ".tmp-export-test-"),
  );
  const outputDir = path.join(workspaceDir, "output");
  const project = createTestProject();
  const createdTempDirs: string[] = [];

  await exportProject({
    project,
    outputDir,
    workspaceDir,
    runFfmpeg: async (args) => {
      const outputPath = args.at(-1);
      if (outputPath) await fs.writeFile(outputPath, "");
    },
    renderVideoOnly: async ({ tempDir, videoOnlyPath }) => {
      createdTempDirs.push(tempDir);
      await fs.writeFile(videoOnlyPath, "");
    },
    finalFfmpegExport: async ({ outputPath }) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, "");
    },
  });

  await expect(fs.stat(createdTempDirs[0])).rejects.toMatchObject({
    code: "ENOENT",
  });
  await fs.rm(workspaceDir, { recursive: true, force: true });
});

it("can preserve temporary export files for diagnostics", async () => {
  const workspaceDir = await fs.mkdtemp(
    path.join(process.cwd(), ".tmp-export-test-"),
  );
  const outputDir = path.join(workspaceDir, "output");
  const project = createTestProject();
  const createdTempDirs: string[] = [];

  await exportProject({
    project,
    outputDir,
    workspaceDir,
    keepTempFiles: true,
    runFfmpeg: async (args) => {
      const outputPath = args.at(-1);
      if (outputPath) await fs.writeFile(outputPath, "");
    },
    renderVideoOnly: async ({ tempDir, videoOnlyPath }) => {
      createdTempDirs.push(tempDir);
      await fs.writeFile(videoOnlyPath, "");
    },
    finalFfmpegExport: async ({ outputPath }) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, "");
    },
  });

  await expect(fs.stat(createdTempDirs[0])).resolves.toBeTruthy();
  await fs.rm(workspaceDir, { recursive: true, force: true });
});

it("maps only audio during FFmpeg concat so embedded MP3 cover art is not encoded as video", () => {
  const exportConfig: ExportConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: "h264",
    videoBitrateKbps: 12000,
    spectrumFps: 30,
    renderQuality: "high",
    frameImageFormat: "jpeg",
    jpegQuality: 100,
    outputFileName: "playlist-video.mp4",
    audioCodec: "aac",
    audioBitrateKbps: 320,
    audioSampleRate: 48000,
    audioChannels: 2,
    audioVolumePercent: 100,
  };

  const args = buildAudioFfmpegArgs(
    "audio-list.txt",
    "audio.m4a",
    exportConfig,
  );

  expect(args).toContain("-vn");
  expect(args.slice(args.indexOf("-map"), args.indexOf("-map") + 2)).toEqual([
    "-map",
    "0:a:0",
  ]);
});

it("builds FFmpeg audio concat arguments from export settings", () => {
  const exportConfig: ExportConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: "h264",
    videoBitrateKbps: 12000,
    spectrumFps: 30,
    renderQuality: "high",
    frameImageFormat: "jpeg",
    jpegQuality: 100,
    outputFileName: "playlist-video.mp4",
    audioCodec: "aac",
    audioBitrateKbps: 256,
    audioSampleRate: 44100,
    audioChannels: 1,
    audioVolumePercent: 85,
  };

  expect(
    buildAudioFfmpegArgs("audio-list.txt", "audio.m4a", exportConfig),
  ).toEqual([
    "-y",
    "-stats",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "audio-list.txt",
    "-map",
    "0:a:0",
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "256k",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-filter:a",
    "volume=0.85",
    "audio.m4a",
  ]);
});

it("selects the highest-priority available H.264 hardware encoder from FFmpeg encoder output", () => {
  const encodersOutput = `
 V....D h264_amf             AMD AMF H.264 Encoder
 V....D h264_qsv             H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (Intel Quick Sync Video acceleration)
 V....D h264_nvenc           NVIDIA NVENC H.264 encoder
`;

  expect(selectH264HardwareEncoder(encodersOutput)).toBe("h264_nvenc");
});

it("falls through hardware encoder priority when the preferred encoder is missing", () => {
  const encodersOutput = `
 V....D h264_amf             AMD AMF H.264 Encoder
 V....D h264_qsv             Intel Quick Sync Video H.264 encoder
`;

  expect(selectH264HardwareEncoder(encodersOutput)).toBe("h264_qsv");
});

it("returns null when FFmpeg exposes no supported H.264 hardware encoder", () => {
  const encodersOutput = `
 V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
 V....D libx264rgb           libx264 H.264 RGB
`;

  expect(selectH264HardwareEncoder(encodersOutput)).toBeNull();
});

it("builds final FFmpeg args for GPU-accelerated H.264 export", () => {
  expect(
    buildFinalFfmpegArgs({
      videoPath: "video.mp4",
      audioPath: "audio.m4a",
      outputPath: "out.mp4",
      videoEncoder: "h264_nvenc",
      videoBitrateKbps: 8000,
    }),
  ).toEqual([
    "-y",
    "-stats",
    "-i",
    "video.mp4",
    "-i",
    "audio.m4a",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "h264_nvenc",
    "-b:v",
    "8000k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-shortest",
    "out.mp4",
  ]);
});

it("builds final FFmpeg stream-copy mux args", () => {
  expect(
    buildFinalFfmpegCopyArgs({
      videoPath: "video.mp4",
      audioPath: "audio.m4a",
      outputPath: "out.mp4",
    }),
  ).toEqual([
    "-y",
    "-stats",
    "-i",
    "video.mp4",
    "-i",
    "audio.m4a",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-shortest",
    "out.mp4",
  ]);
});

it("builds final FFmpeg args for CPU fallback H.264 export", () => {
  expect(
    buildFinalFfmpegArgs({
      videoPath: "video.mp4",
      audioPath: "audio.m4a",
      outputPath: "out.mp4",
      videoEncoder: "libx264",
      videoBitrateKbps: 8000,
    }),
  ).toEqual([
    "-y",
    "-stats",
    "-i",
    "video.mp4",
    "-i",
    "audio.m4a",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-b:v",
    "8000k",
    "-preset",
    "medium",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    "-shortest",
    "out.mp4",
  ]);
});

it("uses inherited stdio for FFmpeg so progress output is visible in the terminal", () => {
  expect(getVisibleFfmpegOptions()).toMatchObject({ stdio: "inherit" });
});

it("uses hardware encoder defaults that work across GPU vendors instead of NVENC-only presets", () => {
  const args = buildFinalFfmpegArgs({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoEncoder: "h264_qsv",
    videoBitrateKbps: 8000,
  });

  expect(args).toContain("h264_qsv");
  expect(args).not.toContain("p4");
});

it("falls back to CPU final export when stream-copy mux fails and no GPU encoder is detected", async () => {
  const calls: string[][] = [];
  const warnings: string[] = [];

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoBitrateKbps: 8000,
    detectHardwareEncoder: async () => null,
    runFfmpeg: async (args) => {
      calls.push(args);
      const videoCodec = args[args.indexOf("-c:v") + 1];
      if (videoCodec === "copy") throw new Error("copy mux failed");
    },
    logInfo: () => undefined,
    logWarn: (message) => warnings.push(message),
  });

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("copy");
  expect(calls[1]).toContain("libx264");
  expect(calls[1]).toContain("8000k");
  expect(warnings.join("\n")).toContain("Stream-copy final mux failed");
  expect(warnings.join("\n")).toContain("Falling back to CPU encoder libx264");
});

it("uses stream-copy mux before probing GPU encoders for final export", async () => {
  const calls: string[][] = [];
  let probedHardware = false;

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoBitrateKbps: 8000,
    detectHardwareEncoder: async () => {
      probedHardware = true;
      return "h264_nvenc";
    },
    runFfmpeg: async (args) => {
      calls.push(args);
    },
    logInfo: () => undefined,
    logWarn: () => undefined,
  });

  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("copy");
  expect(calls[0]).not.toContain("h264_nvenc");
  expect(probedHardware).toBe(false);
});

it("falls back to GPU or CPU re-encode when stream-copy mux fails", async () => {
  const calls: string[][] = [];
  const warnings: string[] = [];

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoBitrateKbps: 8000,
    detectHardwareEncoder: async () => "h264_nvenc",
    runFfmpeg: async (args) => {
      calls.push(args);
      const videoCodec = args[args.indexOf("-c:v") + 1];
      if (videoCodec === "copy") throw new Error("copy mux failed");
    },
    logInfo: () => undefined,
    logWarn: (message) => warnings.push(message),
  });

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("copy");
  expect(calls[1]).toContain("h264_nvenc");
  expect(warnings.join("\n")).toContain("Stream-copy final mux failed");
});

it("falls back to CPU final export when stream-copy mux and the detected GPU encoder both fail", async () => {
  const calls: string[][] = [];
  const warnings: string[] = [];

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoBitrateKbps: 8000,
    detectHardwareEncoder: async () => "h264_nvenc",
    runFfmpeg: async (args) => {
      calls.push(args);
      const videoCodec = args[args.indexOf("-c:v") + 1];
      if (videoCodec === "copy") throw new Error("copy mux failed");
      if (videoCodec === "h264_nvenc") throw new Error("GPU unavailable");
    },
    logInfo: () => undefined,
    logWarn: (message) => warnings.push(message),
  });

  expect(calls).toHaveLength(3);
  expect(calls[0]).toContain("copy");
  expect(calls[1]).toContain("h264_nvenc");
  expect(calls[1]).toContain("8000k");
  expect(calls[2]).toContain("libx264");
  expect(calls[2]).toContain("8000k");
  expect(warnings.join("\n")).toContain("Stream-copy final mux failed");
  expect(warnings.join("\n")).toContain("GPU encoder h264_nvenc failed");
  expect(warnings.join("\n")).toContain("Falling back to CPU encoder libx264");
});

it("probes listed GPU encoders and skips an encoder that cannot actually be initialized", async () => {
  const probed: string[] = [];

  const encoder = await detectH264HardwareEncoder({
    readEncoders: async () => "h264_nvenc\nh264_qsv\nh264_amf\n",
    probeEncoder: async (candidate) => {
      probed.push(candidate);
      return candidate === "h264_qsv";
    },
  });

  expect(encoder).toBe("h264_qsv");
  expect(probed).toEqual(["h264_nvenc", "h264_qsv"]);
});

it("returns null when every listed GPU encoder fails the usability probe", async () => {
  const probed: string[] = [];

  const encoder = await detectH264HardwareEncoder({
    readEncoders: async () => "h264_nvenc\nh264_qsv\n",
    probeEncoder: async (candidate) => {
      probed.push(candidate);
      return false;
    },
  });

  expect(encoder).toBeNull();
  expect(probed).toEqual(["h264_nvenc", "h264_qsv"]);
});

it("detects probeable GPU encoders from real FFmpeg-style output with leading capability columns", async () => {
  const encoder = await detectH264HardwareEncoder({
    readEncoders: async () => `
 V....D h264_nvenc           NVIDIA NVENC H.264 encoder
 V....D h264_qsv             Intel Quick Sync Video H.264 encoder
`,
    probeEncoder: async () => true,
  });

  expect(encoder).toBe("h264_nvenc");
});

it("maps final FFmpeg output to video-only from render input and audio from concatenated audio input", () => {
  const args = buildFinalFfmpegArgs({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    videoEncoder: "libx264",
    videoBitrateKbps: 8000,
  });

  expect(args.slice(args.indexOf("-map"), args.indexOf("-map") + 4)).toEqual([
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
  ]);
});

it("probes GPU encoders with dimensions large enough for NVENC minimum frame size", async () => {
  const commands: string[][] = [];

  const encoder = await detectH264HardwareEncoder({
    readEncoders: async () => "h264_nvenc\n",
    probeEncoder: undefined,
    runProbe: async (_command, args) => {
      commands.push(args);
    },
  });

  expect(encoder).toBe("h264_nvenc");
  expect(commands[0]).toContain("testsrc2=size=256x144:rate=1:duration=1");
});

function createTestProject(): Project {
  return {
    id: "project-test",
    name: "Test Project",
    sourceFolder: "C:/music",
    tracks: [
      {
        id: "track-1",
        sourcePath: "C:/music/track.mp3",
        title: "Track",
        artist: "Artist",
        album: null,
        durationSeconds: 1,
        coverPath: null,
        order: 0,
      },
    ],
    theme: {
      themeId: "playlist-v4",
      effectIntensity: "high",
      showParticles: true,
      showPulseRings: true,
      playlistPanelMode: "full",
    },
    exportConfig: {
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: "h264",
      videoBitrateKbps: 12000,
      spectrumFps: 30,
      renderQuality: "high",
      frameImageFormat: "jpeg",
      jpegQuality: 100,
      outputFileName: "playlist-video.mp4",
      audioCodec: "aac",
      audioBitrateKbps: 320,
      audioSampleRate: 48000,
      audioChannels: 2,
      audioVolumePercent: 100,
    },
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
