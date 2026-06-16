import React, {useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject} from '../api/client';
import type {Translation} from '../i18n';

export const ExportPanel: React.FC<{
  copy: Translation['exportPanel'];
  project: Project | null;
  previewProject: Project | null;
  isPreviewStale: boolean;
}> = ({copy, project, previewProject, isPreviewStale}) => {
  const [exporting, setExporting] = useState(false);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canExport = Boolean(project && previewProject && !isPreviewStale && !exporting);

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

  return (
    <section className="card">
      <h2>{copy.title}</h2>
      <button disabled={!canExport} onClick={handleExport}>{exporting ? copy.exportingButton : copy.button}</button>
      {project && !previewProject ? <p className="panel-muted">{copy.needsPreview}</p> : null}
      {isPreviewStale ? <p className="panel-muted">{copy.previewStale}</p> : null}
      {outputPath ? <p>{copy.exportedTo(outputPath)}</p> : null}
      {error ? <p className="inline-error">{error}</p> : null}
    </section>
  );
};
