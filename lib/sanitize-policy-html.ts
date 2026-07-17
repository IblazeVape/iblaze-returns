import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "strong", "em", "u", "blockquote", "ol", "ul", "li", "a", "br"];
const ALLOWED_ATTR = { a: ["href", "target", "rel"] };

/**
 * Shared allow-list for policyBodyText HTML — used server-side on save
 * (app/api/app/branding/route.ts) and client-side on render
 * (components/policy-html.tsx). Uses sanitize-html (a pure-JS htmlparser2
 * parser, no DOM emulation) rather than DOMPurify+jsdom — jsdom's
 * html-encoding-sniffer dependency has a broken ESM/CommonJS require() in
 * Vercel's serverless Node runtime that took the customer portal down.
 */
export function sanitizePolicyHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ["http", "https", "mailto"],
    // script/style content is dropped by sanitize-html's default
    // nonTextTags list even though they're not in allowedTags; every other
    // disallowed tag is stripped but its text content is kept.
  });
}
