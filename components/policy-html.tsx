"use client"

import { cn } from "@/lib/utils"
import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html"
import { migrateMarkdownIfNeeded } from "@/lib/markdown-to-html"

/**
 * Renders merchant-authored policy/note text (returns policy body) as
 * sanitized HTML from the rich text editor (components/app-settings/rich-text-editor.tsx).
 * Sanitized here again even though the server already sanitizes on save
 * (app/api/app/branding/route.ts) — defense in depth against any legacy
 * data or future write path that skips that step.
 */
export function PolicyHtml({ html, className }: { html: string; className?: string }) {
  const clean = sanitizePolicyHtml(migrateMarkdownIfNeeded(html))
  return (
    <div
      className={cn(
        "text-sm",
        "[&_p]:mt-2 [&_p:first-child]:mt-0",
        "[&_strong]:font-semibold",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mt-2 [&_ol]:space-y-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:mt-2",
        "[&_a]:underline [&_a]:underline-offset-2",
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
