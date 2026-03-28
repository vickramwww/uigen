import * as Babel from '@babel/standalone';
import type { VirtualFileSystemData } from './file-system';

// CDN base for third-party packages
const ESM_SH_BASE = 'https://esm.sh';

// Packages that should be loaded from CDN
const CDN_PACKAGES: Record<string, string> = {
  react: `${ESM_SH_BASE}/react@19`,
  'react-dom': `${ESM_SH_BASE}/react-dom@19`,
  'react-dom/client': `${ESM_SH_BASE}/react-dom@19/client`,
  'react/jsx-runtime': `${ESM_SH_BASE}/react@19/jsx-runtime`,
  'lucide-react': `${ESM_SH_BASE}/lucide-react`,
  'framer-motion': `${ESM_SH_BASE}/framer-motion`,
  'date-fns': `${ESM_SH_BASE}/date-fns`,
  recharts: `${ESM_SH_BASE}/recharts`,
  'react-icons': `${ESM_SH_BASE}/react-icons`,
};

function transformCode(code: string, filename: string): string {
  try {
    const result = Babel.transform(code, {
      filename,
      presets: [
        ['react', { runtime: 'automatic' }],
        ['typescript', { allExtensions: true, isTSX: filename.endsWith('tsx') }],
      ],
      plugins: [],
      sourceType: 'module',
    });
    return result.code ?? '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transform error in ${filename}: ${message}`);
  }
}

function resolveImportPath(
  importPath: string,
  currentFile: string,
  files: VirtualFileSystemData
): string | null {
  // Handle @/ alias — maps to root of virtual file system
  if (importPath.startsWith('@/')) {
    const resolved = '/' + importPath.slice(2);
    return findFileWithExtensions(resolved, files);
  }

  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const resolved = resolveRelativePath(currentDir, importPath);
    return findFileWithExtensions(resolved, files);
  }

  return null; // Not a local import
}

