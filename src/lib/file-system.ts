export interface VirtualFile {
  content: string;
  language: string;
}

export type VirtualFileSystemData = Record<string, VirtualFile>;

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export class VirtualFileSystem {
  private files: Map<string, VirtualFile>;

  constructor() {
    this.files = new Map();
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    return path.startsWith('/') ? path : `/${path}`;
  }

  createFile(path: string, content: string, language?: string): void {
    const normalizedPath = this.normalizePath(path);
    this.files.set(normalizedPath, {
      content,
      language: language ?? inferLanguage(normalizedPath),
    });
  }

  updateFile(path: string, content: string): void {
    const normalizedPath = this.normalizePath(path);
    const existing = this.files.get(normalizedPath);
    if (existing) {
      this.files.set(normalizedPath, { ...existing, content });
    } else {
      this.createFile(normalizedPath, content);
    }
  }

  deleteFile(path: string): void {
    const normalizedPath = this.normalizePath(path);
    this.files.delete(normalizedPath);
  }

  rename(oldPath: string, newPath: string): void {
    const normalizedOld = this.normalizePath(oldPath);
    const normalizedNew = this.normalizePath(newPath);
    const file = this.files.get(normalizedOld);
    if (file) {
      this.files.delete(normalizedOld);
      this.files.set(normalizedNew, {
        ...file,
        language: inferLanguage(normalizedNew),
      });
    }
  }

  getFile(path: string): VirtualFile | undefined {
    const normalizedPath = this.normalizePath(path);
    return this.files.get(normalizedPath);
  }

  getFiles(): Map<string, VirtualFile> {
    return new Map(this.files);
  }

  listFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  replaceInFile(path: string, oldString: string, newString: string): void {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);
    if (!file) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
    if (!file.content.includes(oldString)) {
      throw new Error(
        `String not found in file: ${normalizedPath}\nLooking for:\n${oldString}`
      );
    }
    const newContent = file.content.replace(oldString, newString);
    this.files.set(normalizedPath, { ...file, content: newContent });
  }

  insertInFile(path: string, insertLine: number, newString: string): void {
    const normalizedPath = this.normalizePath(path);
    const file = this.files.get(normalizedPath);
    if (!file) {
      throw new Error(`File not found: ${normalizedPath}`);
    }
    const lines = file.content.split('\n');
    // insertLine is 1-based
    const insertAt = Math.max(0, Math.min(insertLine - 1, lines.length));
    lines.splice(insertAt, 0, newString);
    this.files.set(normalizedPath, { ...file, content: lines.join('\n') });
  }

  serialize(): VirtualFileSystemData {
    const data: VirtualFileSystemData = {};
    for (const [path, file] of this.files) {
      data[path] = file;
    }
    return data;
  }

  deserialize(data: VirtualFileSystemData): void {
    this.files.clear();
    for (const [path, file] of Object.entries(data)) {
      this.files.set(path, file);
    }
  }

  static fromSerialized(data: VirtualFileSystemData): VirtualFileSystem {
    const vfs = new VirtualFileSystem();
    vfs.deserialize(data);
    return vfs;
  }

  isEmpty(): boolean {
    return this.files.size === 0;
  }

  // Select the best initial file to show
  getInitialFile(): string | null {
    if (this.files.has('/App.jsx')) return '/App.jsx';
    if (this.files.has('/App.tsx')) return '/App.tsx';
    if (this.files.has('/App.js')) return '/App.js';
    // Fall back to any root-level file
    for (const path of this.files.keys()) {
      if (path.split('/').length === 2) {
        return path;
      }
    }
    // Fall back to any file
    const first = this.files.keys().next().value;
    return first ?? null;
  }
}
