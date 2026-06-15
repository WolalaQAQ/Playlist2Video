export type Language = 'zh' | 'en';

export const languageStorageKey = 'playlist2video.language';

export const translations = {
  zh: {
    htmlLang: 'zh-CN',
    languageName: '中文',
    switchLanguage: 'English',
    appTag: 'Playlist2Video',
    appTitle: '把本地音乐文件夹转换为歌单视频。',
    folderImporter: {
      title: '导入本地音频文件夹',
      description: '输入包含 MP3、FLAC、WAV、M4A、AAC 或 OGG 文件的本地文件夹路径。',
      placeholder: 'C:\\Users\\You\\Music\\Playlist',
      scanButton: '扫描文件夹',
      scanningButton: '扫描中...',
    },
    generate: {
      title: '生成视频',
      description: '扫描和调整顺序后，点击这里刷新右侧预览；不会导出 MP4。',
      button: '生成视频',
    },
    playlist: {
      title: '歌单',
      trackCount: (count: number) => `${count} 首歌曲`,
      help: '拖动每首歌左侧的手柄来调整顺序；只会保存歌单顺序，不会自动生成视频。',
      trackLabel: (index: number, title: string) => `第 ${index} 首：${title}`,
      dragLabel: (title: string) => `拖动 ${title}`,
      dragTitle: '拖动调整顺序',
      titleInputLabel: '歌曲标题',
      artistInputLabel: '歌手',
    },
    preview: {
      title: '预览',
      emptyWithProject: '点击“生成视频”来构建预览。',
      emptyWithoutProject: '扫描文件夹以准备歌单。',
    },
    theme: {
      title: '主题',
      name: 'Playlist V4',
      description: 'YouTube 风格歌单布局，包含实时频谱和节拍联动效果。',
      selected: '已选择',
    },
    exportPanel: {
      title: '导出',
      description: '默认输出：1920x1080、30fps、MP4。',
      button: '导出 MP4',
      exportingButton: '导出中...',
      exportedTo: (outputPath: string) => `已导出到 ${outputPath}`,
      fallbackError: '导出失败',
    },
  },
  en: {
    htmlLang: 'en',
    languageName: 'English',
    switchLanguage: '中文',
    appTag: 'Playlist2Video',
    appTitle: 'Turn a local music folder into a playlist video.',
    folderImporter: {
      title: 'Import local audio folder',
      description: 'Enter a local folder path containing MP3, FLAC, WAV, M4A, AAC, or OGG files.',
      placeholder: 'C:\\Users\\You\\Music\\Playlist',
      scanButton: 'Scan folder',
      scanningButton: 'Scanning...',
    },
    generate: {
      title: 'Generate video',
      description: 'After scanning and reordering, click here to refresh the preview on the right. This will not export an MP4.',
      button: 'Generate video',
    },
    playlist: {
      title: 'Playlist',
      trackCount: (count: number) => `${count} ${count === 1 ? 'track' : 'tracks'}`,
      help: 'Drag the handle on the left of each track to reorder it. This only saves playlist order and does not auto-generate the video.',
      trackLabel: (index: number, title: string) => `Track ${index}: ${title}`,
      dragLabel: (title: string) => `Drag ${title}`,
      dragTitle: 'Drag to reorder',
      titleInputLabel: 'Track title',
      artistInputLabel: 'Track artist',
    },
    preview: {
      title: 'Preview',
      emptyWithProject: 'Click Generate video to build the preview.',
      emptyWithoutProject: 'Scan a folder to prepare a playlist.',
    },
    theme: {
      title: 'Theme',
      name: 'Playlist V4',
      description: 'YouTube-style playlist layout with realtime spectrum and beat-reactive effects.',
      selected: 'Selected',
    },
    exportPanel: {
      title: 'Export',
      description: 'Default output: 1920x1080, 30fps, MP4.',
      button: 'Export MP4',
      exportingButton: 'Exporting...',
      exportedTo: (outputPath: string) => `Exported to ${outputPath}`,
      fallbackError: 'Export failed',
    },
  },
} satisfies Record<Language, {
  htmlLang: string;
  languageName: string;
  switchLanguage: string;
  appTag: string;
  appTitle: string;
  folderImporter: {
    title: string;
    description: string;
    placeholder: string;
    scanButton: string;
    scanningButton: string;
  };
  generate: {
    title: string;
    description: string;
    button: string;
  };
  playlist: {
    title: string;
    trackCount: (count: number) => string;
    help: string;
    trackLabel: (index: number, title: string) => string;
    dragLabel: (title: string) => string;
    dragTitle: string;
    titleInputLabel: string;
    artistInputLabel: string;
  };
  preview: {
    title: string;
    emptyWithProject: string;
    emptyWithoutProject: string;
  };
  theme: {
    title: string;
    name: string;
    description: string;
    selected: string;
  };
  exportPanel: {
    title: string;
    description: string;
    button: string;
    exportingButton: string;
    exportedTo: (outputPath: string) => string;
    fallbackError: string;
  };
}>;

export type Translation = (typeof translations)[Language];

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh';
  try {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    return storedLanguage === 'en' || storedLanguage === 'zh' ? storedLanguage : 'zh';
  } catch {
    return 'zh';
  }
}
