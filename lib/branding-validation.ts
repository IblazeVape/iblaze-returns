export type PolicyCategoryInput = { title: string; desc: string };
export type SidebarSubLinkInput = { label: string; url: string; icon?: string };
export type SidebarLinkInput = { label: string; url: string; icon?: string; children?: SidebarSubLinkInput[] };
export type ReturnLifecycleStatusInput =
  | "notReturnable" | "returnRequested" | "returnInProgress"
  | "returnDeclined" | "returnCanceled" | "returnCompleted";

export const RETURN_LIFECYCLE_STATUSES: ReturnLifecycleStatusInput[] = [
  "notReturnable", "returnRequested", "returnInProgress",
  "returnDeclined", "returnCanceled", "returnCompleted",
];

export type ReturnLifecycleStyleInput = { label: string; heading: string; icon: string; color: string };
export type ReturnLifecycleStylesInput = Record<ReturnLifecycleStatusInput, ReturnLifecycleStyleInput>;

export type ReturnLifecycleMessagesInput = {
  shippingConfirmed: string;
  shippingOnItsWay: string;
  shippingOutForDelivery: string;
  shippingAttemptedDelivery: string;
  outsideWindow: string;
  outsideWindowNoDate: string;
  finalSale: string;
  otherNotReturnable: string;
  returnRequested: string;
  returnInProgress: string;
  returnCanceled: string;
  returnCompleted: string;
};

