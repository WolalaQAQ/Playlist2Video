import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import type { BundleOptions } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type {
  RenderStillOptions,
  SelectCompositionOptions,
} from "@remotion/renderer";
import type { Project, Track } from "@playlist2video/shared";
import {
  getRemotionEntryPoint,
  prepareProjectForRemotionRender,
  startRemotionBundleServer,
} from "./export-service";

export interface StillExportFile {
  trackId: string;
  title: string;
  outputPath: string;
}

export interface StillOutputPlanItem {
  trackId: string;
  outputPath: string;
}

export interface ExportProjectStillsOptions {
  project: Project;
  outputDir: string;
  workspaceDir: string;
  bundleRemotion?: (options: BundleOptions) => Promise<string>;
  startBundleServer?: typeof startRemotionBundleServer;
  selectCompositionFn?: (
    options: SelectCompositionOptions,
  ) => ReturnType<typeof selectComposition>;
  renderStillFn?: (
    options: RenderStillOptions,
  ) => ReturnType<typeof renderStill>;
}

const windowsReservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function sanitizeStillFileNameSegment(value: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. -]+$/g, "")
    .trim();
  if (!sanitized || windowsReservedNames.test(sanitized)) return "track";
  return sanitized.slice(0, 120);
}

function sortedTracks(project: Project): Track[] {
  return [...project.tracks].sort((a, b) => a.order - b.order);
}

export function buildStillOutputPlan(options: {
  project: Project;
  outputDir: string;
}): StillOutputPlanItem[] {
  const stillsDir = path.join(options.outputDir, "stills");
  const tracks = sortedTracks(options.project);
  const indexWidth = String(tracks.length).length;
  return tracks.map((track, index) => ({
    trackId: track.id,
    outputPath: path.join(
      stillsDir,
      `${String(index + 1).padStart(indexWidth, "0")}-${sanitizeStillFileNameSegment(track.title)}.png`,
    ),
  }));
}

export async function exportProjectStills(
  options: ExportProjectStillsOptions,
): Promise<{ outputDir: string; files: StillExportFile[] }> {
  const outputDir = path.join(options.outputDir, "stills");
  await fs.mkdir(outputDir, { recursive: true });

  const bundleRemotion = options.bundleRemotion ?? bundle;
  const startBundleServer =
    options.startBundleServer ?? startRemotionBundleServer;
  const selectCompositionFn = options.selectCompositionFn ?? selectComposition;
  const renderStillFn = options.renderStillFn ?? renderStill;
  const tempDir = path.join(options.workspaceDir, ".tmp", `still-export-${Date.now()}`);
  const bundleDir = path.join(tempDir, "remotion-bundle");
  const renderProject = prepareProjectForRemotionRender(options.project);
  const inputPropsBase = {
    project: renderProject,
    renderMode: "static-image" as const,
  };
  let server: Awaited<ReturnType<typeof startRemotionBundleServer>> | null = null;

  try {
    const bundledServeUrl = await bundleRemotion({
      entryPoint: getRemotionEntryPoint(),
      outDir: bundleDir,
      publicDir: path.join(options.workspaceDir, "assets"),
    });
    server = await startBundleServer({
      bundleDir: bundledServeUrl,
      sampleRate: options.project.exportConfig.audioSampleRate,
    });
    const composition = await selectCompositionFn({
      serveUrl: server.serveUrl,
      id: "PlaylistVideo",
      inputProps: inputPropsBase,
    });
    const plan = buildStillOutputPlan({
      project: options.project,
      outputDir: options.outputDir,
    });
    const tracksById = new Map(
      options.project.tracks.map((track) => [track.id, track]),
    );
    const files: StillExportFile[] = [];

    for (const item of plan) {
      await renderStillFn({
        composition,
        serveUrl: server.serveUrl,
        imageFormat: "png",
        frame: 0,
        output: item.outputPath,
        inputProps: { ...inputPropsBase, stillTrackId: item.trackId },
        overwrite: true,
      });
      files.push({
        trackId: item.trackId,
        title: tracksById.get(item.trackId)?.title ?? item.trackId,
        outputPath: item.outputPath,
      });
    }

    return { outputDir, files };
  } finally {
    await server?.close(false);
    await fs.rm(tempDir, {recursive: true, force: true});
  }
}
