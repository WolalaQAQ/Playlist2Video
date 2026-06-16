import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject, exportCurrentProjectStills} from '../api/client';
import type {Translation} from '../i18n';

export const ExportPanel: React.FC<{
  copy: Translation['exportPanel'];
  project: Project | null;
  previewProject: Project | null;
  isPreviewStale: boolean;
}> = ({copy, project, previewProject, isPreviewStale}) => {
  const [exporting, setExporting] = useState(false);
  const [exportingStills, setExportingStills] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [stillsOutput, setStillsOutput] = useState<{outputDir: string; count: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canExport = Boolean(project && previewProject && !isPreviewStale && !exporting && !exportingStills);

  async function handleExport() {
    if (!previewProject || isPreviewStale) return;
    setExporting(true);
    setError(null);
    try {
      setOutputPath((await exportCurrentProject(previewProject)).outputPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.fallbackError);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportStills() {
    if (!previewProject || isPreviewStale) return;
    setExportingStills(true);
    setError(null);
    try {
      const result = await exportCurrentProjectStills(previewProject);
      setStillsOutput({outputDir: result.outputDir, count: result.files.length});
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.fallbackError);
    } finally {
      setExportingStills(false);
    }
  }

  return (
    <section className="card">
      <h2>{copy.title}</h2>
      <button disabled={!canExport} onClick={handleExport}>{exporting ? copy.exportingButton : copy.button}</button>
      <button disabled={!canExport} onClick={handleExportStills}>{exportingStills ? copy.exportingStillsButton : copy.stillsButton}</button>
      {project && !previewProject ? <p className="panel-muted">{copy.needsPreview}</p> : null}
      {isPreviewStale ? <p className="panel-muted">{copy.previewStale}</p> : null}
      {outputPath ? <p>{copy.exportedTo(outputPath)}</p> : null}
      {stillsOutput ? <p>{copy.stillsExportedTo(stillsOutput.count, stillsOutput.outputDir)}</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};