export type RefundStatusInput = "notRefunded" | "partiallyRefunded" | "refunded";
export type RefundStatusLabelsInput = Record<RefundStatusInput, string>;

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
  guestLookupLayout: "classic" | "split";
  guestLookupHeadline: string;
  guestLookupSubtext: string;
  guestLookupHeroUrl: string;
  guestLookupBrandDisplay: "logo" | "text" | "none";
  guestLookupLogoUrl: string;
  guestLookupOverlayOpacity: number;
  guestLookupOverlayBlur: number;
  guestLookupSnakeBorder: boolean;
  guestLookupSideStyle: "image" | "gradient";
  guestLookupGradientFrom: string;
  guestLookupGradientTo: string;
  defaultOrderView: "list" | "grid";
  sidebarDefaultOpenOnDesktop: boolean;
  statusFilterEnabled: boolean;
  ineligibleMessageEnabled: boolean;
  sidebarAvatarEnabled: boolean;
  headerAvatarEnabled: boolean;
  eligibleLabel: string;
  ineligibleLabel: string;
  returnLifecycleStyles: ReturnLifecycleStylesInput;
  returnLifecycleMessages: ReturnLifecycleMessagesInput;
  refundStatusLabels: RefundStatusLabelsInput;
  alwaysShowGuestLookup: boolean;
  guestLookupEnabled: boolean;
  loggedInLookupRequirePostcode: boolean;
  policyPresentation: "dialog" | "externalLink";
  policyExternalUrl: string;
  toastPosition: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  portalCustomScript: string;
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
const GUEST_LOOKUP_HEADLINE_MAX_LENGTH = 80;
const GUEST_LOOKUP_SUBTEXT_MAX_LENGTH = 160;

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
  if (input.guestLookupLayout !== "classic" && input.guestLookupLayout !== "split") {
    errors.guestLookupLayout = "Must be classic or split.";
  }
  if (input.guestLookupHeroUrl && !isValidUrl(input.guestLookupHeroUrl)) {
    errors.guestLookupHeroUrl = "Must be a valid URL.";
  }
  if (input.guestLookupLogoUrl && !isValidUrl(input.guestLookupLogoUrl)) {
    errors.guestLookupLogoUrl = "Must be a valid URL.";
  }
  if (input.guestLookupHeadline.length > GUEST_LOOKUP_HEADLINE_MAX_LENGTH) {
    errors.guestLookupHeadline = `Must be ${GUEST_LOOKUP_HEADLINE_MAX_LENGTH} characters or fewer.`;
  }
  if (input.guestLookupSubtext.length > GUEST_LOOKUP_SUBTEXT_MAX_LENGTH) {
    errors.guestLookupSubtext = `Must be ${GUEST_LOOKUP_SUBTEXT_MAX_LENGTH} characters or fewer.`;
  }
  if (
    input.guestLookupBrandDisplay !== "logo" &&
    input.guestLookupBrandDisplay !== "text" &&
    input.guestLookupBrandDisplay !== "none"
  ) {
    errors.guestLookupBrandDisplay = "Must be logo, text, or none.";
  }
  if (
    !Number.isInteger(input.guestLookupOverlayOpacity) ||
    input.guestLookupOverlayOpacity < 0 ||
    input.guestLookupOverlayOpacity > 100
  ) {
    errors.guestLookupOverlayOpacity = "Must be a whole number from 0 to 100.";
  }
  if (
    !Number.isInteger(input.guestLookupOverlayBlur) ||
    input.guestLookupOverlayBlur < 0 ||
    input.guestLookupOverlayBlur > 24
  ) {
    errors.guestLookupOverlayBlur = "Must be a whole number from 0 to 24.";
  }

  if (typeof input.guestLookupSnakeBorder !== "boolean") {
    errors.guestLookupSnakeBorder = "Must be true or false.";
  }
  if (input.guestLookupSideStyle !== "image" && input.guestLookupSideStyle !== "gradient") {
    errors.guestLookupSideStyle = "Must be image or gradient.";
  }
  if (!HEX_COLOR_RE.test(input.guestLookupGradientFrom)) {
    errors.guestLookupGradientFrom = "Must be a hex color like #0F172A.";
  }
  if (!HEX_COLOR_RE.test(input.guestLookupGradientTo)) {
    errors.guestLookupGradientTo = "Must be a hex color like #334155.";
  }

  if (input.policyPresentation !== "dialog" && input.policyPresentation !== "externalLink") {
    errors.policyPresentation = "Must be dialog or externalLink.";
  }
  if (input.policyPresentation === "externalLink") {
    if (!input.policyExternalUrl) {
      errors.policyExternalUrl = "Enter a policy URL, or switch back to the in-app dialog.";
    } else if (!isValidUrl(input.policyExternalUrl)) {
      errors.policyExternalUrl = "Must be a valid URL.";
    }
  } else if (input.policyExternalUrl && !isValidUrl(input.policyExternalUrl)) {
    errors.policyExternalUrl = "Must be a valid URL.";
  }
  const toastPositions = ["top-left","top-center","top-right","bottom-left","bottom-center","bottom-right"] as const;
  if (!toastPositions.includes(input.toastPosition as typeof toastPositions[number])) {
    errors.toastPosition = "Pick a toast position.";
  }
  if (input.portalCustomScript.length > 20000) {
    errors.portalCustomScript = "Must be 20000 characters or fewer.";
  }
  if (typeof input.guestLookupEnabled !== "boolean") {
    errors.guestLookupEnabled = "Must be true or false.";
  }
  if (typeof input.alwaysShowGuestLookup !== "boolean") {
    errors.alwaysShowGuestLookup = "Must be true or false.";
  }
  if (typeof input.loggedInLookupRequirePostcode !== "boolean") {
    errors.loggedInLookupRequirePostcode = "Must be true or false.";
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
    const messages = Object.values(input.returnLifecycleMessages);
    if (messages.some((m) => !m.trim())) {
      errors.returnLifecycleMessages = "Every message must have some text — none can be empty.";
    } else if (messages.some((m) => m.length > POLICY_FOOTER_NOTE_MAX_LENGTH)) {
      errors.returnLifecycleMessages = `Each message must be ${POLICY_FOOTER_NOTE_MAX_LENGTH} characters or fewer.`;
    }
  }
  {
    const styles = RETURN_LIFECYCLE_STATUSES.map((k) => input.returnLifecycleStyles[k]);
    if (styles.some((s) => !s.label.trim() || !s.heading.trim())) {
      errors.returnLifecycleStyles = "Every status needs both a label and a heading.";
    } else if (styles.some((s) => s.label.length > STORE_LINK_LABEL_MAX_LENGTH || s.heading.length > POLICY_HEADING_MAX_LENGTH)) {
      errors.returnLifecycleStyles = `Labels must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer, headings ${POLICY_HEADING_MAX_LENGTH} or fewer.`;
    } else if (styles.some((s) => s.color && !HEX_COLOR_RE.test(s.color))) {
      errors.returnLifecycleStyles = "Each color must be blank or a hex color like #4F46E5.";
    }
  }
  {
    const { partiallyRefunded, refunded } = input.refundStatusLabels;
    if (!partiallyRefunded.trim() || !refunded.trim()) {
      errors.refundStatusLabels = "The 'partially refunded' and 'refunded' labels can't be empty.";
    } else if (partiallyRefunded.length > STORE_LINK_LABEL_MAX_LENGTH || refunded.length > STORE_LINK_LABEL_MAX_LENGTH) {
      errors.refundStatusLabels = `Labels must be ${STORE_LINK_LABEL_MAX_LENGTH} characters or fewer.`;
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
