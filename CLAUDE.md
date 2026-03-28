# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview capabilities. It's a Next.js 15 application that allows users to describe React components through chat and see them generated and rendered in real-time using a virtual file system.

## Development Commands

### Setup and Installation
```bash
npm run setup  # Installs dependencies, generates Prisma client, runs migrations
```

### Development
```bash
npm run dev             # Start development server with Turbopack
npm run dev:daemon      # Start dev server in background, logs to logs.txt
```

### Testing and Quality
```bash
npm test                        # Run all Vitest tests
npm test -- path/to/test.ts     # Run a single test file
npm run lint                    # ESLint checking
npm run build                   # Production build
```

### Database Management
```bash
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run database migrations
npm run db:reset       # Reset database (force)
```

## Architecture Overview

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by feature (auth, chat, editor, preview, ui)
- `src/lib/` - Core utilities, contexts, file system, database, and AI tools
- `src/actions/` - Server actions for project management
- `prisma/` - Database schema and migrations (SQLite)

### Virtual File System (`src/lib/file-system.ts`)
The core abstraction — an in-memory `VirtualFileSystem` backed by a `Map`. All AI-generated files live here, never on disk. Key methods: `createFile`, `updateFile`, `deleteFile`, `rename`, `replaceInFile`, `insertInFile`, `serialize`/`deserialize`. The serialized JSON is stored in `Project.data` in SQLite.

Initial file selection on project load prioritizes `/App.jsx`, then falls back to root-level files.

### AI Integration & Tool System
- Model: Claude Sonnet 4.0 via `@ai-sdk/anthropic` + Vercel AI SDK `streamText`
- When `ANTHROPIC_API_KEY` is unset, a `MockLanguageModel` in `src/lib/provider.ts` runs instead (simulates a 4-step agent, useful for development without API costs)
- Max steps: 40 (real), 4 (mock); max tokens: 10,000; max function duration: 120s
- Prompt caching via `experimental_providerMetadata` with `cacheControl: { type: 'ephemeral' }` on the system prompt

Claude controls the virtual file system through two structured tools (handled in `FileSystemContext`):
- `str_replace_editor` — view, create, str_replace, insert operations
- `file_manager` — rename and delete

The agentic loop: user sends prompt → `/api/chat` deserializes current files → Claude streams text + tool calls → `FileSystemContext.handleToolCall()` updates the virtual FS → `refreshTrigger` counter causes preview/editor to re-render.

### State Management (Context Architecture)
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): owns the `VirtualFileSystem` instance, handles all tool invocations from Claude, tracks selected file, increments `refreshTrigger` on changes
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): wraps `useChat` from Vercel AI SDK, serializes the current file system and sends it with every request to `/api/chat`

The API is stateless — the entire file system is sent as a serialized payload on every request and re-deserialized server-side.

### Preview System (`src/components/preview/PreviewFrame.tsx`)
Components render inside a sandboxed iframe (`allow-scripts allow-same-origin allow-forms`). The flow:
1. `jsx-transformer.ts` uses Babel Standalone to transform each JSX/TSX file to browser-compatible JS
2. Import statements are resolved: local files become Blob URLs, third-party packages map to `esm.sh` CDN URLs
3. An `<script type="importmap">` is injected into the iframe's `srcdoc`
4. CSS imports are collected and injected as a `<style>` tag
5. An error boundary wraps the app to display compilation errors in-preview

### Database Schema
```
User      id, email, password, createdAt, updatedAt
Project   id, name, userId (nullable), messages (JSON), data (JSON), createdAt, updatedAt
```
Projects with `userId = null` are anonymous sessions. `messages` stores the full conversation history; `data` stores the serialized virtual file system. Both are updated on every `onFinish` callback from `streamText`.

### Authentication
JWT-based sessions via `jose` library. Sessions expire in 7 days and are stored in HTTPOnly cookies. `src/lib/auth.ts` handles creation, verification, and deletion. Anonymous users' work is tracked in sessionStorage via `anon-work-tracker.ts`.

### System Prompt (`src/lib/prompts/generation.tsx`)
Instructs Claude to always create `/App.jsx` as the entry point, use Tailwind CSS classes (not inline styles), use `@/` alias for internal imports, and generate visually distinctive components (gradients, asymmetric layouts, glassmorphism).

## Development Notes
- Vitest config is in `vitest.config.mts`
- Tailwind CSS v4 with custom configuration
- TypeScript throughout with strict configuration
- Add comments sparingly — only for complex, non-obvious logic
