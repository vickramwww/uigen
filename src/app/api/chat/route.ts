import { streamText, tool } from 'ai';
import { z } from 'ai';
import { getLanguageModel } from '@/lib/provider';
import { GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/generation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { VirtualFileSystem } from '@/lib/file-system';
import { NextRequest } from 'next/server';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, projectId, fileSystemData } = body as {
      messages: Array<{ role: string; content: string }>;
      projectId?: string;
      fileSystemData?: Record<string, unknown>;
    };

    const session = await getSession();

    // Get or create project
    let project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : null;

    if (!project) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const name = firstUserMsg
        ? String(firstUserMsg.content).slice(0, 50) || 'Untitled Project'
        : 'Untitled Project';

      project = await prisma.project.create({
        data: {
          name,
          userId: session?.userId ?? null,
          messages: '[]',
          data: '{}',
        },
      });
    }

    // Deserialize the file system from request
    const fs = new VirtualFileSystem();
    if (fileSystemData && Object.keys(fileSystemData).length > 0) {
      fs.deserialize(fileSystemData as Parameters<typeof fs.deserialize>[0]);
    }

    const model = getLanguageModel();

    const result = streamText({
      model,
      system: GENERATION_SYSTEM_PROMPT,
      messages,
      maxSteps: process.env.ANTHROPIC_API_KEY ? 40 : 4,
      maxTokens: 10000,
      tools: {
        str_replace_editor: tool({
          description: `View and edit files in the virtual file system.
Commands:
- view: View file contents or list files (path is optional for listing)
- create: Create a new file with file_text content
- str_replace: Replace old_str with new_str in a file
- insert: Insert new_str at insert_line (1-based line number) in a file`,
          parameters: z.object({
            command: z.enum(['view', 'create', 'str_replace', 'insert']),
            path: z.string().optional().describe('File path'),
            file_text: z.string().optional().describe('File content (for create)'),
            old_str: z.string().optional().describe('Text to replace (for str_replace)'),
            new_str: z.string().optional().describe('New text (for str_replace/insert)'),
            insert_line: z.number().optional().describe('Line number to insert at (for insert, 1-based)'),
          }),
          execute: async (params) => {
            // Tool execution happens client-side via onToolCall
            // Server just validates and passes through
            return JSON.stringify({ ok: true, command: params.command, path: params.path });
          },
        }),
        file_manager: tool({
          description: `Manage files in the virtual file system.
Operations:
- rename: Rename/move a file from old_path to new_path
- delete: Delete a file at path`,
          parameters: z.object({
            operation: z.enum(['rename', 'delete']),
            path: z.string().optional().describe('File path (for delete)'),
            old_path: z.string().optional().describe('Current file path (for rename)'),
            new_path: z.string().optional().describe('New file path (for rename)'),
          }),
          execute: async (params) => {
            return JSON.stringify({ ok: true, operation: params.operation });
          },
        }),
      },
      experimental_providerMetadata: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
      onFinish: async () => {
        try {
          await prisma.project.update({
            where: { id: project!.id },
            data: {
              messages: JSON.stringify(messages),
              data: JSON.stringify(fs.serialize()),
              updatedAt: new Date(),
            },
          });
        } catch (err) {
          console.error('Failed to save project:', err);
        }
      },
    });

    const response = result.toDataStreamResponse({
      sendUsage: false,
    });

    const headers = new Headers(response.headers);
    headers.set('x-project-id', project.id);

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
