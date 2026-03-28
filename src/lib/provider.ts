import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';

export function getLanguageModel(): LanguageModel {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getMockModel();
  }
  return anthropic('claude-sonnet-4-5');
}

const MOCK_APP_CODE = `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 text-center shadow-2xl border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-2">Hello from UIGen!</h1>
        <p className="text-white/70 mb-8">Mock mode — set ANTHROPIC_API_KEY to use Claude.</p>
        <div className="flex items-center gap-6 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-12 h-12 rounded-full bg-white/20 text-white text-xl hover:bg-white/30 transition-colors font-bold"
          >
            \u2212
          </button>
          <span className="text-5xl font-bold text-white w-16 text-center">{count}</span>
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-12 h-12 rounded-full bg-white/20 text-white text-xl hover:bg-white/30 transition-colors font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}`;

function getMockModel(): LanguageModel {
  // Return a shape that matches the LanguageModel interface
  // This is used in development when ANTHROPIC_API_KEY is not set
  return {
    specificationVersion: 'v1' as const,
    provider: 'mock',
    modelId: 'mock-model',
    defaultObjectGenerationMode: 'json' as const,
    supportsImageUrls: false as const,

    doGenerate: async () => {
      throw new Error('MockLanguageModel does not support doGenerate');
    },

    doStream: async () => {
      const steps = [
        {
          type: 'tool-call' as const,
          toolCallId: 'mock-tool-1',
          toolName: 'str_replace_editor',
          args: JSON.stringify({
            command: 'create',
            path: '/App.jsx',
            file_text: MOCK_APP_CODE,
          }),
        },
        {
          type: 'tool-result' as const,
          toolCallId: 'mock-tool-1',
          toolName: 'str_replace_editor',
          result: 'File created successfully',
        },
        {
          type: 'text' as const,
          text: "I've created a React counter component with a glassmorphism design. Set ANTHROPIC_API_KEY to use the real Claude model.",
        },
      ];

      const stream = new ReadableStream({
        async start(controller) {
          await delay(100);

          for (const step of steps) {
            if (step.type === 'tool-call') {
              controller.enqueue({
                type: 'tool-call' as const,
                toolCallType: 'function' as const,
                toolCallId: step.toolCallId,
                toolName: step.toolName,
                args: step.args,
              });
              await delay(300);
            } else if (step.type === 'tool-result') {
              controller.enqueue({
                type: 'tool-result' as const,
                toolCallId: step.toolCallId,
                toolName: step.toolName,
                result: step.result,
              });
              await delay(100);
            } else if (step.type === 'text') {
              for (const char of step.text) {
                controller.enqueue({
                  type: 'text-delta' as const,
                  textDelta: char,
                });
                await delay(15);
              }
            }
          }

          controller.enqueue({
            type: 'finish' as const,
            finishReason: 'stop' as const,
            usage: { promptTokens: 50, completionTokens: 100 },
          });

          controller.close();
        },
      });

      return {
        stream,
        rawCall: { rawPrompt: null, rawSettings: {} },
        rawResponse: { headers: {} },
        warnings: [],
      };
    },
  } as unknown as LanguageModel;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
