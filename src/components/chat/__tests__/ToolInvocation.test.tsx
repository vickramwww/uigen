import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loading-spinner" className={className}>Loading</div>
  ),
}));

test("str_replace_editor create operation in loading state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.tsx" },
    state: "partial-call",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating App.tsx...")).toBeDefined();
  expect(screen.getByTestId("loading-spinner")).toBeDefined();
});

test("str_replace_editor create operation in completed state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.tsx" },
    state: "result",
    result: "File created successfully",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created App.tsx")).toBeDefined();
  expect(screen.queryByTestId("loading-spinner")).toBeNull();
});

test("str_replace_editor str_replace operation", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "components/Button.tsx" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Edited Button.tsx")).toBeDefined();
});

test("str_replace_editor view operation", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "view", path: "utils/helpers.ts" },
    state: "partial-call",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Viewing helpers.ts...")).toBeDefined();
});

test("str_replace_editor insert operation", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "insert", path: "config.json" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Updated config.json")).toBeDefined();
});

test("file_manager rename operation in loading state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "file_manager",
    args: { 
      command: "rename", 
      path: "old-component.tsx", 
      new_path: "new-component.tsx" 
    },
    state: "partial-call",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Renaming old-component.tsx → new-component.tsx...")).toBeDefined();
  expect(screen.getByTestId("loading-spinner")).toBeDefined();
});

test("file_manager rename operation in completed state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "file_manager",
    args: { 
      command: "rename", 
      path: "utils/old.ts", 
      new_path: "utils/new.ts" 
    },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Renamed old.ts → new.ts")).toBeDefined();
});

test("file_manager delete operation", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "file_manager",
    args: { command: "delete", path: "temp-file.js" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Deleted temp-file.js")).toBeDefined();
});

test("extracts basename from nested paths", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "src/components/ui/Button.tsx" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created Button.tsx")).toBeDefined();
});

test("handles empty path", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created file")).toBeDefined();
});

test("handles missing path", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created file")).toBeDefined();
});

test("handles unknown tool", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "unknown_tool",
    args: { some: "args" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Completed unknown_tool")).toBeDefined();
});

test("handles missing args", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: null,
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Processed file")).toBeDefined();
});

test("handles rename with missing new_path", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "file_manager",
    args: { command: "rename", path: "old.txt" },
    state: "result",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Renamed old.txt → new file")).toBeDefined();
});

test("shows loading spinner for non-result state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.tsx" },
    state: "partial-call",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  const spinner = screen.getByTestId("loading-spinner");
  expect(spinner.className).toContain("animate-spin");
  expect(spinner.className).toContain("text-blue-600");
});

test("shows success indicator for result state", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.tsx" },
    state: "result",
  };

  const { container } = render(<ToolInvocation toolInvocation={toolInvocation} />);

  const successIndicator = container.querySelector(".bg-emerald-500");
  expect(successIndicator).toBeDefined();
  expect(successIndicator?.className).toContain("w-2 h-2 rounded-full");
});

test("applies correct container styling", () => {
  const toolInvocation = {
    toolCallId: "test-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.tsx" },
    state: "result",
  };

  const { container } = render(<ToolInvocation toolInvocation={toolInvocation} />);

  const toolContainer = container.firstChild as HTMLElement;
  expect(toolContainer.className).toContain("inline-flex");
  expect(toolContainer.className).toContain("items-center");
  expect(toolContainer.className).toContain("bg-neutral-50");
  expect(toolContainer.className).toContain("rounded-lg");
});