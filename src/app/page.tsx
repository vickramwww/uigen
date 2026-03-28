'use client';

import { useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Eye, Code2, LogIn, UserPlus, LogOut } from 'lucide-react';
import { FileSystemProvider } from '@/lib/contexts/file-system-context';
import { ChatProvider } from '@/lib/contexts/chat-context';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PreviewFrame } from '@/components/preview/PreviewFrame';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { Button } from '@/components/ui/button';

type PanelView = 'preview' | 'code';

interface User {
  id: string;
  email: string;
}

function AppHeader({
  user,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  user: User | null;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center px-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 w-64 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">UI</span>
        </div>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
          UIGen
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auth buttons */}
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-xs text-neutral-500 hidden sm:block">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="h-8 gap-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignIn}
              className="h-8 gap-1.5 text-xs"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={onSignUp}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

// The Preview/Code toggle panel with controlled state
function RightPanel({ activeView, onViewChange }: {
  activeView: PanelView;
  onViewChange: (view: PanelView) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="h-10 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-center shrink-0">
        <TabsPrimitive.Root
          value={activeView}
          onValueChange={(v) => onViewChange(v as PanelView)}
          className="flex"
        >
          <TabsPrimitive.List className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <TabsPrimitive.Trigger
              value="preview"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                text-neutral-500 dark:text-neutral-400
                hover:text-neutral-700 dark:hover:text-neutral-200
                data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700
                data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100
                data-[state=active]:shadow-sm"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="code"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                text-neutral-500 dark:text-neutral-400
                hover:text-neutral-700 dark:hover:text-neutral-200
                data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700
                data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100
                data-[state=active]:shadow-sm"
            >
              <Code2 className="h-3.5 w-3.5" />
              Code
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
        </TabsPrimitive.Root>
      </div>

      {/* Content area — controlled by activeView state */}
      <div className="flex-1 min-h-0 relative">
        {/* Preview panel */}
        <div
          className="absolute inset-0"
          style={{ display: activeView === 'preview' ? 'block' : 'none' }}
        >
          <PreviewFrame className="h-full w-full" />
        </div>

        {/* Code editor panel */}
        <div
          className="absolute inset-0"
          style={{ display: activeView === 'code' ? 'block' : 'none' }}
        >
          <CodeEditor className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  // This state controls the Preview/Code toggle — the BUG fix
  const [activeView, setActiveView] = useState<PanelView>('preview');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleProjectIdChange = useCallback((id: string | null) => {
    setProjectId(id);
  }, []);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setAuthDialogOpen(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setAuthDialogOpen(true);
  };

  return (
    <FileSystemProvider>
      <ChatProvider
        projectId={projectId}
        onProjectIdChange={handleProjectIdChange}
      >
        <div className="flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          {/* Top navigation bar */}
          <AppHeader
            user={user}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            onSignOut={handleSignOut}
          />

          {/* Main content area */}
          <div className="flex-1 min-h-0">
            <PanelGroup direction="horizontal" className="h-full">
              {/* Left: Chat panel */}
              <Panel
                defaultSize={28}
                minSize={20}
                maxSize={50}
                className="bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800"
              >
                <ChatPanel />
              </Panel>

              <PanelResizeHandle className="w-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors cursor-col-resize" />

              {/* Right: Preview/Code panel */}
              <Panel defaultSize={72} minSize={40}>
                <RightPanel
                  activeView={activeView}
                  onViewChange={setActiveView}
                />
              </Panel>
            </PanelGroup>
          </div>
        </div>

        {/* Auth Dialog */}
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          defaultMode={authMode}
          onSuccess={handleAuthSuccess}
        />
      </ChatProvider>
    </FileSystemProvider>
  );
}
