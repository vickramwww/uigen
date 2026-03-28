"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationProps {
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: any;
    state: string;
    result?: any;
  };
}

function getBasename(path: string): string {
  if (!path) return 'file';
  return path.split('/').pop() || path;
}

function generateToolMessage(toolInvocation: ToolInvocationProps['toolInvocation']): {
  message: string;
  isLoading: boolean;
} {
  const { toolName, args, state } = toolInvocation;
  const isLoading = state !== 'result';
  
  // Extract file information
  const fileName = args?.path ? getBasename(args.path) : 'file';
  const command = args?.command;

  // Handle str_replace_editor tool
  if (toolName === 'str_replace_editor') {
    switch (command) {
      case 'create':
        return {
          message: isLoading ? `Creating ${fileName}...` : `Created ${fileName}`,
          isLoading
        };
      case 'str_replace':
        return {
          message: isLoading ? `Editing ${fileName}...` : `Edited ${fileName}`,
          isLoading
        };
      case 'view':
        return {
          message: isLoading ? `Viewing ${fileName}...` : `Viewed ${fileName}`,
          isLoading
        };
      case 'insert':
        return {
          message: isLoading ? `Updating ${fileName}...` : `Updated ${fileName}`,
          isLoading
        };
      case 'undo_edit':
        return {
          message: isLoading ? `Reverting ${fileName}...` : `Reverted ${fileName}`,
          isLoading
        };
      default:
        return {
          message: isLoading ? `Processing ${fileName}...` : `Processed ${fileName}`,
          isLoading
        };
    }
  }

  // Handle file_manager tool
  if (toolName === 'file_manager') {
    switch (command) {
      case 'rename':
        const newFileName = args?.new_path ? getBasename(args.new_path) : 'new file';
        return {
          message: isLoading 
            ? `Renaming ${fileName} → ${newFileName}...` 
            : `Renamed ${fileName} → ${newFileName}`,
          isLoading
        };
      case 'delete':
        return {
          message: isLoading ? `Deleting ${fileName}...` : `Deleted ${fileName}`,
          isLoading
        };
      default:
        return {
          message: isLoading ? `Managing ${fileName}...` : `Managed ${fileName}`,
          isLoading
        };
    }
  }

  // Fallback for unknown tools
  return {
    message: isLoading ? `Running ${toolName}...` : `Completed ${toolName}`,
    isLoading
  };
}

export function ToolInvocation({ toolInvocation }: ToolInvocationProps) {
  const { message, isLoading } = generateToolMessage(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      ) : (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}