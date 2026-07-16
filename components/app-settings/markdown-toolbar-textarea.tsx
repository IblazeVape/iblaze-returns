// components/app-settings/markdown-toolbar-textarea.tsx
"use client";

import { useRef } from "react";

type MarkdownToolbarTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
};

type WrapAction = { type: "wrap"; before: string; after: string; placeholder: string };
type LinePrefixAction = { type: "line-prefix"; prefix: string; placeholder: string };
type ToolbarAction = WrapAction | LinePrefixAction;

const TOOLBAR_BUTTONS: { label: string; accessibilityLabel: string; action: ToolbarAction }[] = [
  { label: "B", accessibilityLabel: "Bold", action: { type: "wrap", before: "**", after: "**", placeholder: "bold text" } },
  { label: "I", accessibilityLabel: "Italic", action: { type: "wrap", before: "_", after: "_", placeholder: "italic text" } },
  { label: "H", accessibilityLabel: "Heading", action: { type: "line-prefix", prefix: "### ", placeholder: "Heading" } },
  { label: "•", accessibilityLabel: "Bullet list item", action: { type: "line-prefix", prefix: "- ", placeholder: "List item" } },
  { label: "Link", accessibilityLabel: "Link", action: { type: "wrap", before: "[", after: "](https://)", placeholder: "link text" } },
];

/**
 * A plain native <textarea> (not <s-text-area>) so selectionStart/End is
 * reliably readable/writable for cursor-aware Markdown insertion — Polaris
 * web components don't expose their internal input's selection API, and
 * this app already has one confirmed case (Settings tabs) where a Polaris
 * web component didn't behave as expected in this embedded runtime.
 * Inserted syntax is rendered downstream by components/policy-markdown.tsx
 * (react-markdown) — plain Markdown text stays the storage format.
 */
export function MarkdownToolbarTextarea({ value, onChange, rows = 12, maxLength, placeholder }: MarkdownToolbarTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyAction(action: ToolbarAction) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let nextValue: string;
    let cursorStart: number;
    let cursorEnd: number;

    if (action.type === "wrap") {
      const text = selected || action.placeholder;
      nextValue = value.slice(0, start) + action.before + text + action.after + value.slice(end);
      cursorStart = start + action.before.length;
      cursorEnd = cursorStart + text.length;
    } else {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const text = selected || action.placeholder;
      nextValue = value.slice(0, lineStart) + action.prefix + value.slice(lineStart, start) + text + value.slice(end);
      cursorStart = lineStart + action.prefix.length + (start - lineStart);
      cursorEnd = cursorStart + text.length;
    }

    onChange(nextValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  return (
    <s-stack direction="block" gap="small-200">
      <s-stack direction="inline" gap="small-200">
        {TOOLBAR_BUTTONS.map((btn) => (
          <s-button key={btn.accessibilityLabel} variant="tertiary" accessibilityLabel={btn.accessibilityLabel} onClick={() => applyAction(btn.action)}>
            {btn.label}
          </s-button>
        ))}
      </s-stack>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "inherit",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          padding: "8px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          resize: "vertical",
        }}
      />
    </s-stack>
  );
}
