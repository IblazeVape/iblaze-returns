// One-time migration helper: policyBodyText was Markdown under the old
// toolbar editor (components/app-settings/markdown-toolbar-textarea.tsx,
// removed) and is now HTML under the Quill editor. Existing stored values
// saved before that switch are still raw Markdown, which the new renderer
// (components/policy-html.tsx) shows as literal "**"/"###" text instead of
// formatting. Detect and convert on the fly, both for display and so a
// re-save persists real HTML going forward.

/** True if `text` looks like the old toolbar's Markdown output and not HTML (no tags present). */
export function looksLikeMarkdown(text: string): boolean {
  if (/<\/?(p|strong|em|u|blockquote|ol|ul|li|a|br)\b/i.test(text)) return false;
  return /\*\*.+?\*\*/.test(text) || /^#{1,6}\s+/m.test(text) || /^-\s+/m.test(text) || /_.+?_/.test(text);
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

/** Converts the old toolbar's Markdown subset (**bold**, _italic_, # headings, - bullets, [text](url)) to HTML matching sanitizePolicyHtml's allow-list. */
export function markdownToHtml(text: string): string {
  const lines = text.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bulletMatch = /^-\s+(.*)$/.exec(line);

    if (bulletMatch) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${inlineMarkdown(bulletMatch[1])}</li>`);
      continue;
    }
    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }
    if (line === "") continue;

    const headingMatch = /^#{1,6}\s+(.*)$/.exec(line);
    if (headingMatch) {
      // No h1-h6 in the allow-list — headings become bold paragraphs instead.
      htmlLines.push(`<p><strong>${inlineMarkdown(headingMatch[1])}</strong></p>`);
      continue;
    }
    htmlLines.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  if (inList) htmlLines.push("</ul>");

  return htmlLines.join("");
}

/** Converts only if `text` looks like Markdown; otherwise returns it unchanged. */
export function migrateMarkdownIfNeeded(text: string): string {
  return looksLikeMarkdown(text) ? markdownToHtml(text) : text;
}
