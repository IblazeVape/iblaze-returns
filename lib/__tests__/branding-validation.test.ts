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
});
