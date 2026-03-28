'use client';

import { useEffect, useRef, useState } from 'react';
import { useFileSystem } from '@/lib/contexts/file-system-context';
import { generateIframeHtml } from '@/lib/jsx-transformer';

interface PreviewFrameProps {
  className?: string;
}

export function PreviewFrame({ className }: PreviewFrameProps) {
  const { fileSystem, refreshTrigger } = useFileSystem();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const files = fileSystem.serialize();
    const hasFiles = Object.keys(files).some(
      (k) => k.endsWith('.jsx') || k.endsWith('.tsx') || k.endsWith('.js') || k.endsWith('.ts')
    );

    setIsEmpty(!hasFiles);

    if (!hasFiles || !iframeRef.current) return;

    try {
      setError(null);
      const html = generateIframeHtml(files);
      const iframe = iframeRef.current;

      // Use srcdoc to inject the full HTML
      iframe.srcdoc = html;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [fileSystem, refreshTrigger]);

  if (isEmpty) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full bg-neutral-50 dark:bg-neutral-900 text-neutral-400 ${className ?? ''}`}
      >
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="text-6xl">✨</div>
          <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-300">
            Your preview will appear here
          </h3>
          <p className="text-sm">
            Describe a component in the chat and watch it come to life
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full bg-red-50 dark:bg-red-950/20 ${className ?? ''}`}
      >
        <div className="max-w-lg w-full mx-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            Compilation Error
          </h3>
          <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono overflow-auto max-h-48">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className={`w-full h-full border-0 ${className ?? ''}`}
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
      title="Component Preview"
    />
  );
}
