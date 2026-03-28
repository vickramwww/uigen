'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Square, Loader2 } from 'lucide-react';
import { useChat2 } from '@/lib/contexts/chat-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from 'ai/react';

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.role === 'tool') return null;

  // Extract text content from message
  let textContent = '';
  if (typeof message.content === 'string') {
    textContent = message.content;
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (typeof part === 'object' && part !== null && 'type' in part) {
        const typedPart = part as { type: string; text?: string };
        if (typedPart.type === 'text' && typedPart.text) {
          textContent += typedPart.text;
        }
      }
    }
  }

  if (!textContent.trim()) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-0.5">
          AI
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{textContent}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2">
            <ReactMarkdown>{textContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallIndicator() {
  return (
    <div className="flex items-center gap-2 mb-4 text-neutral-400 dark:text-neutral-500 text-xs px-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Generating code...</span>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  'Build a beautiful dashboard with charts',
  'Create a pricing page with 3 tiers',
  'Make an interactive todo app',
  'Design a landing page for a SaaS product',
  'Build a product card with add-to-cart',
];

export function ChatPanel() {
  const { messages, input, isLoading, handleInputChange, handleSubmit, setInput, stop } =
    useChat2();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Chat
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Describe what you want to build
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {!hasMessages ? (
          <div className="space-y-3">
            <div className="text-center py-6">
              <div className="text-3xl mb-2">✨</div>
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                What would you like to build?
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Describe a React component and watch it come to life
              </p>
            </div>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleExampleClick(prompt)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <ToolCallIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe a component..."
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 pr-12 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
          <div className="absolute right-2 bottom-2">
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={stop}
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="h-8 w-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </form>
        <p className="text-xs text-neutral-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
