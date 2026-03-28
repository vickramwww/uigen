import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from '../file-system';

describe('VirtualFileSystem', () => {
  let fs: VirtualFileSystem;

  beforeEach(() => {
    fs = new VirtualFileSystem();
  });

  it('creates files', () => {
    fs.createFile('/App.jsx', 'export default function App() {}');
    expect(fs.getFile('/App.jsx')).toBeDefined();
    expect(fs.getFile('/App.jsx')?.content).toBe('export default function App() {}');
  });

  it('normalizes paths without leading slash', () => {
    fs.createFile('App.jsx', 'content');
    expect(fs.getFile('/App.jsx')).toBeDefined();
  });

  it('updates files', () => {
    fs.createFile('/App.jsx', 'original');
    fs.updateFile('/App.jsx', 'updated');
    expect(fs.getFile('/App.jsx')?.content).toBe('updated');
  });

  it('deletes files', () => {
    fs.createFile('/App.jsx', 'content');
    fs.deleteFile('/App.jsx');
    expect(fs.getFile('/App.jsx')).toBeUndefined();
  });

  it('renames files', () => {
    fs.createFile('/App.jsx', 'content');
    fs.rename('/App.jsx', '/App.tsx');
    expect(fs.getFile('/App.jsx')).toBeUndefined();
    expect(fs.getFile('/App.tsx')).toBeDefined();
  });

  it('replaces content in files', () => {
    fs.createFile('/App.jsx', 'Hello World');
    fs.replaceInFile('/App.jsx', 'World', 'UIGen');
    expect(fs.getFile('/App.jsx')?.content).toBe('Hello UIGen');
  });

  it('throws when replacing non-existent string', () => {
    fs.createFile('/App.jsx', 'Hello World');
    expect(() => fs.replaceInFile('/App.jsx', 'nonexistent', 'value')).toThrow();
  });

  it('inserts lines into files', () => {
    fs.createFile('/App.jsx', 'line1\nline2\nline3');
    fs.insertInFile('/App.jsx', 2, 'inserted');
    const content = fs.getFile('/App.jsx')?.content;
    expect(content).toBe('line1\ninserted\nline2\nline3');
  });

  it('serializes and deserializes', () => {
    fs.createFile('/App.jsx', 'content1');
    fs.createFile('/styles.css', '.foo { color: red; }');
    const data = fs.serialize();

    const fs2 = VirtualFileSystem.fromSerialized(data);
    expect(fs2.getFile('/App.jsx')?.content).toBe('content1');
    expect(fs2.getFile('/styles.css')?.content).toBe('.foo { color: red; }');
  });

  it('returns initial file preferring /App.jsx', () => {
    fs.createFile('/other.jsx', 'other');
    fs.createFile('/App.jsx', 'app');
    expect(fs.getInitialFile()).toBe('/App.jsx');
  });

  it('lists all files sorted', () => {
    fs.createFile('/b.jsx', '');
    fs.createFile('/a.jsx', '');
    fs.createFile('/c.jsx', '');
    expect(fs.listFiles()).toEqual(['/a.jsx', '/b.jsx', '/c.jsx']);
  });

  it('infers language from extension', () => {
    fs.createFile('/App.tsx', 'content');
    expect(fs.getFile('/App.tsx')?.language).toBe('typescript');

    fs.createFile('/styles.css', 'content');
    expect(fs.getFile('/styles.css')?.language).toBe('css');
  });
});
