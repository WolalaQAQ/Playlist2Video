import React, {useState} from 'react';
import type {ExportConfig, Project, ThemeConfig} from '@playlist2video/shared';
import type {Translation} from '../i18n';

type SettingsPatch = {theme?: Partial<ThemeConfig>; exportConfig?: Partial<ExportConfig>};

const audioBitrateOptions = [128, 192, 256, 320] as const;
const audioSampleRateOptions = [44100, 48000] as const;
const audioChannelOptions = [1, 2] as const;
const renderQualityOptions: ExportConfig['renderQuality'][] = ['high', 'balanced', 'fast', 'minimal'];
const defaultExportConfig: ExportConfig = {
  width: 1920,
  height: 1080,
  fps: 30,
  videoCodec: 'h264',
  videoBitrateKbps: 12000,
  spectrumFps: 30,
  renderQuality: 'high',
  outputFileName: 'playlist-video.mp4',
  audioCodec: 'aac',
  audioBitrateKbps: 320,
  audioSampleRate: 48000,
  audioChannels: 2,
  audioVolumePercent: 100,
};

export const ThemePanel: React.FC<{
  copy: Translation['theme'];
  project: Project | null;
  onUpdateSettings: (settings: SettingsPatch) => Promise<Project>;
}> = ({copy, project, onUpdateSettings}) => {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const theme = project?.theme ?? {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'};
  const exportConfig = project?.exportConfig ?? defaultExportConfig;
  const disabled = !project || saving;

  async function save(settings: SettingsPatch) {
    if (!project) return;
    setSaving(true);
    setStatus(null);
    try {
      await onUpdateSettings(settings);
      setStatus(copy.saved);
    } catch {
      setStatus(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function savePositiveNumber(kind: 'width' | 'height' | 'fps' | 'spectrumFps' | 'videoBitrateKbps', value: string) {
    const nextValue = Number(value);
    if (!Number.isInteger(nextValue) || nextValue <= 0 || nextValue === exportConfig[kind]) return;
    await save({exportConfig: {[kind]: nextValue}});
  }

  async function saveVolume(value: string) {
    const nextValue = Number(value);
    if (!Number.isInteger(nextValue) || nextValue < 1 || nextValue > 200 || nextValue === exportConfig.audioVolumePercent) return;
    await save({exportConfig: {audioVolumePercent: nextValue}});
  }

  async function saveOutputFileName(value: string) {
    const nextValue = value.trim();
    if (!nextValue || nextValue === exportConfig.outputFileName) return;
    await save({exportConfig: {outputFileName: nextValue}});
  }

  return (
    <section className="card parameter-panel">
      <div className="section-heading parameter-heading">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.saveHint}</p>
        </div>
        <span className={status === copy.saveFailed ? 'status-badge error' : 'status-badge'}>{saving ? copy.saving : status ?? copy.selected}</span>
      </div>

      <div className="theme-option selected">
        <strong>{copy.name}</strong>
        <p>{copy.description}</p>
      </div>

      {!project ? <p className="panel-muted">{copy.empty}</p> : null}

      <fieldset className="control-group">
        <legend>{copy.visualGroup}</legend>
        <label className="control-row">
          <span>{copy.effectIntensity}</span>
          <select
            aria-label={copy.effectIntensity}
            disabled={disabled}
            value={theme.effectIntensity}
            onChange={(event) => void save({theme: {effectIntensity: event.currentTarget.value as ThemeConfig['effectIntensity']}})}
          >
            <option value="minimal">{copy.intensityOptions.minimal}</option>
            <option value="low">{copy.intensityOptions.low}</option>
            <option value="medium">{copy.intensityOptions.medium}</option>
            <option value="high">{copy.intensityOptions.high}</option>
          </select>
        </label>
        <label className="toggle-row">
          <input
            aria-label={copy.showParticles}
            checked={theme.showParticles}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => void save({theme: {showParticles: event.currentTarget.checked}})}
          />
          <span>{copy.showParticles}</span>
        </label>
        <label className="toggle-row">
          <input
            aria-label={copy.showPulseRings}
            checked={theme.showPulseRings}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => void save({theme: {showPulseRings: event.currentTarget.checked}})}
          />
          <span>{copy.showPulseRings}</span>
        </label>
      </fieldset>

      <fieldset className="control-group">
        <legend>{copy.audioGroup}</legend>
        <div className="parameter-grid">
          <label className="control-row">
            <span>{copy.audioCodec}</span>
            <input aria-label={copy.audioCodec} disabled readOnly value={exportConfig.audioCodec} />
          </label>
          <label className="control-row">
            <span>{copy.audioBitrate}</span>
            <select
              aria-label={copy.audioBitrate}
              disabled={disabled}
              value={exportConfig.audioBitrateKbps}
              onChange={(event) => void save({exportConfig: {audioBitrateKbps: Number(event.currentTarget.value)}})}
            >
              {audioBitrateOptions.map((bitrate) => <option key={bitrate} value={bitrate}>{copy.audioBitrateOptions[bitrate]}</option>)}
            </select>
          </label>
          <label className="control-row">
            <span>{copy.audioSampleRate}</span>
            <select
              aria-label={copy.audioSampleRate}
              disabled={disabled}
              value={exportConfig.audioSampleRate}
              onChange={(event) => void save({exportConfig: {audioSampleRate: Number(event.currentTarget.value) as ExportConfig['audioSampleRate']}})}
            >
              {audioSampleRateOptions.map((sampleRate) => <option key={sampleRate} value={sampleRate}>{copy.audioSampleRateOptions[sampleRate]}</option>)}
            </select>
          </label>
          <label className="control-row">
            <span>{copy.audioChannels}</span>
            <select
              aria-label={copy.audioChannels}
              disabled={disabled}
              value={exportConfig.audioChannels}
              onChange={(event) => void save({exportConfig: {audioChannels: Number(event.currentTarget.value) as ExportConfig['audioChannels']}})}
            >
              {audioChannelOptions.map((channels) => <option key={channels} value={channels}>{copy.audioChannelOptions[channels]}</option>)}
            </select>
          </label>
        </div>
        <label className="control-row wide">
          <span>{copy.audioVolume}</span>
          <input
            aria-label={copy.audioVolume}
            defaultValue={exportConfig.audioVolumePercent}
            disabled={disabled}
            inputMode="numeric"
            min={1}
            max={200}
            type="number"
            onBlur={(event) => void saveVolume(event.currentTarget.value)}
            key={`volume-${exportConfig.audioVolumePercent}`}
          />
        </label>
      </fieldset>

      <fieldset className="control-group">
        <legend>{copy.exportGroup}</legend>
        <div className="parameter-grid">
          <label className="control-row">
            <span>{copy.width}</span>
            <input
              aria-label={copy.width}
              defaultValue={exportConfig.width}
              disabled={disabled}
              inputMode="numeric"
              min={1}
              type="number"
              onBlur={(event) => void savePositiveNumber('width', event.currentTarget.value)}
              key={`width-${exportConfig.width}`}
            />
          </label>
          <label className="control-row">
            <span>{copy.height}</span>
            <input
              aria-label={copy.height}
              defaultValue={exportConfig.height}
              disabled={disabled}
              inputMode="numeric"
              min={1}
              type="number"
              onBlur={(event) => void savePositiveNumber('height', event.currentTarget.value)}
              key={`height-${exportConfig.height}`}
            />
          </label>
          <label className="control-row">
            <span>{copy.fps}</span>
            <input
              aria-label={copy.fps}
              defaultValue={exportConfig.fps}
              disabled={disabled}
              inputMode="numeric"
              min={1}
              type="number"
              onBlur={(event) => void savePositiveNumber('fps', event.currentTarget.value)}
              key={`fps-${exportConfig.fps}`}
            />
          </label>
          <label className="control-row">
            <span>{copy.spectrumFps}</span>
            <input
              aria-label={copy.spectrumFps}
              defaultValue={exportConfig.spectrumFps}
              disabled={disabled}
              inputMode="numeric"
              min={1}
              type="number"
              onBlur={(event) => void savePositiveNumber('spectrumFps', event.currentTarget.value)}
              key={`spectrum-fps-${exportConfig.spectrumFps}`}
            />
          </label>
          <label className="control-row">
            <span>{copy.renderQuality}</span>
            <select
              aria-label={copy.renderQuality}
              disabled={disabled}
              value={exportConfig.renderQuality}
              onChange={(event) => void save({exportConfig: {renderQuality: event.currentTarget.value as ExportConfig['renderQuality']}})}
            >
              {renderQualityOptions.map((quality) => <option key={quality} value={quality}>{copy.renderQualityOptions[quality]}</option>)}
            </select>
          </label>
          <label className="control-row">
            <span>{copy.videoCodec}</span>
            <input aria-label={copy.videoCodec} disabled readOnly value={exportConfig.videoCodec} />
          </label>
          <label className="control-row">
            <span>{copy.videoBitrate}</span>
            <input
              aria-label={copy.videoBitrate}
              defaultValue={exportConfig.videoBitrateKbps}
              disabled={disabled}
              inputMode="numeric"
              min={1}
              type="number"
              onBlur={(event) => void savePositiveNumber('videoBitrateKbps', event.currentTarget.value)}
              key={`video-bitrate-${exportConfig.videoBitrateKbps}`}
            />
          </label>
        </div>
        <label className="control-row wide">
          <span>{copy.outputFileName}</span>
          <input
            aria-label={copy.outputFileName}
            defaultValue={exportConfig.outputFileName}
            disabled={disabled}
            onBlur={(event) => void saveOutputFileName(event.currentTarget.value)}
            key={`output-${exportConfig.outputFileName}`}
          />
        </label>
      </fieldset>

      <fieldset className="control-group">
        <legend>{copy.advancedGroup}</legend>
        <label className="control-row">
          <span>{copy.themeId}</span>
          <input aria-label={copy.themeId} disabled readOnly value={theme.themeId} />
        </label>
      </fieldset>
    </section>
  );
};

