import { describe, it, expect } from "vitest";
import { looksLikeMarkdown, markdownToHtml, migrateMarkdownIfNeeded } from "@/lib/markdown-to-html";

describe("looksLikeMarkdown", () => {
  it("detects bold, headings, bullets, italics as markdown", () => {
    expect(looksLikeMarkdown("**bold text**")).toBe(true);
    expect(looksLikeMarkdown("### Heading")).toBe(true);
    expect(looksLikeMarkdown("- item one")).toBe(true);
    expect(looksLikeMarkdown("_italic_")).toBe(true);
  });

  it("does not flag real HTML as markdown", () => {
    expect(looksLikeMarkdown("<p><strong>bold</strong></p>")).toBe(false);
    expect(looksLikeMarkdown("<ul><li>item</li></ul>")).toBe(false);
  });

  it("does not flag plain text as markdown", () => {
    expect(looksLikeMarkdown("Just a plain sentence.")).toBe(false);
    expect(looksLikeMarkdown("")).toBe(false);
  });
});

describe("markdownToHtml", () => {
  it("converts a heading to a bold paragraph (no h1-h6 in the allow-list)", () => {
    expect(markdownToHtml("# **Returns Policy**")).toBe("<p><strong><strong>Returns Policy</strong></strong></p>");
  });

  it("converts bullet lists", () => {
    expect(markdownToHtml("- First\n- Second")).toBe("<ul><li>First</li><li>Second</li></ul>");
  });

  it("converts bold and italic inline", () => {
    expect(markdownToHtml("**bold** and _italic_")).toBe("<p><strong>bold</strong> and <em>italic</em></p>");
  });

  it("converts links", () => {
    expect(markdownToHtml("[click here](https://example.com)")).toBe('<p><a href="https://example.com">click here</a></p>');
  });
});

describe("migrateMarkdownIfNeeded", () => {
  it("converts markdown-looking text", () => {
    expect(migrateMarkdownIfNeeded("**bold**")).toBe("<p><strong>bold</strong></p>");
  });

  it("leaves real HTML untouched", () => {
    const html = "<p><strong>bold</strong></p>";
    expect(migrateMarkdownIfNeeded(html)).toBe(html);
  });

  it("leaves plain text untouched", () => {
    expect(migrateMarkdownIfNeeded("plain text")).toBe("plain text");
  });
});
