'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useFileSystem } from '@/lib/contexts/file-system-context';

// Monaco editor must be dynamically imported (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-neutral-900 text-neutral-400">
      <span className="text-sm">Loading editor...</span>
    </div>
  ),
});

interface CodeEditorProps {
  className?: string;
}

export function CodeEditor({ className }: CodeEditorProps) {
  const { fileSystem, selectedFile, setSelectedFile, refreshTrigger } =
    useFileSystem();
  const [files, setFiles] = useState<string[]>([]);
  const [content, setContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');

  useEffect(() => {
    const allFiles = fileSystem.listFiles();
    setFiles(allFiles);

    if (selectedFile) {
      const file = fileSystem.getFile(selectedFile);
      if (file) {
        setContent(file.content);
        setLanguage(file.language);
      }
    } else if (allFiles.length > 0) {
      const initial = fileSystem.getInitialFile();
      if (initial) {
        setSelectedFile(initial);
        const file = fileSystem.getFile(initial);
        if (file) {
          setContent(file.content);
          setLanguage(file.language);
        }
      }
    } else {
      setContent('');
    }
  }, [fileSystem, selectedFile, refreshTrigger, setSelectedFile]);

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    const file = fileSystem.getFile(path);
    if (file) {
      setContent(file.content);
      setLanguage(file.language);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && selectedFile) {
      fileSystem.updateFile(selectedFile, value);
      setContent(value);
    }
  };

  if (files.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full bg-neutral-900 text-neutral-500 ${className ?? ''}`}
      >
        <p className="text-sm">No files yet. Start chatting to generate code.</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className ?? ''}`}>
      {/* File tree sidebar */}
      <div className="w-44 bg-neutral-900 border-r border-neutral-700 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-700">
          Files
        </div>
        <div className="flex-1">
          {files.map((filePath) => {
            const fileName = filePath.split('/').pop() ?? filePath;
            const isSelected = filePath === selectedFile;
            return (
              <button
                key={filePath}
                onClick={() => handleFileSelect(filePath)}
                title={filePath}
                className={`w-full text-left px-3 py-1.5 text-xs truncate transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {fileName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-w-0">
        {selectedFile ? (
          <MonacoEditor
            height="100%"
            language={language}
            value={content}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 20,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              renderLineHighlight: 'line',
              padding: { top: 8, bottom: 8 },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-neutral-900 text-neutral-500">
            <p className="text-sm">Select a file to view its code</p>
          </div>
        )}
      </div>
    </div>
  );
}
