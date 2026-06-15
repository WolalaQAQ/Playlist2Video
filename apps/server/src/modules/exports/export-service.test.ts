import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { ExportConfig, Project } from "@playlist2video/shared";
import {
  buildAudioFfmpegArgs,
  buildFfmpegConcatList,
  buildFinalFfmpegArgs,
  detectH264HardwareEncoder,
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

it("downsamples dense spectrum frames before passing project props to Remotion", () => {
  const project = createTestProject();
  project.tracks[0] = {
    ...project.tracks[0],
    durationSeconds: 60,
    spectrumFrames: Array.from({ length: 1800 }, (_, frameIndex) => [
      frameIndex / 1800,
      1 - frameIndex / 1800,
    ]),
  };

  const prepared = prepareProjectForRemotionRender(project);

  expect(prepared).not.toBe(project);
  expect(prepared.tracks[0].spectrumFrames?.length).toBeLessThanOrEqual(600);
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
    disallowParallelEncoding: true,
    concurrency: 1,
  });
  expect(closed).toEqual([false]);
});

it("maps only audio during FFmpeg concat so embedded MP3 cover art is not encoded as video", () => {
  const exportConfig: ExportConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: "h264",
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
    "-pix_fmt",
    "yuv420p",
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
  });

  expect(args).toContain("h264_qsv");
  expect(args).not.toContain("p4");
});

it("falls back to CPU final export when no GPU encoder is detected", async () => {
  const calls: string[][] = [];
  const warnings: string[] = [];

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    detectHardwareEncoder: async () => null,
    runFfmpeg: async (args) => {
      calls.push(args);
    },
    logInfo: () => undefined,
    logWarn: (message) => warnings.push(message),
  });

  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("libx264");
  expect(warnings.join("\n")).toContain("Falling back to CPU encoder libx264");
});

it("falls back to CPU final export when the detected GPU encoder fails", async () => {
  const calls: string[][] = [];
  const warnings: string[] = [];

  await runFinalFfmpegExport({
    videoPath: "video.mp4",
    audioPath: "audio.m4a",
    outputPath: "out.mp4",
    detectHardwareEncoder: async () => "h264_nvenc",
    runFfmpeg: async (args) => {
      calls.push(args);
      if (args.includes("h264_nvenc")) throw new Error("GPU unavailable");
    },
    logInfo: () => undefined,
    logWarn: (message) => warnings.push(message),
  });

  expect(calls).toHaveLength(2);
  expect(calls[0]).toContain("h264_nvenc");
  expect(calls[1]).toContain("libx264");
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
