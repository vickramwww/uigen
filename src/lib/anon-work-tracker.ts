'use client';

const STORAGE_KEY = 'uigen-anon-projects';

export function getAnonProjects(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAnonProject(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const projects = getAnonProjects();
    if (!projects.includes(projectId)) {
      projects.push(projectId);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  } catch {
    // Ignore storage errors
  }
}

export function removeAnonProject(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const projects = getAnonProjects().filter((id) => id !== projectId);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Ignore storage errors
  }
}

export function clearAnonProjects(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
