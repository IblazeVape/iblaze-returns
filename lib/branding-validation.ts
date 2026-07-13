export type BrandingInput = {
  name: string;
  logoUrl: string;
  accentColor: string;
  storefrontUrl: string;
  supportEmail: string;
  policyUrl: string;
  policyText: string;
  returnWindowDays: number;
  requirePolicyAcceptance: boolean;
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLICY_TEXT_MAX_LENGTH = 500;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateBrandingInput(
  input: BrandingInput
): { valid: boolean; errors: Partial<Record<keyof BrandingInput, string>> } {
  const errors: Partial<Record<keyof BrandingInput, string>> = {};

  if (!HEX_COLOR_RE.test(input.accentColor)) {
    errors.accentColor = "Must be a hex color like #4F46E5.";
  }
  if (input.logoUrl && !isValidUrl(input.logoUrl)) {
    errors.logoUrl = "Must be a valid URL.";
  }
  if (input.storefrontUrl && !isValidUrl(input.storefrontUrl)) {
    errors.storefrontUrl = "Must be a valid URL.";
  }
  if (input.policyUrl && !isValidUrl(input.policyUrl)) {
    errors.policyUrl = "Must be a valid URL.";
  }
  if (input.supportEmail && !EMAIL_RE.test(input.supportEmail)) {
    errors.supportEmail = "Must be a valid email address.";
  }
  if (input.policyText.length > POLICY_TEXT_MAX_LENGTH) {
    errors.policyText = `Must be ${POLICY_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (!Number.isInteger(input.returnWindowDays) || input.returnWindowDays < 1 || input.returnWindowDays > 365) {
    errors.returnWindowDays = "Must be a whole number of days between 1 and 365.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
