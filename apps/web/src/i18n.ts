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
      title: '参数调整',
      name: 'Playlist V4',
      description: 'YouTube 风格歌单布局，包含实时频谱和节拍联动效果。',
      selected: '已选择',
      empty: '扫描文件夹后可调整参数。',
      visualGroup: '视觉效果',
      exportGroup: '导出设置',
      audioGroup: '音频导出设置',
      advancedGroup: '高级信息',
      effectIntensity: '效果强度',
      intensityOptions: {low: '低', medium: '中', high: '高'},
      showParticles: '显示粒子',
      showPulseRings: '显示脉冲环',
      themeId: '主题 ID',
      width: '宽度',
      height: '高度',
      fps: 'FPS',
      videoCodec: '视频编码',
      outputFileName: '输出文件名',
      audioCodec: '音频编码',
      audioBitrate: '音频码率',
      audioSampleRate: '采样率',
      audioChannels: '声道数',
      audioVolume: '音量',
      audioBitrateOptions: {
        128: '128 kbps',
        192: '192 kbps',
        256: '256 kbps',
        320: '320 kbps',
      },
      audioSampleRateOptions: {
        44100: '44.1 kHz',
        48000: '48 kHz',
      },
      audioChannelOptions: {
        1: '单声道',
        2: '立体声',
      },
      saveHint: '参数会保存到当前项目；点击“生成视频”刷新预览。',
      saving: '保存中...',
      saved: '已保存',
      saveFailed: '保存失败',
    },
    exportPanel: {
      title: '导出',
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
      title: 'Parameter controls',
      name: 'Playlist V4',
      description: 'YouTube-style playlist layout with realtime spectrum and beat-reactive effects.',
      selected: 'Selected',
      empty: 'Scan a folder to enable parameter controls.',
      visualGroup: 'Visual effects',
      exportGroup: 'Export settings',
      audioGroup: 'Audio export settings',
      advancedGroup: 'Advanced info',
      effectIntensity: 'Effect intensity',
      intensityOptions: {low: 'Low', medium: 'Medium', high: 'High'},
      showParticles: 'Show particles',
      showPulseRings: 'Show pulse rings',
      themeId: 'Theme ID',
      width: 'Width',
      height: 'Height',
      fps: 'FPS',
      videoCodec: 'Video codec',
      outputFileName: 'Output file name',
      audioCodec: 'Audio codec',
      audioBitrate: 'Audio bitrate',
      audioSampleRate: 'Sample rate',
      audioChannels: 'Channels',
      audioVolume: 'Volume',
      audioBitrateOptions: {
        128: '128 kbps',
        192: '192 kbps',
        256: '256 kbps',
        320: '320 kbps',
      },
      audioSampleRateOptions: {
        44100: '44.1 kHz',
        48000: '48 kHz',
      },
      audioChannelOptions: {
        1: 'Mono',
        2: 'Stereo',
      },
      saveHint: 'Settings are saved to the current project. Click Generate video to refresh the preview.',
      saving: 'Saving...',
      saved: 'Saved',
      saveFailed: 'Save failed',
    },
    exportPanel: {
      title: 'Export',
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
    empty: string;
    visualGroup: string;
    exportGroup: string;
    audioGroup: string;
    advancedGroup: string;
    effectIntensity: string;
    intensityOptions: {low: string; medium: string; high: string};
    showParticles: string;
    showPulseRings: string;
    themeId: string;
    width: string;
    height: string;
    fps: string;
    videoCodec: string;
    outputFileName: string;
    audioCodec: string;
    audioBitrate: string;
    audioSampleRate: string;
    audioChannels: string;
    audioVolume: string;
    audioBitrateOptions: Record<128 | 192 | 256 | 320, string>;
    audioSampleRateOptions: Record<44100 | 48000, string>;
    audioChannelOptions: Record<1 | 2, string>;
    saveHint: string;
    saving: string;
    saved: string;
    saveFailed: string;
  };
  exportPanel: {
    title: string;
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
