// @vitest-environment jsdom
import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {translations} from '../i18n';
import {ExportPanel} from './ExportPanel';

const apiMocks = vi.hoisted(() => ({
  exportCurrentProject: vi.fn(),
  exportCurrentProjectStills: vi.fn(),
}));

vi.mock('../api/client', () => apiMocks);

const project = {id: 'project-1', tracks: []} as unknown as Project;

describe('ExportPanel', () => {
  beforeEach(() => {
    apiMocks.exportCurrentProject.mockReset();
    apiMocks.exportCurrentProjectStills.mockReset();
    apiMocks.exportCurrentProjectStills.mockResolvedValue({outputDir: 'C:/out/stills', files: [{trackId: 'track-1', title: 'Song', outputPath: 'C:/out/stills/01-Song.png'}]});
  });

  it('lets users export one static PNG image per track from the generated preview snapshot', async () => {
    render(<ExportPanel copy={translations.en.exportPanel} project={project} previewProject={project} isPreviewStale={false} />);

    fireEvent.click(screen.getByRole('button', {name: 'Export PNG stills'}));

    await waitFor(() => expect(apiMocks.exportCurrentProjectStills).toHaveBeenCalledWith(project));
    expect(await screen.findByText('Exported 1 PNG still to C:/out/stills')).not.toBeNull();
  });
});
