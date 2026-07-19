export type PolicyCategoryInput = { title: string; desc: string };
export type SidebarSubLinkInput = { label: string; url: string; icon?: string };
export type SidebarLinkInput = { label: string; url: string; icon?: string; children?: SidebarSubLinkInput[] };
export type IneligibleStatusMessagesInput = {
  confirmed: string;
  onItsWay: string;
  outForDelivery: string;
  attemptedDelivery: string;
  windowExpired: string;
  windowExpiredNoDate: string;
  returnRequested: string;
  returnInProgress: string;
  returned: string;
  refunded: string;
  declined: string;
  returnCancelled: string;
  cancelled: string;
  notEligible: string;
};

export type IneligibleStatusKeyInput =
  | "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery" | "passedReturnWindow"
  | "returnRequested" | "returnInProgress" | "returned" | "refunded" | "returnDeclined"
  | "returnCancelled" | "cancelled" | "finalSale" | "notEligible";

export type IneligibleStatusStyleInput = { label: string; heading: string; icon: string; color: string };
export type IneligibleStatusStylesInput = Record<IneligibleStatusKeyInput, IneligibleStatusStyleInput>;

export const INELIGIBLE_STATUS_KEYS: IneligibleStatusKeyInput[] = [
  "confirmed", "onItsWay", "outForDelivery", "attemptedDelivery", "passedReturnWindow",
  "returnRequested", "returnInProgress", "returned", "refunded", "returnDeclined",
  "returnCancelled", "cancelled", "finalSale", "notEligible",
];

