'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { VirtualFileSystem, type VirtualFileSystemData } from '@/lib/file-system';

interface ToolCallResult {
  success: boolean;
  output: string;
}

interface FileSystemContextValue {
  fileSystem: VirtualFileSystem;
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  refreshTrigger: number;
  handleToolCall: (
    toolName: string,
    toolInput: Record<string, unknown>
  ) => Promise<ToolCallResult>;
  loadFromData: (data: VirtualFileSystemData) => void;
  getSerializedData: () => VirtualFileSystemData;
}

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const fsRef = useRef(new VirtualFileSystem());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  const loadFromData = useCallback((data: VirtualFileSystemData) => {
    fsRef.current.deserialize(data);
    // Select the best initial file
    const initial = fsRef.current.getInitialFile();
    setSelectedFile(initial);
    refresh();
  }, [refresh]);

  const getSerializedData = useCallback((): VirtualFileSystemData => {
    return fsRef.current.serialize();
  }, []);

  const handleToolCall = useCallback(
    async (
      toolName: string,
      toolInput: Record<string, unknown>
    ): Promise<ToolCallResult> => {
      const fs = fsRef.current;

      try {
        if (toolName === 'str_replace_editor') {
          const command = toolInput.command as string;
          const path = toolInput.path as string | undefined;

          switch (command) {
            case 'view': {
              if (path) {
                const file = fs.getFile(path);
                if (!file) {
                  return { success: false, output: `File not found: ${path}` };
                }
                return {
                  success: true,
                  output: `Contents of ${path}:\n\`\`\`\n${file.content}\n\`\`\``,
                };
              } else {
                const files = fs.listFiles();
                return {
                  success: true,
                  output: files.length > 0
                    ? `Files:\n${files.join('\n')}`
                    : 'No files yet.',
                };
              }
            }

            case 'create': {
              if (!path) {
                return { success: false, output: 'Missing path for create command' };
              }
              const fileText = toolInput.file_text as string ?? '';
              fs.createFile(path, fileText);
              // Auto-select /App.jsx or the first file created
              if (!selectedFile || path === '/App.jsx') {
                setSelectedFile(path);
              }
              refresh();
              return { success: true, output: `Created ${path}` };
            }

            case 'str_replace': {
              if (!path) {
                return { success: false, output: 'Missing path for str_replace command' };
              }
              const oldStr = toolInput.old_str as string;
              const newStr = toolInput.new_str as string ?? '';
              try {
                fs.replaceInFile(path, oldStr, newStr);
                refresh();
                return { success: true, output: `Updated ${path}` };
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return { success: false, output: msg };
              }
            }

            case 'insert': {
              if (!path) {
                return { success: false, output: 'Missing path for insert command' };
              }
              const insertLine = toolInput.insert_line as number ?? 0;
              const newStr = toolInput.new_str as string ?? '';
              try {
                fs.insertInFile(path, insertLine, newStr);
                refresh();
                return { success: true, output: `Inserted into ${path}` };
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return { success: false, output: msg };
              }
            }

            default:
              return { success: false, output: `Unknown command: ${command}` };
          }
        } else if (toolName === 'file_manager') {
          const operation = toolInput.operation as string;

          switch (operation) {
            case 'rename': {
              const oldPath = toolInput.old_path as string;
              const newPath = toolInput.new_path as string;
              fs.rename(oldPath, newPath);
              if (selectedFile === oldPath) {
                setSelectedFile(newPath);
              }
              refresh();
              return { success: true, output: `Renamed ${oldPath} to ${newPath}` };
            }

            case 'delete': {
              const path = toolInput.path as string;
              fs.deleteFile(path);
              if (selectedFile === path) {
                const newSelected = fs.getInitialFile();
                setSelectedFile(newSelected);
              }
              refresh();
              return { success: true, output: `Deleted ${path}` };
            }

            default:
              return { success: false, output: `Unknown operation: ${operation}` };
          }
        }

        return { success: false, output: `Unknown tool: ${toolName}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, output: `Error: ${msg}` };
      }
    },
    [selectedFile, refresh]
  );

  const value: FileSystemContextValue = {
    fileSystem: fsRef.current,
    selectedFile,
    setSelectedFile,
    refreshTrigger,
    handleToolCall,
    loadFromData,
    getSerializedData,
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem(): FileSystemContextValue {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}
