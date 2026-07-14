export type PolicyCategoryInput = { title: string; desc: string };
export type SidebarLinkInput = { label: string; url: string };

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
  storeLinkEnabled: boolean;
  storeLinkLabel: string;
  policyHeading: string;
  policySubheading: string;
  policyBodyMode: "categories" | "text";
  policyCategories: PolicyCategoryInput[];
  policyBodyText: string;
  policyFooterNote: string;
  sidebarLinks: SidebarLinkInput[];
  sidebarNote: string;
  sidebarLayoutSwitcherEnabled: boolean;
  defaultSidebarLayout: "inset" | "sidebar";
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POLICY_TEXT_MAX_LENGTH = 500;
const STORE_LINK_LABEL_MAX_LENGTH = 30;
const POLICY_HEADING_MAX_LENGTH = 100;
const POLICY_SUBHEADING_MAX_LENGTH = 200;
const POLICY_CATEGORY_TITLE_MAX_LENGTH = 60;
const POLICY_CATEGORY_DESC_MAX_LENGTH = 200;
const POLICY_CATEGORIES_MAX_COUNT = 12;
const POLICY_FOOTER_NOTE_MAX_LENGTH = 300;
const POLICY_BODY_TEXT_MAX_LENGTH = 20000;
const SIDEBAR_LINK_LABEL_MAX_LENGTH = 30;
const SIDEBAR_LINKS_MAX_COUNT = 10;
const SIDEBAR_NOTE_MAX_LENGTH = 500;

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
  if (input.storeLinkLabel.length > STORE_LINK_LABEL_MAX_LENGTH) {
    errors.storeLinkLabel = `Must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyHeading.length > POLICY_HEADING_MAX_LENGTH) {
    errors.policyHeading = `Must be ${POLICY_HEADING_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policySubheading.length > POLICY_SUBHEADING_MAX_LENGTH) {
    errors.policySubheading = `Must be ${POLICY_SUBHEADING_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyFooterNote.length > POLICY_FOOTER_NOTE_MAX_LENGTH) {
    errors.policyFooterNote = `Must be ${POLICY_FOOTER_NOTE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyBodyText.length > POLICY_BODY_TEXT_MAX_LENGTH) {
    errors.policyBodyText = `Must be ${POLICY_BODY_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (input.sidebarNote.length > SIDEBAR_NOTE_MAX_LENGTH) {
    errors.sidebarNote = `Must be ${SIDEBAR_NOTE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyCategories.length > POLICY_CATEGORIES_MAX_COUNT) {
    errors.policyCategories = `Must be ${POLICY_CATEGORIES_MAX_COUNT} categories or fewer.`;
  } else if (
    input.policyCategories.some(
      (c) => !c.title.trim() || c.title.length > POLICY_CATEGORY_TITLE_MAX_LENGTH || c.desc.length > POLICY_CATEGORY_DESC_MAX_LENGTH
    )
  ) {
    errors.policyCategories = `Each category needs a title (max ${POLICY_CATEGORY_TITLE_MAX_LENGTH} characters) and a description (max ${POLICY_CATEGORY_DESC_MAX_LENGTH} characters).`;
  }
  if (input.sidebarLinks.length > SIDEBAR_LINKS_MAX_COUNT) {
    errors.sidebarLinks = `Must be ${SIDEBAR_LINKS_MAX_COUNT} links or fewer.`;
  } else if (
    input.sidebarLinks.some((l) => !l.label.trim() || l.label.length > SIDEBAR_LINK_LABEL_MAX_LENGTH || !isValidUrl(l.url))
  ) {
    errors.sidebarLinks = `Each link needs a label (max ${SIDEBAR_LINK_LABEL_MAX_LENGTH} characters) and a valid URL.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
