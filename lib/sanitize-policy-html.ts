import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "strong", "em", "u", "blockquote", "ol", "ul", "li", "a", "br"];
const ALLOWED_ATTR = ["href", "target", "rel"];

/** Shared allow-list for policyBodyText HTML — used server-side on save (app/api/app/branding/route.ts) and client-side on render (components/policy-html.tsx). */
export function sanitizePolicyHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
