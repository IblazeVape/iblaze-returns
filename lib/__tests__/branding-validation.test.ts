import { describe, it, expect } from "vitest";
import { validateBrandingInput, type BrandingInput } from "@/lib/branding-validation";

const VALID: BrandingInput = {
  name: "Acme Vapes",
  logoUrl: "https://cdn.shopify.com/acme-logo.png",
  accentColor: "#4F46E5",
  storefrontUrl: "https://acme-vapes.com",
  supportEmail: "help@acme-vapes.com",
  policyUrl: "https://acme-vapes.com/policies/refund-policy",
  policyText: "Unopened items only.",
  returnWindowDays: 30,
  requirePolicyAcceptance: true,
  storeLinkEnabled: true,
  storeLinkLabel: "Store",
  policyHeading: "Acme Returns Policy",
  policySubheading: "Review our policy before selecting items to return.",
  policyBodyMode: "categories",
  policyCategories: [{ title: "Vapes", desc: "30-day refund period." }],
  policyBodyText: "",
  policyFooterNote: "Return postage is at your expense.",
  sidebarLinks: [{ label: "FAQ", url: "https://acme-vapes.com/faq" }],
  sidebarNote: "",
  sidebarLayoutSwitcherEnabled: true,
  defaultSidebarLayout: "inset",
};

describe("validateBrandingInput", () => {
  it("accepts a fully valid input", () => {
    const result = validateBrandingInput(VALID);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("accepts empty optional fields (logoUrl, storefrontUrl, policyUrl, policyText, supportEmail)", () => {
    const result = validateBrandingInput({
      ...VALID,
      logoUrl: "",
      storefrontUrl: "",
      supportEmail: "",
      policyUrl: "",
      policyText: "",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid support email when non-empty", () => {
    const result = validateBrandingInput({ ...VALID, supportEmail: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.supportEmail).toBeDefined();
  });

  it("rejects an invalid accent color", () => {
    const result = validateBrandingInput({ ...VALID, accentColor: "red" });
    expect(result.valid).toBe(false);
    expect(result.errors.accentColor).toBeDefined();
  });

  it("rejects an invalid policy URL when non-empty", () => {
    const result = validateBrandingInput({ ...VALID, policyUrl: "not a url" });
    expect(result.valid).toBe(false);
    expect(result.errors.policyUrl).toBeDefined();
  });

  it("rejects a return window outside 1-365", () => {
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 0 }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 366 }).valid).toBe(false);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 365 }).valid).toBe(true);
    expect(validateBrandingInput({ ...VALID, returnWindowDays: 1 }).valid).toBe(true);
  });

  it("rejects policy text over 500 characters", () => {
    const result = validateBrandingInput({ ...VALID, policyText: "x".repeat(501) });
    expect(result.valid).toBe(false);
    expect(result.errors.policyText).toBeDefined();
  });

  it("accepts an empty policyCategories and sidebarLinks list", () => {
    const result = validateBrandingInput({ ...VALID, policyCategories: [], sidebarLinks: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects a policy category missing a title", () => {
    const result = validateBrandingInput({ ...VALID, policyCategories: [{ title: "", desc: "Some text." }] });
    expect(result.valid).toBe(false);
    expect(result.errors.policyCategories).toBeDefined();
  });

  it("rejects more than 12 policy categories", () => {
    const categories = Array.from({ length: 13 }, (_, i) => ({ title: `Cat ${i}`, desc: "desc" }));
    const result = validateBrandingInput({ ...VALID, policyCategories: categories });
    expect(result.valid).toBe(false);
    expect(result.errors.policyCategories).toBeDefined();
  });

  it("rejects a sidebar link with an invalid URL", () => {
    const result = validateBrandingInput({ ...VALID, sidebarLinks: [{ label: "FAQ", url: "not a url" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("rejects a sidebar link missing a label", () => {
    const result = validateBrandingInput({ ...VALID, sidebarLinks: [{ label: "", url: "https://acme-vapes.com" }] });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("rejects more than 10 sidebar links", () => {
    const links = Array.from({ length: 11 }, (_, i) => ({ label: `Link ${i}`, url: "https://acme-vapes.com" }));
    const result = validateBrandingInput({ ...VALID, sidebarLinks: links });
    expect(result.valid).toBe(false);
    expect(result.errors.sidebarLinks).toBeDefined();
  });

  it("rejects a storeLinkLabel over 30 characters", () => {
    const result = validateBrandingInput({ ...VALID, storeLinkLabel: "x".repeat(31) });
    expect(result.valid).toBe(false);
    expect(result.errors.storeLinkLabel).toBeDefined();
  });

  it("accepts policyBodyMode text with a long policyBodyText, ignoring policyCategories", () => {
    const result = validateBrandingInput({ ...VALID, policyBodyMode: "text", policyBodyText: "Free-form policy text.", policyCategories: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects policyBodyText over 20000 characters", () => {
    const result = validateBrandingInput({ ...VALID, policyBodyText: "x".repeat(20001) });
    expect(result.valid).toBe(false);
    expect(result.errors.policyBodyText).toBeDefined();
  });
});
