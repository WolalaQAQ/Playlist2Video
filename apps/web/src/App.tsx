import React, {useEffect, useMemo, useState} from 'react';
import type {Project} from '@playlist2video/shared';
import {ExportPanel} from './components/ExportPanel';
import {FolderImporter} from './components/FolderImporter';
import {PlaylistEditor} from './components/PlaylistEditor';
import {ThemePanel} from './components/ThemePanel';
import {VideoPreview} from './components/VideoPreview';
import {getInitialLanguage, languageStorageKey, type Language, translations} from './i18n';
import {useProjectStore} from './state/project-store';

function cloneProject(project: Project): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({...track})),
    theme: {...project.theme},
    exportConfig: {...project.exportConfig},
  };
}

export const App: React.FC = () => {
  const store = useProjectStore();
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [isPreviewStale, setIsPreviewStale] = useState(false);
  const copy = translations[language];
  const nextLanguage = useMemo<Language>(() => (language === 'zh' ? 'en' : 'zh'), [language]);

  useEffect(() => {
    document.documentElement.lang = copy.htmlLang;
    try {
      window.localStorage.setItem(languageStorageKey, language);
    } catch {
      // Ignore storage errors so the language switch still works in private or restricted contexts.
    }
  }, [copy.htmlLang, language]);

  async function handleScan(folderPath: string) {
    setPreviewProject(null);
    setIsPreviewStale(false);
    await store.scan(folderPath);
  }

  function handleGenerateVideo() {
    if (!store.project) return;
    setPreviewProject(cloneProject(store.project));
    setIsPreviewStale(false);
  }

  async function handleReorder(trackIds: string[]) {
    setIsPreviewStale(Boolean(previewProject));
    const project = await store.reorder(trackIds);
    return project;
  }

  async function handleUpdateTrack(input: {trackId: string; title: string; artist: string}) {
    setIsPreviewStale(Boolean(previewProject));
    const project = await store.updateTrack(input);
    return project;
  }

  async function handleUpdateSettings(settings: Parameters<typeof store.updateSettings>[0]) {
    setIsPreviewStale(Boolean(previewProject));
    const project = await store.updateSettings(settings);
    return project;
  }

  return (
    <div className="app-shell">
      <header>
        <div className="topbar">
          <span>{copy.appTag}</span>
          <button
            className="language-toggle"
            onClick={() => setLanguage(nextLanguage)}
            type="button"
          >
            {copy.switchLanguage}
          </button>
        </div>
        <h1>{copy.appTitle}</h1>
      </header>
      <main>
        <div className="left-column">
          <FolderImporter copy={copy.folderImporter} loading={store.loading} onScan={handleScan} />
          {store.error ? <div className="error-box">{store.error}</div> : null}
          {store.warnings.length > 0 ? <div className="warning-box">{store.warnings.join('\n')}</div> : null}
          {store.project ? <PlaylistEditor copy={copy.playlist} project={store.project} onReorder={handleReorder} onUpdateTrack={handleUpdateTrack} /> : null}
        </div>
        <div className="right-column">
          <section className="card generate-panel">
            <div>
              <h2>{copy.generate.title}</h2>
              <p>{copy.generate.description}</p>
            </div>
            <button disabled={!store.project} onClick={handleGenerateVideo}>{copy.generate.button}</button>
          </section>
          <VideoPreview copy={copy.preview} project={previewProject} hasEditableProject={Boolean(store.project)} />
          <ThemePanel copy={copy.theme} project={store.project} onUpdateSettings={handleUpdateSettings} />
          <ExportPanel copy={copy.exportPanel} project={store.project} previewProject={previewProject} isPreviewStale={isPreviewStale} />
        </div>
      </main>
    </div>
  );
};