export type BrandingInput = {
  name: string;
  logoUrl: string;
  accentColor: string;
  storefrontUrl: string;
  supportEmail: string;
  returnWindowDays: number;
  requirePolicyAcceptance: boolean;
  storeLinkEnabled: boolean;
  storeLinkLabel: string;
  orderStatusLinkEnabled: boolean;
  orderStatusLinkLabel: string;
  policyHeading: string;
  policySubheading: string;
  policyLastUpdated: string;
  policyBodyMode: "categories" | "text";
  policyCategories: PolicyCategoryInput[];
  policyBodyText: string;
  policyFooterNoteEnabled: boolean;
  policyFooterNote: string;
  policyAcceptedMessage: string;
  policyDeclinedMessage: string;
  sidebarLinks: SidebarLinkInput[];
  sidebarNote: string;
  sidebarLayoutSwitcherEnabled: boolean;
  defaultSidebarLayout: "inset" | "sidebar";
  headerSearchEnabled: boolean;
  headerSearchPlaceholder: string;
  tableSearchEnabled: boolean;
  tableSearchPlaceholder: string;
  tableColumnsButtonEnabled: boolean;
  tableFilterButtonEnabled: boolean;
  tablePageSizeEnabled: boolean;
  shipmentCardsEnabled: boolean;
  productImageLinksEnabled: boolean;
  sidebarSubmenusExpandedByDefault: boolean;
  guestBackgroundStyle: "none" | "shapeGrid" | "dotField";
  defaultOrderView: "list" | "grid";
  sidebarDefaultOpenOnDesktop: boolean;
  statusFilterEnabled: boolean;
  ineligibleMessageEnabled: boolean;
  sidebarAvatarEnabled: boolean;
  headerAvatarEnabled: boolean;
  eligibleLabel: string;
  ineligibleLabel: string;
  ineligibleStatusMessages: IneligibleStatusMessagesInput;
  ineligibleStatusStyles: IneligibleStatusStylesInput;
  alwaysShowGuestLookup: boolean;
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORE_LINK_LABEL_MAX_LENGTH = 30;
const POLICY_HEADING_MAX_LENGTH = 100;
const POLICY_SUBHEADING_MAX_LENGTH = 200;
const POLICY_LAST_UPDATED_MAX_LENGTH = 50;
const POLICY_CATEGORY_TITLE_MAX_LENGTH = 60;
const POLICY_CATEGORY_DESC_MAX_LENGTH = 200;
const POLICY_CATEGORIES_MAX_COUNT = 12;
const POLICY_FOOTER_NOTE_MAX_LENGTH = 300;
const POLICY_BODY_TEXT_MAX_LENGTH = 20000;
const POLICY_TOAST_MESSAGE_MAX_LENGTH = 100;
const SIDEBAR_LINK_LABEL_MAX_LENGTH = 30;
const SIDEBAR_LINKS_MAX_COUNT = 100;
const SIDEBAR_NOTE_MAX_LENGTH = 500;
const SEARCH_PLACEHOLDER_MAX_LENGTH = 100;

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
  if (input.supportEmail && !EMAIL_RE.test(input.supportEmail)) {
    errors.supportEmail = "Must be a valid email address.";
  }
  if (!Number.isInteger(input.returnWindowDays) || input.returnWindowDays < 1 || input.returnWindowDays > 365) {
    errors.returnWindowDays = "Must be a whole number of days between 1 and 365.";
  }
  if (input.storeLinkLabel.length > STORE_LINK_LABEL_MAX_LENGTH) {
    errors.storeLinkLabel = `Must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  if (input.orderStatusLinkLabel.length > STORE_LINK_LABEL_MAX_LENGTH) {
    errors.orderStatusLinkLabel = `Must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  if (!input.eligibleLabel.trim()) {
    errors.eligibleLabel = "Can't be empty.";
  } else if (input.eligibleLabel.length > STORE_LINK_LABEL_MAX_LENGTH) {
    errors.eligibleLabel = `Must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  if (!input.ineligibleLabel.trim()) {
    errors.ineligibleLabel = "Can't be empty.";
  } else if (input.ineligibleLabel.length > STORE_LINK_LABEL_MAX_LENGTH) {
    errors.ineligibleLabel = `Must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }
  {
    const messages = Object.values(input.ineligibleStatusMessages);
    if (messages.some((m) => !m.trim())) {
      errors.ineligibleStatusMessages = "Every message must have some text — none can be empty.";
    } else if (messages.some((m) => m.length > POLICY_FOOTER_NOTE_MAX_LENGTH)) {
      errors.ineligibleStatusMessages = `Each message must be ${POLICY_FOOTER_NOTE_MAX_LENGTH} characters or fewer.`;
    }
  }
  {
    const styles = INELIGIBLE_STATUS_KEYS.map((k) => input.ineligibleStatusStyles[k]);
    if (styles.some((s) => !s.label.trim() || !s.heading.trim())) {
      errors.ineligibleStatusStyles = "Every status needs both a label and a heading.";
    } else if (styles.some((s) => s.label.length > STORE_LINK_LABEL_MAX_LENGTH || s.heading.length > POLICY_HEADING_MAX_LENGTH)) {
      errors.ineligibleStatusStyles = `Labels must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer, headings ${POLICY_HEADING_MAX_LENGTH} or fewer.`;
    } else if (styles.some((s) => s.color && !HEX_COLOR_RE.test(s.color))) {
      errors.ineligibleStatusStyles = "Each color must be blank or a hex color like #4F46E5.";
    }
  }
  if (input.policyHeading.length > POLICY_HEADING_MAX_LENGTH) {
    errors.policyHeading = `Must be ${POLICY_HEADING_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policySubheading.length > POLICY_SUBHEADING_MAX_LENGTH) {
    errors.policySubheading = `Must be ${POLICY_SUBHEADING_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyLastUpdated.length > POLICY_LAST_UPDATED_MAX_LENGTH) {
    errors.policyLastUpdated = `Must be ${POLICY_LAST_UPDATED_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyFooterNote.length > POLICY_FOOTER_NOTE_MAX_LENGTH) {
    errors.policyFooterNote = `Must be ${POLICY_FOOTER_NOTE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyBodyText.length > POLICY_BODY_TEXT_MAX_LENGTH) {
    errors.policyBodyText = `Must be ${POLICY_BODY_TEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyAcceptedMessage.length > POLICY_TOAST_MESSAGE_MAX_LENGTH) {
    errors.policyAcceptedMessage = `Must be ${POLICY_TOAST_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.policyDeclinedMessage.length > POLICY_TOAST_MESSAGE_MAX_LENGTH) {
    errors.policyDeclinedMessage = `Must be ${POLICY_TOAST_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.headerSearchPlaceholder.length > SEARCH_PLACEHOLDER_MAX_LENGTH) {
    errors.headerSearchPlaceholder = `Must be ${SEARCH_PLACEHOLDER_MAX_LENGTH} characters or fewer.`;
  }
  if (input.tableSearchPlaceholder.length > SEARCH_PLACEHOLDER_MAX_LENGTH) {
    errors.tableSearchPlaceholder = `Must be ${SEARCH_PLACEHOLDER_MAX_LENGTH} characters or fewer.`;
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
  const isValidLink = (l: { label: string; url: string }) =>
    l.label.trim() && l.label.length <= SIDEBAR_LINK_LABEL_MAX_LENGTH && isValidUrl(l.url);
  if (input.sidebarLinks.length > SIDEBAR_LINKS_MAX_COUNT) {
    errors.sidebarLinks = `Must be ${SIDEBAR_LINKS_MAX_COUNT} links or fewer.`;
  } else if (
    input.sidebarLinks.some((l) => !isValidLink(l) || (l.children?.length ?? 0) > SIDEBAR_LINKS_MAX_COUNT || l.children?.some((c) => !isValidLink(c)))
  ) {
    errors.sidebarLinks = `Each link (and sub-link) needs a label (max ${SIDEBAR_LINK_LABEL_MAX_LENGTH} characters) and a valid URL.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