function resolveRelativePath(baseDir: string, relativePath: string): string {
  const parts = (baseDir + '/' + relativePath).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

function findFileWithExtensions(
  path: string,
  files: VirtualFileSystemData
): string | null {
  if (files[path]) return path;
  const extensions = ['.jsx', '.tsx', '.js', '.ts', '.css'];
  for (const ext of extensions) {
    if (files[path + ext]) return path + ext;
  }
  // Try index file
  for (const ext of extensions) {
    const indexPath = path + '/index' + ext;
    if (files[indexPath]) return indexPath;
  }
  return null;
}

interface TransformResult {
  blobUrls: Map<string, string>;
  importMap: Record<string, string>;
  cssContent: string;
  entryBlobUrl: string;
}

export function transformVirtualFileSystem(
  files: VirtualFileSystemData
): TransformResult {
  const blobUrls = new Map<string, string>();
  const cssFiles: string[] = [];
  const errors: string[] = [];

  // First pass: collect CSS
  for (const [path, file] of Object.entries(files)) {
    if (path.endsWith('.css')) {
      cssFiles.push(file.content);
    }
  }

  // Second pass: transform JS/JSX/TS/TSX files
  // We need to process them in dependency order, but for simplicity
  // we'll process all and create blob URLs
  const transformedCode = new Map<string, string>();

  for (const [path, file] of Object.entries(files)) {
    if (
      !path.endsWith('.js') &&
      !path.endsWith('.jsx') &&
      !path.endsWith('.ts') &&
      !path.endsWith('.tsx')
    ) {
      continue;
    }

    try {
      let code = file.content;

      // Transform JSX/TSX to JS
      const transformed = transformCode(code, path.slice(1)); // Remove leading /

      // Now rewrite imports
      code = rewriteImports(transformed, path, files);
      transformedCode.set(path, code);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      // Still store something so other files can import it
      transformedCode.set(
        path,
        `throw new Error(${JSON.stringify(message)});`
      );
    }
  }

  // Create blob URLs for all transformed files
  for (const [path, code] of transformedCode) {
    const blob = new Blob([code], { type: 'application/javascript' });
    blobUrls.set(path, URL.createObjectURL(blob));
  }

  // Now do a second pass to rewrite blob URL imports
  // We need to replace import paths with the actual blob URLs
  for (const [path, code] of transformedCode) {
    const rewritten = rewriteImportsWithBlobUrls(code, path, files, blobUrls);
    // Revoke old URL and create new one
    URL.revokeObjectURL(blobUrls.get(path)!);
    const blob = new Blob([rewritten], { type: 'application/javascript' });
    blobUrls.set(path, URL.createObjectURL(blob));
  }

  const importMap: Record<string, string> = { ...CDN_PACKAGES };
  const cssContent = cssFiles.join('\n');

  const entryBlobUrl = blobUrls.get('/App.jsx') ??
    blobUrls.get('/App.tsx') ??
    blobUrls.get('/App.js') ??
    Array.from(blobUrls.values())[0] ??
    '';

  return { blobUrls, importMap, cssContent, entryBlobUrl };
}

function rewriteImports(
  code: string,
  currentFile: string,
  files: VirtualFileSystemData
): string {
  // Replace import statements with placeholder markers we'll resolve later
  // This is a simplified version — we parse imports with regex
  return code.replace(
    /^(import\s+(?:.*?\s+from\s+)?['"])([^'"]+)(['"])/gm,
    (match, prefix, importPath, suffix) => {
      if (importPath.startsWith('__BLOB__')) return match;
      const localPath = resolveImportPath(importPath, currentFile, files);
      if (localPath) {
        return `${prefix}__LOCAL__:${localPath}${suffix}`;
      }
      const cdnUrl = CDN_PACKAGES[importPath];
      if (cdnUrl) {
        return `${prefix}${cdnUrl}${suffix}`;
      }
      // Try esm.sh for unknown packages
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return `${prefix}${ESM_SH_BASE}/${importPath}${suffix}`;
      }
      return match;
    }
  );
}

function rewriteImportsWithBlobUrls(
  code: string,
  _currentFile: string,
  _files: VirtualFileSystemData,
  blobUrls: Map<string, string>
): string {
  return code.replace(
    /^(import\s+(?:.*?\s+from\s+)?['"])__LOCAL__:([^'"]+)(['"])/gm,
    (match, prefix, localPath, suffix) => {
      const blobUrl = blobUrls.get(localPath);
      if (blobUrl) {
        return `${prefix}${blobUrl}${suffix}`;
      }
      return match;
    }
  );
}

