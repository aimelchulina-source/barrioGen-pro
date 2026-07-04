import type { Project } from '../types';
import { DEFAULT_PARAMS } from '../types';

const KEY = 'barrioGen_projects';

function migrateProject(project: Project): Project {
  const defaults = DEFAULT_PARAMS.lagunaConfig;
  const cfg = project.params.lagunaConfig ?? defaults;
  return {
    ...project,
    params: {
      ...project.params,
      lagunaConfig: {
        center: cfg.center ?? defaults.center,
        radiusM: cfg.radiusM ?? defaults.radiusM,
        shape: cfg.shape ?? defaults.shape,
        orientationDeg: cfg.orientationDeg ?? defaults.orientationDeg,
      },
    },
  };
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    const projects: Project[] = raw ? JSON.parse(raw) : [];
    return projects.map(migrateProject);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function saveProject(project: Project): void {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.unshift(project);
  }
  saveProjects(projects);
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  saveProjects(projects);
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
