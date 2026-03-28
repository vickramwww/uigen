'use client';

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from 'react';
import { useChat, type Message } from 'ai/react';
import { useFileSystem } from './file-system-context';

interface ChatContextValue {
  messages: Message[];
  input: string;
  isLoading: boolean;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  setInput: (value: string) => void;
  stop: () => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
  projectId: string | null;
  onProjectIdChange: (id: string | null) => void;
}

export function ChatProvider({
  children,
  projectId,
  onProjectIdChange,
}: ChatProviderProps) {
  const { getSerializedData, handleToolCall } = useFileSystem();
  // Keep a ref to the latest serialized data so it's always current on submit
  const getSerializedDataRef = useRef(getSerializedData);
  getSerializedDataRef.current = getSerializedData;

  const chat = useChat({
    api: '/api/chat',
    id: projectId ?? undefined,
    // Send projectId and fileSystemData on every request via body
    body: {
      projectId,
      // NOTE: This is evaluated at hook init time. For always-fresh data,
      // we override via handleSubmit below.
    },
    maxSteps: 40,
    onToolCall: async ({ toolCall }) => {
      const result = await handleToolCall(
        toolCall.toolName,
        toolCall.args as Record<string, unknown>
      );
      return result.output;
    },
    onResponse: (response) => {
      const newProjectId = response.headers.get('x-project-id');
      if (newProjectId && newProjectId !== projectId) {
        onProjectIdChange(newProjectId);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Wrap handleSubmit to inject fresh fileSystemData
  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    chat.handleSubmit(e, {
      body: {
        projectId,
        fileSystemData: getSerializedDataRef.current(),
      },
    });
  };

  const value: ChatContextValue = {
    messages: chat.messages,
    input: chat.input,
    isLoading: chat.isLoading,
    handleInputChange: chat.handleInputChange,
    handleSubmit,
    setInput: chat.setInput,
    stop: chat.stop,
    projectId,
    setProjectId: onProjectIdChange,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat2(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat2 must be used within a ChatProvider');
  }
  return context;
}