export function generateIframeHtml(
  files: VirtualFileSystemData,
  entryPath: string = '/App.jsx'
): string {
  const allFiles = { ...files };
  const importMap: Record<string, string> = { ...CDN_PACKAGES };
  const cssFiles: string[] = [];

  for (const [path, file] of Object.entries(allFiles)) {
    if (path.endsWith('.css')) {
      cssFiles.push(file.content);
    }
  }

  // Transform all JS/JSX/TS/TSX files
  const transformedFiles = new Map<string, string>();

  for (const [path, file] of Object.entries(allFiles)) {
    if (
      !path.endsWith('.js') &&
      !path.endsWith('.jsx') &&
      !path.endsWith('.ts') &&
      !path.endsWith('.tsx')
    )
      continue;

    try {
      const transformed = transformCode(file.content, path.slice(1));
      transformedFiles.set(path, transformed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      transformedFiles.set(path, `throw new Error(${JSON.stringify(msg)});`);
    }
  }

  // Build a self-contained HTML with inline modules
  // We use data: URLs in the import map for local files
  const moduleScripts: string[] = [];
  const localImportMap: Record<string, string> = {};

  for (const [path, code] of transformedFiles) {
    // Encode as data URL
    const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
    localImportMap[path] = dataUrl;
    localImportMap[`@${path.slice(1)}`] = dataUrl; // @/ alias
  }

  // Rewrite import paths in all modules
  const rewrittenModules = new Map<string, string>();
  for (const [path, code] of transformedFiles) {
    const rewritten = rewriteImportsInline(code, path, transformedFiles, localImportMap);
    const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(rewritten)}`;
    localImportMap[path] = dataUrl;
  }

  // Rewrite again with final URLs
  for (const [path, code] of transformedFiles) {
    const rewritten = rewriteImportsInline(code, path, transformedFiles, localImportMap);
    rewrittenModules.set(path, rewritten);
  }

  const fullImportMap = { ...importMap };
  for (const [path, code] of rewrittenModules) {
    const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
    fullImportMap[path] = dataUrl;
    // Support @/ prefix
    if (path.startsWith('/')) {
      fullImportMap[`@/${path.slice(1)}`] = dataUrl;
    }
  }

  const entryCode = rewrittenModules.get(entryPath) ?? '';
  const entryDataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(entryCode)}`;

  const cssContent = cssFiles.join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    ${cssContent}
  </style>
  <script type="importmap">
  ${JSON.stringify({ imports: fullImportMap }, null, 2)}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Error boundary setup
    window.__uigen_error = null;
    window.addEventListener('error', (e) => {
      document.getElementById('root').innerHTML = \`
        <div style="padding: 20px; background: #fee2e2; color: #dc2626; border-radius: 8px; margin: 20px; font-family: monospace;">
          <strong>Runtime Error:</strong><br>
          \${e.message}
        </div>
      \`;
    });
    window.addEventListener('unhandledrejection', (e) => {
      document.getElementById('root').innerHTML = \`
        <div style="padding: 20px; background: #fee2e2; color: #dc2626; border-radius: 8px; margin: 20px; font-family: monospace;">
          <strong>Unhandled Promise Rejection:</strong><br>
          \${e.reason}
        </div>
      \`;
    });

    try {
      const { default: App } = await import('${entryDataUrl}');
      const { createRoot } = await import('${CDN_PACKAGES['react-dom/client']}');
      const root = createRoot(document.getElementById('root'));
      root.render(
        (await import('${CDN_PACKAGES['react/jsx-runtime']}')).jsx(App, {})
      );
    } catch (err) {
      document.getElementById('root').innerHTML = \`
        <div style="padding: 20px; background: #fee2e2; color: #dc2626; border-radius: 8px; margin: 20px; font-family: monospace;">
          <strong>Module Error:</strong><br>
          \${err.message || err}
        </div>
      \`;
    }
  </script>
</body>
</html>`;
}

function rewriteImportsInline(
  code: string,
  currentFile: string,
  _transformedFiles: Map<string, string>,
  importMap: Record<string, string>
): string {
  return code.replace(
    /from\s+['"]([^'"]+)['"]/g,
    (match, importPath) => {
      // Check CDN packages first
      if (CDN_PACKAGES[importPath]) {
        return `from '${CDN_PACKAGES[importPath]}'`;
      }

      // Handle @/ alias
      if (importPath.startsWith('@/')) {
        const resolved = '/' + importPath.slice(2);
        const url = importMap[resolved];
        if (url) return `from '${url}'`;
      }

      // Handle relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
        const resolved = resolveRelativePath(currentDir, importPath);
        const url = importMap[resolved];
        if (url) return `from '${url}'`;

        // Try with extensions
        const extensions = ['.jsx', '.tsx', '.js', '.ts'];
        for (const ext of extensions) {
          const url = importMap[resolved + ext];
          if (url) return `from '${url}'`;
        }
      }

      // Unknown external package — use esm.sh
      if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('data:') && !importPath.startsWith('http')) {
        return `from '${ESM_SH_BASE}/${importPath}'`;
      }

      return match;
    }
  );
}
