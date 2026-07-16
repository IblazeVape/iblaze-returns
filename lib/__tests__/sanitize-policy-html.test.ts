import { describe, it, expect } from "vitest";
import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

describe("sanitizePolicyHtml", () => {
  it("strips script tags", () => {
    expect(sanitizePolicyHtml('<p>hi</p><script>alert(1)</script>')).toBe("<p>hi</p>");
  });

  it("strips event handler attributes", () => {
    expect(sanitizePolicyHtml('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips disallowed tags but keeps their text content", () => {
    expect(sanitizePolicyHtml('<h1>Heading</h1><p>body</p>')).toBe("Heading<p>body</p>");
  });

  it("keeps allowed formatting tags", () => {
    const html = "<p><strong>bold</strong> <em>italic</em> <u>underline</u></p><ul><li>item</li></ul>";
    expect(sanitizePolicyHtml(html)).toBe(html);
  });

  it("keeps safe link attributes", () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>';
    expect(sanitizePolicyHtml(html)).toBe(html);
  });

  it("strips javascript: URLs from links", () => {
    expect(sanitizePolicyHtml('<a href="javascript:alert(1)">click</a>')).toBe("<a>click</a>");
  });
});
