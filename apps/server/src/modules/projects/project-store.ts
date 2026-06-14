import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProjectSchema, type ExportConfig, type Project, type ThemeConfig, type Track} from '@playlist2video/shared';

export interface SaveProjectInput {
  name: string;
  sourceFolder: string;
  tracks: Track[];
  theme: ThemeConfig;
  exportConfig: ExportConfig;
}

export class ProjectStore {
  private readonly projectPath: string;
  constructor(private readonly rootDir: string) {
    this.projectPath = path.join(rootDir, 'project.json');
  }

  async save(input: SaveProjectInput): Promise<Project> {
    await fs.mkdir(this.rootDir, {recursive: true});
    const now = new Date().toISOString();
    const existing = await this.load().catch(() => null);
    const project: Project = {
      id: existing?.id ?? `project-${crypto.randomUUID()}`,
      name: input.name,
      sourceFolder: input.sourceFolder,
      tracks: input.tracks,
      theme: input.theme,
      exportConfig: input.exportConfig,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await fs.writeFile(this.projectPath, JSON.stringify(project, null, 2), 'utf8');
    return project;
  }

  async load(): Promise<Project> {
    return ProjectSchema.parse(JSON.parse(await fs.readFile(this.projectPath, 'utf8')));
  }
}
