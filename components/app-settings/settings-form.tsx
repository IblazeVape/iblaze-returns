"use client"

import { useEffect, useRef, useState } from "react"
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput, type SidebarSubLinkInput, type ReturnLifecycleMessagesInput, type ReturnLifecycleStatusInput, type ReturnLifecycleStyleInput } from "@/lib/branding-validation"
import type { TenantBranding } from "@/lib/tenant"
import { SIDEBAR_ICON_NAMES } from "@/lib/sidebar-icons"
import { STATUS_ICON_NAMES } from "@/lib/status-icons"
import { RichTextEditor } from "@/components/app-settings/rich-text-editor"
import { PolicyCategoriesTable, newCategoryRowId, reorderList } from "@/components/app-settings/policy-categories-table"
import { SidebarLinksTable, newSidebarLinkRowId } from "@/components/app-settings/sidebar-links-table"
import { DEFAULT_TENANT_FIELDS } from "@/lib/tenant-defaults"
import { migrateMarkdownIfNeeded } from "@/lib/markdown-to-html"
import { GUEST_LOOKUP_GRADIENT_PRESETS, matchGuestLookupGradientPreset } from "@/lib/guest-lookup-gradients"

/** RETURN_STATUS_CARDS drives the "Return status" section (7 cards, each with
 * label/heading/icon/color, plus a per-status sentence for returnRequested,
 * returnInProgress, returnCanceled, and returnCompleted). returnDeclined has no
 * sentence field here since its text comes from the real Shopify decline reason,
 * not a static template. awaitingDelivery and returnWindowClosed sentences live
 * in their own settings rows below (multiple reasons under each status).
 */
const RETURN_STATUS_CARDS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "awaitingDelivery", name: "Awaiting delivery" },
  { key: "returnWindowClosed", name: "Return window closed" },
  { key: "returnRequested", name: "Return requested" },
  { key: "returnInProgress", name: "Return in progress" },
  { key: "returnDeclined", name: "Return declined" },
  { key: "returnCanceled", name: "Return canceled" },
  { key: "returnCompleted", name: "Return completed" },
]

declare const shopify: {
  idToken: () => Promise<string>;
  // shopify.picker() resolves to an object whose `selected` property is
  // ITSELF a promise of plain ID strings — not a resolved array of
  // {id: string} objects. Confirmed via Shopify's own docs example:
  // `const picker = await shopify.picker({...}); const selected = await picker.selected`.
  // Getting this shape wrong meant the code below never actually read a
  // selection (accessing [0] on a Promise is always undefined).
  picker: (options: {
    heading: string;
    items: { id: string; heading: string; thumbnail?: { url: string } }[];
  }) => Promise<{ selected: Promise<string[] | undefined> }>;
  saveBar: {
    show: (id: string) => Promise<void>;
    hide: (id: string) => Promise<void>;
  };
  toast: {
    show: (message: string, options?: { isError?: boolean; duration?: number }) => void;
  };
};

const SAVE_BAR_ID = "settings-save-bar";

type MediaLibraryFile = { id: string; url: string; alt: string | null; width: number; height: number };
type SettingsTab = "branding" | "returns" | "navigation" | "table" | "danger";

const TAB_FIELDS: Record<SettingsTab, (keyof BrandingInput)[]> = {
  branding: [
    "name", "logoUrl", "logoHeight", "accentColor", "storefrontUrl", "supportEmail", "guestBackgroundStyle",
    "guestLookupLayout", "guestLookupLayoutMobile", "guestLookupHeadline", "guestLookupSubtext", "guestLookupHeroUrl",
    "guestLookupBrandDisplay", "guestLookupLogoUrl", "guestLookupOverlayOpacity", "guestLookupOverlayBlur",
    "guestLookupSnakeBorder", "guestLookupSideStyle", "guestLookupGradientFrom", "guestLookupGradientTo",
    "toastPosition", "portalCustomScript",
  ],
  returns: [
    "returnWindowDays", "requirePolicyAcceptance", "returnReviewEnabled", "alwaysShowGuestLookup", "guestLookupEnabled",
    "loggedInLookupRequirePostcode",
    "policyHeading", "policySubheading", "policyLastUpdated", "policyBodyMode", "policyCategories", "policyBodyText",
    "policyFooterNoteEnabled", "policyFooterNote", "policyAcceptedMessage", "policyDeclinedMessage",
    "policyPresentation", "policyExternalUrl", "policyReviewButtonLabel",
  ],
  navigation: [
    "storeLinkEnabled", "storeLinkLabel", "orderStatusLinkEnabled", "orderStatusLinkLabel",
    "sidebarLinks", "sidebarNote", "sidebarSubmenusExpandedByDefault", "sidebarLayoutSwitcherEnabled",
    "defaultSidebarLayout", "sidebarEnabled", "lookupSidebarEnabled", "sidebarDefaultOpenOnDesktop", "sidebarAvatarEnabled", "headerAvatarEnabled",
  ],
  table: [
    "headerSearchEnabled", "headerSearchPlaceholder", "tableSearchEnabled", "tableSearchPlaceholder",
    "tableColumnsButtonEnabled", "tableFilterButtonEnabled", "tablePageSizeEnabled", "shipmentCardsEnabled",
    "productImageLinksEnabled", "statusFilterEnabled", "ineligibleMessageEnabled", "eligibleLabel",
    "ineligibleLabel", "defaultOrderView", "returnLifecycleMessages", "returnLifecycleStyles", "refundStatusLabels",
  ],
  // No fields of its own — Reset actions act on the whole form/tenant record,
  // not a validated field subset, so there's nothing for the Save-error tab
  // jump (see handleSave) to ever match here.
  danger: [],
};

/** Which settings modal owns which fields — used to highlight the row and auto-open the right modal on Save errors. */
const SETTINGS_MODAL_FIELDS: Record<string, (keyof BrandingInput)[]> = {
  "branding-identity-modal": ["name", "logoUrl", "logoHeight", "accentColor", "storefrontUrl", "supportEmail"],
  "branding-portal-extras-modal": ["toastPosition", "portalCustomScript"],
  "branding-lookup-modal": [
    "guestBackgroundStyle", "guestLookupLayout", "guestLookupLayoutMobile", "guestLookupHeadline", "guestLookupSubtext",
    "guestLookupHeroUrl", "guestLookupBrandDisplay", "guestLookupLogoUrl",
    "guestLookupOverlayOpacity", "guestLookupOverlayBlur", "guestLookupSnakeBorder",
    "guestLookupSideStyle", "guestLookupGradientFrom", "guestLookupGradientTo",
  ],
  "returns-window-modal": ["returnWindowDays", "requirePolicyAcceptance", "returnReviewEnabled"],
  "returns-lookup-audience-modal": ["alwaysShowGuestLookup", "guestLookupEnabled", "loggedInLookupRequirePostcode"],
  "returns-policy-modal": [
    "policyHeading", "policySubheading", "policyLastUpdated", "policyBodyMode",
    "policyCategories", "policyBodyText", "policyFooterNoteEnabled", "policyFooterNote",
    "policyPresentation", "policyExternalUrl", "policyReviewButtonLabel",
  ],
  "returns-confirm-modal": ["policyAcceptedMessage", "policyDeclinedMessage"],
  "nav-sidebar-layout-modal": [
    "sidebarEnabled", "lookupSidebarEnabled",
    "sidebarLayoutSwitcherEnabled", "defaultSidebarLayout", "sidebarDefaultOpenOnDesktop",
    "sidebarAvatarEnabled",
  ],
  "nav-sidebar-links-modal": ["sidebarLinks", "sidebarNote", "sidebarSubmenusExpandedByDefault"],
  "nav-header-links-modal": [
    "storeLinkEnabled", "storeLinkLabel", "orderStatusLinkEnabled", "orderStatusLinkLabel",
    "headerAvatarEnabled",
  ],
  "table-header-search-modal": ["headerSearchEnabled", "headerSearchPlaceholder"],
  "table-order-items-modal": [
    "tableSearchEnabled", "tableSearchPlaceholder", "tableFilterButtonEnabled", "statusFilterEnabled",
    "eligibleLabel", "ineligibleLabel", "ineligibleMessageEnabled", "defaultOrderView",
    "tableColumnsButtonEnabled", "tablePageSizeEnabled", "shipmentCardsEnabled", "productImageLinksEnabled",
  ],
  "table-return-status-modal": ["returnLifecycleStyles", "returnLifecycleMessages"],
  "table-awaiting-delivery-modal": ["returnLifecycleMessages"],
  "table-return-window-closed-modal": ["returnLifecycleMessages"],
  "table-refund-modal": ["refundStatusLabels"],
};

function firstModalForErrors(errors: Partial<Record<keyof BrandingInput, string>>): string | null {
  const keys = Object.keys(errors) as (keyof BrandingInput)[]
  for (const [modalId, fields] of Object.entries(SETTINGS_MODAL_FIELDS)) {
    if (fields.some((f) => keys.includes(f))) return modalId
  }
  return null
}

function showSettingsModal(modalId: string) {
  // Wait a tick so the tab that owns the modal is mounted first.
  requestAnimationFrame(() => {
    const el = document.getElementById(modalId) as (HTMLElement & { show?: () => void }) | null
    if (el && typeof el.show === "function") {
      el.show()
      return
    }
    const trigger = document.querySelector<HTMLElement>(`[commandfor="${modalId}"], [commandFor="${modalId}"]`)
    trigger?.click()
  })
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1)) || "Untitled image";
  } catch {
    return "Untitled image";
  }
}

/** Moves the item at `from` to `to`, shifting everything between them — used by drag-and-drop reordering (a drag can move an item several positions at once, unlike the adjacent-only Move up/down buttons). */
function reorderArray<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Old-index -> new-index mapping for the same move, so a Set of "open" row indices can be remapped to follow their rows after a drag reorder. */
function reorderIndexMap(length: number, from: number, to: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  const reordered = reorderArray(indices, from, to)
  const map = new Array<number>(length)
  reordered.forEach((oldIndex, newIndex) => { map[oldIndex] = newIndex })
  return map
}


function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/** Live “what’s set now” line — optional logo/swatch, then short text parts. */
function SettingsValueSummary({
  leading,
  parts,
}: {
  leading?: React.ReactNode
  parts: (string | null | false | undefined)[]
}) {
  const text = parts.filter(Boolean).join(" · ")
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 20 }}>
      {leading}
      {text ? <span style={{ fontSize: 13, lineHeight: 1.4 }}>{text}</span> : null}
    </div>
  )
}

function AccentSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      title={color}
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: 4,
        background: color || "#ccc",
        border: "1px solid rgba(0,0,0,0.15)",
        flexShrink: 0,
      }}
    />
  )
}

/** Checkbox + its help line as one tight unit (avoids large stack gaps between rows). */
function CheckboxWithHelp({
  label,
  name,
  checked,
  onChange,
  help,
  disabled,
}: {
  label: string
  name: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  help?: string
  disabled?: boolean
}) {
  return (
    <s-stack direction="block" gap="small-100">
      <s-checkbox
        label={label}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      ></s-checkbox>
      {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
    </s-stack>
  )
}

/** Summary row + Polaris modal editor — used by Branding-style settings panes. */
function SettingsEditRow({
  modalId,
  title,
  description,
  summary,
  modalSize = "large",
  errors,
  children,
}: {
  modalId: string
  title: string
  /** One purpose sentence — what this controls for the customer / merchant. */
  description: string
  summary: React.ReactNode
  modalSize?: string
  errors: Partial<Record<keyof BrandingInput, string>>
  children: React.ReactNode
}) {
  const fieldErrors = (SETTINGS_MODAL_FIELDS[modalId] ?? [])
    .map((field) => errors[field])
    .filter((msg): msg is string => Boolean(msg))
  const uniqueErrors = [...new Set(fieldErrors)]
  const hasError = uniqueErrors.length > 0

  return (
    <>
      <s-box
        padding="base"
        border="base"
        borderRadius="base"
        background="base"
        style={hasError ? { outline: "2px solid #c72a2a", outlineOffset: 0 } : undefined}
      >
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
          <s-stack direction="block" gap="small-200">
            <s-heading>{title}</s-heading>
            <s-paragraph color="subdued">{description}</s-paragraph>
            {typeof summary === "string" ? <s-paragraph>{summary}</s-paragraph> : summary}
            {hasError ? (
              <s-paragraph tone="critical">{uniqueErrors[0]}</s-paragraph>
            ) : null}
          </s-stack>
          <s-button commandFor={modalId} command="--show" variant={hasError ? "primary" : undefined}>
            {hasError ? "Fix" : "Edit"}
          </s-button>
        </s-stack>
      </s-box>
      <s-modal id={modalId} heading={title} size={modalSize}>
        <div style={{ paddingBottom: 28 }}>
          {children}
        </div>
        <s-button slot="primary-action" variant="primary" commandFor={modalId} command="--hide">
          Done
        </s-button>
      </s-modal>
    </>
  )
}

export function SettingsForm({
  initialBranding,
  initialReturnWindowDays,
}: {
  initialBranding: TenantBranding
  initialReturnWindowDays: number
}) {
  const initialForm = useRef<BrandingInput>({
    ...initialBranding,
    // Self-heals data saved under the old Markdown toolbar editor (removed)
    // so the Quill editor shows real formatting instead of raw "**"/"###"
    // syntax — persists as proper HTML the next time the merchant saves.
    policyBodyText: migrateMarkdownIfNeeded(initialBranding.policyBodyText),
    returnWindowDays: initialReturnWindowDays,
  })
  const [form, setForm] = useState<BrandingInput>(initialForm.current)

  // Native App Bridge save bar (shopify.saveBar.show/hide) instead of an
  // inline Save button only — this form isn't a plain HTML <form> Shopify's
  // automatic data-save-bar attribute can track (fields are React-controlled
  // s-* components), so this drives it programmatically off dirty state.
  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(initialForm.current)
    if (typeof shopify === "undefined") return
    if (dirty) shopify.saveBar.show(SAVE_BAR_ID)
    else shopify.saveBar.hide(SAVE_BAR_ID)
  }, [form])

  const [errors, setErrors] = useState<Partial<Record<keyof BrandingInput, string>>>({})
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "invalid">("idle")
  const [loadingLibraryField, setLoadingLibraryField] = useState<"logoUrl" | "guestLookupHeroUrl" | "guestLookupLogoUrl" | null>(null)
  // Polaris's s-tabs/s-tab-list/s-tab/s-tab-panel custom elements don't
  // register/render correctly in this app's embedded runtime (confirmed live
  // — they fell back to unstyled inline text with no panel switching), so
  // tab navigation is done manually here with plain state instead.
  // Lets Dashboard's quick-access cards deep-link straight to a tab
  // (/app?tab=returns) instead of always landing on Branding.
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window === "undefined") return "branding"
    const tab = new URLSearchParams(window.location.search).get("tab")
    return tab === "returns" || tab === "navigation" || tab === "table" || tab === "danger" ? tab : "branding"
  })
  // Return-status cards stay accordion-style. Sidebar links + policy categories
  // use compact drag-sortable tables instead.
  const [openStatusKey, setOpenStatusKey] = useState<ReturnLifecycleStatusInput | null>(null)
  function toggleStatusOpen(key: ReturnLifecycleStatusInput) {
    setOpenStatusKey((prev) => (prev === key ? null : key))
  }

  const [categoryFilter, setCategoryFilter] = useState("")
  const [categoryIds, setCategoryIds] = useState(() =>
    initialForm.current.policyCategories.map(() => newCategoryRowId())
  )
  const [sidebarLinkFilter, setSidebarLinkFilter] = useState("")
  const [sidebarLinkIds, setSidebarLinkIds] = useState(() =>
    initialForm.current.sidebarLinks.map(() => newSidebarLinkRowId())
  )
  const [sidebarSubLinkIds, setSidebarSubLinkIds] = useState(() =>
    initialForm.current.sidebarLinks.map((l) => (l.children ?? []).map(() => newSidebarLinkRowId()))
  )

  function set<K extends keyof BrandingInput>(key: K, value: BrandingInput[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Live-clear the Fix state as soon as the form is valid again (don't wait for Save).
      const { valid, errors: nextErrors } = validateBrandingInput(next)
      setErrors(nextErrors)
      if (valid) setStatus((s) => (s === "invalid" ? "idle" : s))
      return next
    })
  }

  function setReturnLifecycleMessage<K extends keyof ReturnLifecycleMessagesInput>(key: K, value: string) {
    setForm((f) => ({ ...f, returnLifecycleMessages: { ...f.returnLifecycleMessages, [key]: value } }))
  }

  function setStatusStyle<K extends keyof ReturnLifecycleStyleInput>(statusKey: ReturnLifecycleStatusInput, field: K, value: ReturnLifecycleStyleInput[K]) {
    setForm((f) => ({
      ...f,
      returnLifecycleStyles: {
        ...f.returnLifecycleStyles,
        [statusKey]: { ...f.returnLifecycleStyles[statusKey], [field]: value },
      },
    }))
  }

  function setRefundStatusLabel(key: "partiallyRefunded" | "refunded", value: string) {
    setForm((f) => ({ ...f, refundStatusLabels: { ...f.refundStatusLabels, [key]: value } }))
  }

  async function authedFetch(input: string, init: RequestInit = {}) {
    const token = await shopify.idToken()
    return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  }

  async function handleChooseFromLibrary(field: "logoUrl" | "guestLookupHeroUrl" | "guestLookupLogoUrl" = "logoUrl") {
    setLoadingLibraryField(field)
    try {
      const res = await authedFetch("/api/app/media-library")
      const data = (await res.json()) as { files?: MediaLibraryFile[] }
      const files = data.files ?? []
      if (files.length === 0) {
        setErrors((e) => ({ ...e, [field]: "No images found in your Shopify media library." }))
        return
      }
      const headings = {
        logoUrl: "Choose store logo",
        guestLookupHeroUrl: "Choose hero image for Find your order",
        guestLookupLogoUrl: "Choose panel logo",
      } as const
      const picker = await shopify.picker({
        heading: headings[field],
        items: files.map((f) => ({ id: f.id, heading: f.alt || filenameFromUrl(f.url), thumbnail: { url: f.url } })),
      })
      const selectedIds = await picker.selected
      // undefined means the merchant cancelled the picker — not an error,
      // do nothing. Only a non-empty selection that fails to match one of
      // the files we listed is a real (unexpected) failure.
      if (!selectedIds?.length) return
      const chosen = files.find((f) => f.id === selectedIds[0])
      if (chosen) {
        set(field, chosen.url)
        setErrors((e) => {
          const next = { ...e }
          delete next[field]
          return next
        })
      } else {
        setErrors((e) => ({ ...e, [field]: "Couldn't match the selected image. Try again." }))
      }
    } catch {
      setErrors((e) => ({ ...e, [field]: "Couldn't open the media library. Try again." }))
    } finally {
      setLoadingLibraryField(null)
    }
  }

  function updateCategory(index: number, patch: Partial<PolicyCategoryInput>) {
    setForm((f) => {
      const next = { ...f, policyCategories: f.policyCategories.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
      setErrors(validateBrandingInput(next).errors)
      return next
    })
  }
  function addCategory() {
    setCategoryIds((ids) => [...ids, newCategoryRowId()])
    setForm((f) => ({ ...f, policyCategories: [...f.policyCategories, { title: "", desc: "" }] }))
  }
  function removeCategory(index: number) {
    setCategoryIds((ids) => ids.filter((_, i) => i !== index))
    setForm((f) => ({ ...f, policyCategories: f.policyCategories.filter((_, i) => i !== index) }))
  }
  function reorderCategories(fromIndex: number, toIndex: number) {
    setCategoryIds((ids) => reorderList(ids, fromIndex, toIndex))
    setForm((f) => ({
      ...f,
      policyCategories: reorderList(f.policyCategories, fromIndex, toIndex),
    }))
  }

  function updateSidebarLink(index: number, patch: Partial<SidebarLinkInput>) {
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)) }))
  }
  function addSidebarLink() {
    setSidebarLinkIds((ids) => [...ids, newSidebarLinkRowId()])
    setSidebarSubLinkIds((ids) => [...ids, []])
    setForm((f) => ({ ...f, sidebarLinks: [...f.sidebarLinks, { label: "", url: "" }] }))
  }
  function removeSidebarLink(index: number) {
    setSidebarLinkIds((ids) => ids.filter((_, i) => i !== index))
    setSidebarSubLinkIds((ids) => ids.filter((_, i) => i !== index))
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.filter((_, i) => i !== index) }))
  }
  function reorderSidebarLinks(fromIndex: number, toIndex: number) {
    setSidebarLinkIds((ids) => reorderList(ids, fromIndex, toIndex))
    setSidebarSubLinkIds((ids) => reorderList(ids, fromIndex, toIndex))
    setForm((f) => ({
      ...f,
      sidebarLinks: reorderList(f.sidebarLinks, fromIndex, toIndex),
    }))
  }

  function addSubLink(parentIndex: number) {
    setSidebarSubLinkIds((ids) =>
      ids.map((row, i) => (i === parentIndex ? [...row, newSidebarLinkRowId()] : row))
    )
    setForm((f) => ({
      ...f,
      sidebarLinks: f.sidebarLinks.map((l, i) =>
        i === parentIndex ? { ...l, children: [...(l.children ?? []), { label: "", url: "" }] } : l
      ),
    }))
  }
  function updateSubLink(parentIndex: number, childIndex: number, patch: Partial<SidebarSubLinkInput>) {
    setForm((f) => ({
      ...f,
      sidebarLinks: f.sidebarLinks.map((l, i) =>
        i === parentIndex
          ? { ...l, children: (l.children ?? []).map((c, ci) => (ci === childIndex ? { ...c, ...patch } : c)) }
          : l
      ),
    }))
  }
  function removeSubLink(parentIndex: number, childIndex: number) {
    setSidebarSubLinkIds((ids) =>
      ids.map((row, i) => (i === parentIndex ? row.filter((_, ci) => ci !== childIndex) : row))
    )
    setForm((f) => ({
      ...f,
      sidebarLinks: f.sidebarLinks.map((l, i) =>
        i === parentIndex ? { ...l, children: (l.children ?? []).filter((_, ci) => ci !== childIndex) } : l
      ),
    }))
  }
  function reorderSubLinks(parentIndex: number, fromIndex: number, toIndex: number) {
    setSidebarSubLinkIds((ids) =>
      ids.map((row, i) => (i === parentIndex ? reorderList(row, fromIndex, toIndex) : row))
    )
    setForm((f) => ({
      ...f,
      sidebarLinks: f.sidebarLinks.map((l, i) =>
        i === parentIndex
          ? { ...l, children: reorderList(l.children ?? [], fromIndex, toIndex) }
          : l
      ),
    }))
  }

  function resetSidebarLinkRowIds(links: SidebarLinkInput[]) {
    setSidebarLinkIds(links.map(() => newSidebarLinkRowId()))
    setSidebarSubLinkIds(links.map((l) => (l.children ?? []).map(() => newSidebarLinkRowId())))
    setSidebarLinkFilter("")
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateBrandingInput(form)
    setErrors(validationErrors)
    if (!valid) {
      // Jump to the tab that owns the error, highlight that settings row, show
      // the real message in the toast, and open the matching modal so the
      // merchant doesn't have to hunt through Edit panels.
      const errorKeys = Object.keys(validationErrors) as (keyof BrandingInput)[]
      const tabWithError = (Object.keys(TAB_FIELDS) as SettingsTab[]).find((tab) =>
        TAB_FIELDS[tab].some((field) => errorKeys.includes(field))
      )
      if (tabWithError) setActiveTab(tabWithError)
      const modalId = firstModalForErrors(validationErrors)
      // Give React a moment to mount the target tab (and its modals) first.
      if (modalId) setTimeout(() => showSettingsModal(modalId), 50)
      setStatus("invalid")
      const firstMessage = errorKeys.map((k) => validationErrors[k]).find(Boolean) || "Fix the highlighted error and try again."
      if (typeof shopify !== "undefined") shopify.toast.show(firstMessage, { isError: true })
      return
    }

    setStatus("saving")
    try {
      const res = await authedFetch("/api/app/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setStatus("error")
        if (typeof shopify !== "undefined") shopify.toast.show("Something went wrong. Try again.", { isError: true })
        return
      }
      initialForm.current = form
      if (typeof shopify !== "undefined") {
        shopify.saveBar.hide(SAVE_BAR_ID)
        shopify.toast.show("Settings saved")
      }
      setStatus("saved")
    } catch {
      setStatus("error")
      if (typeof shopify !== "undefined") shopify.toast.show("Something went wrong. Try again.", { isError: true })
    }
  }

  function handleDiscard() {
    setForm(initialForm.current)
    setCategoryIds(initialForm.current.policyCategories.map(() => newCategoryRowId()))
    setCategoryFilter("")
    resetSidebarLinkRowIds(initialForm.current.sidebarLinks)
    setErrors({})
    setStatus("idle")
    if (typeof shopify !== "undefined") shopify.saveBar.hide(SAVE_BAR_ID)
  }

  // Two-step confirm (not window.confirm() — unreliable inside an embedded
  // iframe): first click arms the action, a second click within the window
  // actually runs it. Click anything else and it disarms itself.
  const [confirming, setConfirming] = useState<"defaults" | "full" | null>(null)
  const [resetting, setResetting] = useState(false)

  function handleResetToDefaults() {
    if (confirming !== "defaults") {
      setConfirming("defaults")
      return
    }
    setConfirming(null)
    const next = { ...DEFAULT_TENANT_FIELDS.branding, returnWindowDays: DEFAULT_TENANT_FIELDS.returnWindowDays }
    setForm(next)
    setCategoryIds(next.policyCategories.map(() => newCategoryRowId()))
    setCategoryFilter("")
    resetSidebarLinkRowIds(next.sidebarLinks)
    setErrors({})
    // Not saved yet — the save bar's own dirty-check (comparing against
    // initialForm.current) picks this up and shows Save/Discard as normal.
  }

  async function handleFullReset() {
    if (confirming !== "full") {
      setConfirming("full")
      return
    }
    setConfirming(null)
    setResetting(true)
    try {
      const res = await authedFetch("/api/app/reset", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || "Reset failed")
      const next: BrandingInput = { ...data.branding, returnWindowDays: data.returnWindowDays }
      initialForm.current = next
      setForm(next)
      setCategoryIds(next.policyCategories.map(() => newCategoryRowId()))
      setCategoryFilter("")
      resetSidebarLinkRowIds(next.sidebarLinks)
      setErrors({})
      setStatus("idle")
      if (typeof shopify !== "undefined") {
        shopify.saveBar.hide(SAVE_BAR_ID)
        shopify.toast.show("App data reset")
      }
    } catch {
      if (typeof shopify !== "undefined") shopify.toast.show("Reset failed. Try again.", { isError: true })
    } finally {
      setResetting(false)
    }
  }

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "branding", label: "Branding" },
    { id: "returns", label: "Returns policy" },
    { id: "navigation", label: "Navigation" },
    { id: "table", label: "Table & search" },
    { id: "danger", label: "Danger zone" },
  ]

  return (
    <s-page heading="Returns Settings" inlineSize="base">
      <ui-save-bar id={SAVE_BAR_ID}>
        <button
          {...({ variant: "primary", ...(status === "saving" ? { loading: "" } : {}) } as Record<string, unknown>)}
          onClick={handleSave}
        >
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </ui-save-bar>
      <s-section padding="none">
        <s-box padding="base" borderBlockEndWidth="base" borderColor="subdued">
          <s-stack direction="block" gap="small-300">
            <s-paragraph tone="subdued">Customize branding, returns policy, navigation, and table behavior for your customer returns portal.</s-paragraph>
            {/* s-tabs/s-tab-list/s-tab don't render correctly in this app's
                embedded runtime (see activeTab's own comment below) — this
                restyles the same manual button+state approach to look like
                real Polaris tabs (underline on the active one) instead of
                trying the broken component again. */}
            <div
              className="styled-scroll"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 20,
                borderBottom: "1px solid #e1e3e5",
                overflowX: "auto",
                overflowY: "hidden",
                overscrollBehaviorY: "none",
                WebkitOverflowScrolling: "touch",
                // Keep the tab strip one row tall — horizontal scroll only.
                maxHeight: 42,
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 0 10px 0",
                    fontFamily: "inherit",
                    fontSize: "0.8125rem",
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? "#1a1a1a" : "#6b6b6b",
                    borderBottom: activeTab === tab.id ? "2px solid #1a1a1a" : "2px solid transparent",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </s-stack>
        </s-box>
      </s-section>

      {activeTab === "branding" && (
        <s-section heading="Branding">
          <s-stack direction="block" gap="base">
            <s-paragraph color="subdued">
              Edit one area at a time. Changes stay in this form until you Save.
            </s-paragraph>
            <SettingsEditRow
              modalId="branding-identity-modal"
              title="Brand"
              description="Your brand name, logo, and colours on the customer portal."
              summary={
                <SettingsValueSummary
                  leading={
                    <>
                      {form.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={form.logoUrl}
                          src={form.logoUrl}
                          alt=""
                          style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 4, border: "1px solid #d1d5db" }}
                        />
                      ) : (
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: "1px dashed rgba(0,0,0,0.25)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <AccentSwatch color={form.accentColor} />
                    </>
                  }
                  parts={[form.name || "Untitled", form.supportEmail || null, hostFromUrl(form.storefrontUrl)]}
                />
              }
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Brand name"
                  name="name"
                  value={form.name}
                  placeholder="Your Store"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("name", e.target.value)}
                ></s-text-field>

                <s-stack direction="inline" gap="base" alignItems="center">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={form.logoUrl}
                      src={form.logoUrl}
                      alt=""
                      style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, border: "1px solid #d1d5db" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        setErrors((err) => ({ ...err, logoUrl: "This image URL didn't load. Try a different one." }))
                      }}
                    />
                  ) : null}
                  <s-button
                    onClick={() => handleChooseFromLibrary("logoUrl")}
                    disabled={loadingLibraryField === "logoUrl"}
                  >
                    {loadingLibraryField === "logoUrl" ? "Loading…" : "Browse Files for logo"}
                  </s-button>
                  {form.logoUrl ? (
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => {
                        set("logoUrl", "")
                        setErrors((err) => {
                          const next = { ...err }
                          delete next.logoUrl
                          return next
                        })
                      }}
                    >
                      Remove
                    </s-button>
                  ) : null}
                </s-stack>
                <s-url-field
                  label="Logo URL"
                  name="logoUrl"
                  value={form.logoUrl}
                  placeholder="Leave blank to show brand name as text"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("logoUrl", e.target.value)}
                ></s-url-field>
                <s-paragraph color="subdued">
                  No logo = brand name as text in the sidebar and header. Save after removing.
                </s-paragraph>
                {errors.logoUrl && <s-paragraph tone="critical">{errors.logoUrl}</s-paragraph>}

                <s-number-field
                  label="Logo height (px)"
                  name="logoHeight"
                  min={16}
                  max={64}
                  value={form.logoHeight}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    set("logoHeight", Number(e.target.value))
                  }
                ></s-number-field>
                <s-paragraph color="subdued">Sidebar and header logo size. Default is 32. Range 16–64.</s-paragraph>
                {errors.logoHeight && <s-paragraph tone="critical">{errors.logoHeight}</s-paragraph>}

                <s-color-field
                  label="Accent colour"
                  name="accentColor"
                  value={form.accentColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("accentColor", e.target.value)}
                ></s-color-field>
                {errors.accentColor && <s-paragraph tone="critical">{errors.accentColor}</s-paragraph>}

                <s-url-field
                  label="Store website"
                  name="storefrontUrl"
                  value={form.storefrontUrl}
                  placeholder="https://your-store.com"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("storefrontUrl", e.target.value)}
                ></s-url-field>
                {errors.storefrontUrl && <s-paragraph tone="critical">{errors.storefrontUrl}</s-paragraph>}

                <s-email-field
                  label="Support email"
                  name="supportEmail"
                  value={form.supportEmail}
                  placeholder="help@your-store.com"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("supportEmail", e.target.value)}
                ></s-email-field>
                {errors.supportEmail && <s-paragraph tone="critical">{errors.supportEmail}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="branding-lookup-modal"
              title="Find your order screen"
              description="How the Find your order screen looks when someone looks up a return."
              summary={[
                `Desktop ${form.guestLookupLayout === "split" ? "split" : "classic"}`,
                `Mobile ${form.guestLookupLayoutMobile === "split" ? "split" : "classic"}`,
                form.guestLookupSnakeBorder ? "Animated border" : null,
              ].filter(Boolean).join(" · ")}
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="large">
                <s-stack direction="block" gap="base">
                  <s-heading>Layout</s-heading>
                  <s-select
                    label="Desktop"
                    name="guestLookupLayout"
                    value={form.guestLookupLayout}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      set("guestLookupLayout", e.target.value as "classic" | "split")
                    }}
                  >
                    <s-option value="classic">Classic — form only</s-option>
                    <s-option value="split">Split — photo + form</s-option>
                  </s-select>
                  {errors.guestLookupLayout && <s-paragraph tone="critical">{errors.guestLookupLayout}</s-paragraph>}

                  <s-select
                    label="Mobile"
                    name="guestLookupLayoutMobile"
                    value={form.guestLookupLayoutMobile}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      set("guestLookupLayoutMobile", e.target.value as "classic" | "split")
                    }}
                  >
                    <s-option value="classic">Classic — form only</s-option>
                    <s-option value="split">Split — photo above form</s-option>
                  </s-select>
                  <s-paragraph color="subdued">
                    Mobile switches at about phone/tablet width. Use classic on mobile if the photo panel feels too tall.
                  </s-paragraph>
                  {errors.guestLookupLayoutMobile && (
                    <s-paragraph tone="critical">{errors.guestLookupLayoutMobile}</s-paragraph>
                  )}

                  <s-select
                    label="Page background"
                    name="guestBackgroundStyle"
                    value={form.guestBackgroundStyle}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      set("guestBackgroundStyle", e.target.value as "none" | "shapeGrid" | "dotField")
                    }
                  >
                    <s-option value="none">None</s-option>
                    <s-option value="shapeGrid">Shape grid</s-option>
                    <s-option value="dotField">Dot field</s-option>
                  </s-select>

                  <CheckboxWithHelp
                    label="Animated border around the card"
                    name="guestLookupSnakeBorder"
                    checked={form.guestLookupSnakeBorder}
                    onChange={(e) => set("guestLookupSnakeBorder", e.target.checked)}
                    help="A moving outline around the Find your order card."
                  />
                </s-stack>

                {(form.guestLookupLayout === "split" || form.guestLookupLayoutMobile === "split") && (
                  <>
                    <s-divider></s-divider>
                    <s-stack direction="block" gap="base">
                      <s-heading>Photo panel text</s-heading>
                      <s-paragraph color="subdued">
                        Leave both blank to hide the overlay copy. On mobile the photo/gradient band then shrinks to a short logo strip instead of a tall empty card.
                      </s-paragraph>
                      <s-text-field
                        label="Headline"
                        name="guestLookupHeadline"
                        value={form.guestLookupHeadline}
                        placeholder="Return your order with ease"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupHeadline", e.target.value)}
                      ></s-text-field>
                      {errors.guestLookupHeadline && <s-paragraph tone="critical">{errors.guestLookupHeadline}</s-paragraph>}
                      <s-text-field
                        label="Supporting line"
                        name="guestLookupSubtext"
                        value={form.guestLookupSubtext}
                        placeholder="Look up your order in seconds — no account needed."
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupSubtext", e.target.value)}
                      ></s-text-field>
                      {errors.guestLookupSubtext && <s-paragraph tone="critical">{errors.guestLookupSubtext}</s-paragraph>}
                    </s-stack>

                    <s-divider></s-divider>
                    <s-stack direction="block" gap="base">
                      <s-heading>Side panel</s-heading>
                      <s-select
                        label="Panel background"
                        name="guestLookupSideStyle"
                        value={form.guestLookupSideStyle}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          set("guestLookupSideStyle", e.target.value as "image" | "gradient")
                        }
                      >
                        <s-option value="image">Photo</s-option>
                        <s-option value="gradient">Colour gradient</s-option>
                      </s-select>
                      {errors.guestLookupSideStyle && <s-paragraph tone="critical">{errors.guestLookupSideStyle}</s-paragraph>}

                      {form.guestLookupSideStyle === "gradient" ? (
                        <>
                          <s-paragraph color="subdued">Presets</s-paragraph>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                              gap: 8,
                            }}
                          >
                            {GUEST_LOOKUP_GRADIENT_PRESETS.map((preset) => {
                              const selected =
                                matchGuestLookupGradientPreset(
                                  form.guestLookupGradientFrom,
                                  form.guestLookupGradientTo,
                                )?.id === preset.id
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  title={preset.label}
                                  aria-label={`Use ${preset.label} gradient`}
                                  aria-pressed={selected}
                                  onClick={() => {
                                    set("guestLookupGradientFrom", preset.from)
                                    set("guestLookupGradientTo", preset.to)
                                    setErrors((e) => {
                                      const { guestLookupGradientFrom: _a, guestLookupGradientTo: _b, ...rest } = e
                                      return rest
                                    })
                                  }}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "stretch",
                                    gap: 4,
                                    padding: 0,
                                    border: selected ? "2px solid #1a1a1a" : "1px solid #d1d5db",
                                    borderRadius: 8,
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    overflow: "hidden",
                                  }}
                                >
                                  <span
                                    aria-hidden
                                    style={{
                                      display: "block",
                                      height: 40,
                                      backgroundImage: `linear-gradient(145deg, ${preset.from} 0%, ${preset.to} 100%)`,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 10,
                                      lineHeight: 1.2,
                                      padding: "0 4px 6px",
                                      color: "#6b6b6b",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {preset.label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          <s-paragraph color="subdued">Or customise</s-paragraph>
                          <s-color-field
                            label="Gradient start"
                            name="guestLookupGradientFrom"
                            value={form.guestLookupGradientFrom}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("guestLookupGradientFrom", e.target.value)
                            }
                          ></s-color-field>
                          {errors.guestLookupGradientFrom && (
                            <s-paragraph tone="critical">{errors.guestLookupGradientFrom}</s-paragraph>
                          )}
                          <s-color-field
                            label="Gradient end"
                            name="guestLookupGradientTo"
                            value={form.guestLookupGradientTo}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("guestLookupGradientTo", e.target.value)
                            }
                          ></s-color-field>
                          {errors.guestLookupGradientTo && (
                            <s-paragraph tone="critical">{errors.guestLookupGradientTo}</s-paragraph>
                          )}
                        </>
                      ) : (
                        <>
                          <s-stack direction="inline" gap="base" alignItems="center">
                            {form.guestLookupHeroUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={form.guestLookupHeroUrl}
                                src={form.guestLookupHeroUrl}
                                alt=""
                                style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db" }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                  setErrors((err) => ({ ...err, guestLookupHeroUrl: "This image URL didn't load. Try a different one." }))
                                }}
                              />
                            ) : null}
                            <s-button
                              onClick={() => handleChooseFromLibrary("guestLookupHeroUrl")}
                              disabled={loadingLibraryField === "guestLookupHeroUrl"}
                            >
                              {loadingLibraryField === "guestLookupHeroUrl" ? "Loading…" : "Browse Files for photo"}
                            </s-button>
                            {form.guestLookupHeroUrl ? (
                              <s-button
                                variant="tertiary"
                                onClick={() => {
                                  set("guestLookupHeroUrl", "")
                                  setErrors((e) => {
                                    const { guestLookupHeroUrl: _, ...rest } = e
                                    return rest
                                  })
                                }}
                              >
                                Use default
                              </s-button>
                            ) : null}
                          </s-stack>
                          <s-url-field
                            label="Photo URL"
                            name="guestLookupHeroUrl"
                            value={form.guestLookupHeroUrl}
                            placeholder="Blank = default package image"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupHeroUrl", e.target.value)}
                          ></s-url-field>
                          {errors.guestLookupHeroUrl && <s-paragraph tone="critical">{errors.guestLookupHeroUrl}</s-paragraph>}
                          <s-number-field
                            label="Blur photo (0–24)"
                            name="guestLookupOverlayBlur"
                            min={0}
                            max={24}
                            value={form.guestLookupOverlayBlur}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              set("guestLookupOverlayBlur", Number(e.target.value))
                            }
                          ></s-number-field>
                          {errors.guestLookupOverlayBlur && (
                            <s-paragraph tone="critical">{errors.guestLookupOverlayBlur}</s-paragraph>
                          )}
                        </>
                      )}

                      <s-number-field
                        label="Darken panel (%)"
                        name="guestLookupOverlayOpacity"
                        min={0}
                        max={100}
                        value={form.guestLookupOverlayOpacity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          set("guestLookupOverlayOpacity", Number(e.target.value))
                        }
                      ></s-number-field>
                      {errors.guestLookupOverlayOpacity && (
                        <s-paragraph tone="critical">{errors.guestLookupOverlayOpacity}</s-paragraph>
                      )}
                    </s-stack>

                    <s-divider></s-divider>
                    <s-stack direction="block" gap="base">
                      <s-heading>Corner mark</s-heading>
                      <s-select
                        label="Top-left of photo"
                        name="guestLookupBrandDisplay"
                        value={form.guestLookupBrandDisplay}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          set("guestLookupBrandDisplay", e.target.value as "logo" | "text" | "none")
                        }
                      >
                        <s-option value="logo">Logo</s-option>
                        <s-option value="text">Brand name text</s-option>
                        <s-option value="none">Nothing</s-option>
                      </s-select>

                      {form.guestLookupBrandDisplay === "logo" && (
                        <>
                          <s-stack direction="inline" gap="base" alignItems="center">
                            {form.guestLookupLogoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={form.guestLookupLogoUrl}
                                src={form.guestLookupLogoUrl}
                                alt=""
                                style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, border: "1px solid #d1d5db" }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            ) : null}
                            <s-button
                              onClick={() => handleChooseFromLibrary("guestLookupLogoUrl")}
                              disabled={loadingLibraryField === "guestLookupLogoUrl"}
                            >
                              {loadingLibraryField === "guestLookupLogoUrl" ? "Loading…" : "Browse Files for corner logo"}
                            </s-button>
                            {form.guestLookupLogoUrl ? (
                              form.logoUrl ? (
                                <s-button variant="tertiary" onClick={() => set("guestLookupLogoUrl", "")}>
                                  Use store logo
                                </s-button>
                              ) : (
                                <s-button
                                  variant="tertiary"
                                  tone="critical"
                                  onClick={() => set("guestLookupLogoUrl", "")}
                                >
                                  Remove
                                </s-button>
                              )
                            ) : null}
                          </s-stack>
                          <s-url-field
                            label="Corner logo URL (optional)"
                            name="guestLookupLogoUrl"
                            value={form.guestLookupLogoUrl}
                            placeholder={form.logoUrl ? "Blank = store logo" : "Blank = brand name text"}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupLogoUrl", e.target.value)}
                          ></s-url-field>
                          {errors.guestLookupLogoUrl && <s-paragraph tone="critical">{errors.guestLookupLogoUrl}</s-paragraph>}
                        </>
                      )}
                    </s-stack>
                  </>
                )}
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="branding-portal-extras-modal"
              title="Messages & widgets"
              description="Where short success and error messages appear, and optional chat or help widgets on the portal."
              summary={`${({
                "top-left": "Toasts top-left",
                "top-center": "Toasts top-centre",
                "top-right": "Toasts top-right",
                "bottom-left": "Toasts bottom-left",
                "bottom-center": "Toasts bottom-centre",
                "bottom-right": "Toasts bottom-right",
              } as const)[form.toastPosition]}${form.portalCustomScript.trim() ? " · custom script on" : ""}`}
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-select
                  label="Where success / error messages appear"
                  name="toastPosition"
                  value={form.toastPosition}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    set("toastPosition", e.target.value as BrandingInput["toastPosition"])
                  }
                >
                  <s-option value="top-left">Top left</s-option>
                  <s-option value="top-center">Top centre</s-option>
                  <s-option value="top-right">Top right</s-option>
                  <s-option value="bottom-left">Bottom left</s-option>
                  <s-option value="bottom-center">Bottom centre</s-option>
                  <s-option value="bottom-right">Bottom right</s-option>
                </s-select>
                {errors.toastPosition && <s-paragraph tone="critical">{errors.toastPosition}</s-paragraph>}

                <s-divider></s-divider>
                <s-text-area
                  label="Custom HTML / script (optional)"
                  name="portalCustomScript"
                  value={form.portalCustomScript}
                  rows={6}
                  maxLength={20000}
                  placeholder={"<!-- e.g. HelpCrunch / chat widget snippet -->"}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("portalCustomScript", e.target.value)}
                ></s-text-area>
                <s-paragraph tone="subdued">
                  Injected on the customer portal only. Use for chat widgets and similar tools. Only add scripts you trust.
                </s-paragraph>
                {errors.portalCustomScript && <s-paragraph tone="critical">{errors.portalCustomScript}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
          </s-stack>
        </s-section>
      )}

      {activeTab === "returns" && (
        <s-section heading="Returns">
          <s-stack direction="block" gap="base">
            <s-paragraph color="subdued">
              Edit one area at a time. Changes stay in this form until you Save.
            </s-paragraph>
            <SettingsEditRow
              modalId="returns-window-modal"
              title="Return window"
              description="How long customers have to return, and the steps they must complete before submitting."
              summary={`${form.returnWindowDays} days · Policy acceptance ${form.requirePolicyAcceptance ? "on" : "off"} · Review step ${form.returnReviewEnabled ? "on" : "off"}`}
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-number-field
                  label="Return window (days)"
                  name="returnWindowDays"
                  min={1}
                  max={365}
                  value={form.returnWindowDays}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("returnWindowDays", Number(e.target.value))}
                ></s-number-field>
                {errors.returnWindowDays && <s-paragraph tone="critical">{errors.returnWindowDays}</s-paragraph>}

                <s-stack direction="block" gap="small-200">
                  <CheckboxWithHelp
                    label="Require customers to accept the returns policy before selecting items"
                    name="requirePolicyAcceptance"
                    checked={form.requirePolicyAcceptance}
                    onChange={(e) => set("requirePolicyAcceptance", e.target.checked)}
                  />
                  <CheckboxWithHelp
                    label="Show a Review return step before customers submit"
                    name="returnReviewEnabled"
                    checked={form.returnReviewEnabled}
                    onChange={(e) => set("returnReviewEnabled", e.target.checked)}
                    help="When off, the primary button submits immediately (Submit return) instead of opening a review screen."
                  />
                </s-stack>
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="returns-lookup-audience-modal"
              title="Who can look up orders"
              description="Who can look up an order, and what logged-in customers must enter."
              summary={
                !form.guestLookupEnabled
                  ? "Guests must log in"
                  : form.alwaysShowGuestLookup
                    ? `Guest lookup on · everyone starts on Find your order${form.loggedInLookupRequirePostcode ? " · postcode required when logged in" : ""}`
                    : "Guest lookup on · logged-in customers see their orders"
              }
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="small-200">
                <CheckboxWithHelp
                  label="Allow guests to look up an order without logging in"
                  name="guestLookupEnabled"
                  checked={form.guestLookupEnabled}
                  onChange={(e) => set("guestLookupEnabled", e.target.checked)}
                  help="Off = visitors who aren't logged into your store are sent to Shopify login instead of the Find your order form."
                />
                {errors.guestLookupEnabled && <s-paragraph tone="critical">{errors.guestLookupEnabled}</s-paragraph>}

                <s-divider></s-divider>

                <CheckboxWithHelp
                  label="Always show the order lookup form, even for logged-in customers"
                  name="alwaysShowGuestLookup"
                  checked={form.alwaysShowGuestLookup}
                  onChange={(e) => set("alwaysShowGuestLookup", e.target.checked)}
                  help="Off = logged-in customers see their full order list. On = everyone starts on Find your order (layout & photo are under Branding)."
                />
                {errors.alwaysShowGuestLookup && <s-paragraph tone="critical">{errors.alwaysShowGuestLookup}</s-paragraph>}

                <CheckboxWithHelp
                  label="Require delivery postcode for logged-in customers on the lookup form"
                  name="loggedInLookupRequirePostcode"
                  checked={form.loggedInLookupRequirePostcode}
                  disabled={!form.alwaysShowGuestLookup}
                  onChange={(e) => set("loggedInLookupRequirePostcode", e.target.checked)}
                  help='Only applies when “Always show the order lookup form” is on. Off = logged-in customers enter order number and email only. On = they must also enter the delivery postcode (same as guests).'
                />
                {errors.loggedInLookupRequirePostcode && <s-paragraph tone="critical">{errors.loggedInLookupRequirePostcode}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="returns-policy-modal"
              title="Returns policy"
              description="How customers review your returns policy before selecting items to return."
              summary={
                form.policyPresentation === "externalLink"
                  ? `External link · ${hostFromUrl(form.policyExternalUrl) || form.policyExternalUrl || "URL required"}`
                  : `${form.policyHeading || "Untitled"} · ${form.policyBodyMode === "text" ? "Free text" : `${form.policyCategories.length} categor${form.policyCategories.length === 1 ? "y" : "ies"}`}`
              }
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-paragraph tone="subdued">How customers review your policy before they can select items to return.</s-paragraph>

                <s-select
                  label="Policy experience"
                  name="policyPresentation"
                  value={form.policyPresentation}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    set("policyPresentation", e.target.value as "dialog" | "externalLink")
                  }
                >
                  <s-option value="dialog">In-app dialog (recommended)</s-option>
                  <s-option value="externalLink">Link to an external policy page</s-option>
                </s-select>
                {errors.policyPresentation && <s-paragraph tone="critical">{errors.policyPresentation}</s-paragraph>}

                {form.policyPresentation === "externalLink" ? (
                  <>
                    <s-url-field
                      label="Policy page URL"
                      name="policyExternalUrl"
                      value={form.policyExternalUrl}
                      placeholder="https://your-store.com/pages/returns-policy"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyExternalUrl", e.target.value)}
                    ></s-url-field>
                    {errors.policyExternalUrl && <s-paragraph tone="critical">{errors.policyExternalUrl}</s-paragraph>}
                    <s-text-field
                      label="Review button text"
                      name="policyReviewButtonLabel"
                      value={form.policyReviewButtonLabel}
                      placeholder="Read policy"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyReviewButtonLabel", e.target.value)}
                    ></s-text-field>
                    {errors.policyReviewButtonLabel && <s-paragraph tone="critical">{errors.policyReviewButtonLabel}</s-paragraph>}
                    <s-text-field
                      label="Policy banner text"
                      name="policySubheading"
                      value={form.policySubheading}
                      placeholder="Review our returns policy before selecting items to return."
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policySubheading", e.target.value)}
                    ></s-text-field>
                    {errors.policySubheading && <s-paragraph tone="critical">{errors.policySubheading}</s-paragraph>}
                    <s-paragraph tone="subdued">
                      Shown next to the button on the order page. The button opens your policy URL in a new tab and stays visible — it does not hide after click.
                    </s-paragraph>
                  </>
                ) : null}

                {form.policyPresentation === "dialog" && (
                  <>
                    <s-text-field
                      label="Review button text"
                      name="policyReviewButtonLabel"
                      value={form.policyReviewButtonLabel}
                      placeholder="Review & Accept"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyReviewButtonLabel", e.target.value)}
                    ></s-text-field>
                    {errors.policyReviewButtonLabel && <s-paragraph tone="critical">{errors.policyReviewButtonLabel}</s-paragraph>}

                    <s-text-field
                      label="Policy dialog heading"
                      name="policyHeading"
                      value={form.policyHeading}
                      placeholder="iBlaze Returns Policy"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyHeading", e.target.value)}
                    ></s-text-field>
                    {errors.policyHeading && <s-paragraph tone="critical">{errors.policyHeading}</s-paragraph>}

                    <s-text-field
                      label="Policy banner / dialog intro"
                      name="policySubheading"
                      value={form.policySubheading}
                      placeholder="Review our returns policy before selecting items to return."
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policySubheading", e.target.value)}
                    ></s-text-field>
                    <s-paragraph tone="subdued">
                      Shown on the order page next to the review button, and again as the intro inside the policy dialog.
                    </s-paragraph>
                    {errors.policySubheading && <s-paragraph tone="critical">{errors.policySubheading}</s-paragraph>}

                    <s-text-field
                      label="Last updated"
                      name="policyLastUpdated"
                      value={form.policyLastUpdated}
                      placeholder="14 July 2026"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyLastUpdated", e.target.value)}
                    ></s-text-field>
                    <s-paragraph tone="subdued">Shown under the dialog intro. Leave blank to hide it. Free text — you control the date format.</s-paragraph>
                    {errors.policyLastUpdated && <s-paragraph tone="critical">{errors.policyLastUpdated}</s-paragraph>}

                    <s-stack direction="inline" gap="small-300">
                      <s-button
                        variant={form.policyBodyMode === "categories" ? "primary" : "secondary"}
                        onClick={() => set("policyBodyMode", "categories")}
                      >
                        Category list
                      </s-button>
                      <s-button
                        variant={form.policyBodyMode === "text" ? "primary" : "secondary"}
                        onClick={() => set("policyBodyMode", "text")}
                      >
                        Free text
                      </s-button>
                    </s-stack>

                    {form.policyBodyMode === "categories" ? (
                      <PolicyCategoriesTable
                        categories={form.policyCategories}
                        categoryIds={categoryIds}
                        filter={categoryFilter}
                        onFilterChange={setCategoryFilter}
                        onUpdate={updateCategory}
                        onAdd={addCategory}
                        onRemove={removeCategory}
                        onReorder={reorderCategories}
                        error={errors.policyCategories}
                      />
                    ) : (
                      <>
                        <s-text color="subdued">Policy body text</s-text>
                        <RichTextEditor
                          value={form.policyBodyText}
                          onChange={(value) => set("policyBodyText", value)}
                          placeholder="Write your full returns policy here instead of using category cards."
                        />
                        {errors.policyBodyText && <s-paragraph tone="critical">{errors.policyBodyText}</s-paragraph>}
                      </>
                    )}

                    <CheckboxWithHelp
                      label="Show the footer note"
                      name="policyFooterNoteEnabled"
                      checked={form.policyFooterNoteEnabled}
                      onChange={(e) => set("policyFooterNoteEnabled", e.target.checked)}
                    />
                    <s-text-area
                      label="Footer note"
                      name="policyFooterNote"
                      value={form.policyFooterNote}
                      maxLength={300}
                      rows={2}
                      disabled={!form.policyFooterNoteEnabled}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("policyFooterNote", e.target.value)}
                    ></s-text-area>
                    {errors.policyFooterNote && <s-paragraph tone="critical">{errors.policyFooterNote}</s-paragraph>}
                  </>
                )}
              </s-stack>
            </SettingsEditRow>

            <SettingsEditRow
              modalId="returns-confirm-modal"
              title="Confirmation messages"
              description="Short confirmation messages after a customer accepts or declines the in-app policy."
              summary={`“${(form.policyAcceptedMessage || "Policy accepted").slice(0, 40)}” · “${(form.policyDeclinedMessage || "Policy declined").slice(0, 40)}”`}
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Accepted message"
                  name="policyAcceptedMessage"
                  value={form.policyAcceptedMessage}
                  placeholder="Policy accepted"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyAcceptedMessage", e.target.value)}
                ></s-text-field>
                {errors.policyAcceptedMessage && <s-paragraph tone="critical">{errors.policyAcceptedMessage}</s-paragraph>}
                <s-text-field
                  label="Declined message"
                  name="policyDeclinedMessage"
                  value={form.policyDeclinedMessage}
                  placeholder="Policy declined"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyDeclinedMessage", e.target.value)}
                ></s-text-field>
                {errors.policyDeclinedMessage && <s-paragraph tone="critical">{errors.policyDeclinedMessage}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
          </s-stack>
        </s-section>
      )}


      {activeTab === "navigation" && (
        <s-section heading="Navigation">
          <s-stack direction="block" gap="base">
            <s-paragraph color="subdued">
              Edit one area at a time. Changes stay in this form until you Save.
            </s-paragraph>
            <SettingsEditRow
              modalId="nav-sidebar-layout-modal"
              title="Sidebar layout"
              description="Whether the portal shows a sidebar, and how it looks when it does."
              summary={
                !form.sidebarEnabled
                  ? "Sidebar off everywhere"
                  : [
                      form.defaultSidebarLayout === "inset" ? "Inset" : "Sidebar",
                      form.lookupSidebarEnabled ? null : "hidden on Find your order",
                      form.sidebarLayoutSwitcherEnabled ? "switcher on" : null,
                      form.sidebarDefaultOpenOnDesktop ? "starts open" : null,
                    ].filter(Boolean).join(" · ")
              }
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="small-200">
                <CheckboxWithHelp
                  label="Show the sidebar on the customer portal"
                  name="sidebarEnabled"
                  checked={form.sidebarEnabled}
                  onChange={(e) => set("sidebarEnabled", e.target.checked)}
                  help="When off, the sidebar is removed everywhere and the main content uses the full width."
                />
                <CheckboxWithHelp
                  label="Show the sidebar on the Find your order screen"
                  name="lookupSidebarEnabled"
                  checked={form.lookupSidebarEnabled}
                  disabled={!form.sidebarEnabled}
                  onChange={(e) => set("lookupSidebarEnabled", e.target.checked)}
                  help="When off, Find your order has no sidebar — the content expands to fill that space. Only applies when the portal sidebar is on."
                />

                <s-divider></s-divider>

                <s-checkbox
                  label="Let customers switch between sidebar and inset layouts"
                  name="sidebarLayoutSwitcherEnabled"
                  checked={form.sidebarLayoutSwitcherEnabled}
                  disabled={!form.sidebarEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarLayoutSwitcherEnabled", e.target.checked)}
                ></s-checkbox>
                <s-select
                  label={form.sidebarLayoutSwitcherEnabled ? "Default layout" : "Layout (fixed — switcher is off)"}
                  name="defaultSidebarLayout"
                  value={form.defaultSidebarLayout}
                  disabled={!form.sidebarEnabled}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("defaultSidebarLayout", e.target.value as "inset" | "sidebar")}
                >
                  <s-option value="inset">Inset</s-option>
                  <s-option value="sidebar">Sidebar</s-option>
                </s-select>
                <s-checkbox
                  label="Sidebar starts open on desktop"
                  name="sidebarDefaultOpenOnDesktop"
                  checked={form.sidebarDefaultOpenOnDesktop}
                  disabled={!form.sidebarEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarDefaultOpenOnDesktop", e.target.checked)}
                ></s-checkbox>
                <s-checkbox
                  label="Show the customer avatar in the sidebar footer"
                  name="sidebarAvatarEnabled"
                  checked={form.sidebarAvatarEnabled}
                  disabled={!form.sidebarEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarAvatarEnabled", e.target.checked)}
                ></s-checkbox>
                <s-paragraph color="subdued">
                  Applies on Find your order and the main portal whenever the sidebar is shown.
                </s-paragraph>
              </s-stack>
            </SettingsEditRow>

            <SettingsEditRow
              modalId="nav-sidebar-links-modal"
              title="Sidebar links"
              description="Links and an optional note in the portal sidebar."
              summary={`${form.sidebarLinks.length} link${form.sidebarLinks.length === 1 ? "" : "s"}${form.sidebarNote ? " · note set" : ""}`}
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <SidebarLinksTable
                  links={form.sidebarLinks}
                  linkIds={sidebarLinkIds}
                  subLinkIds={sidebarSubLinkIds}
                  filter={sidebarLinkFilter}
                  onFilterChange={setSidebarLinkFilter}
                  iconNames={SIDEBAR_ICON_NAMES}
                  onUpdate={updateSidebarLink}
                  onAdd={addSidebarLink}
                  onRemove={removeSidebarLink}
                  onReorder={reorderSidebarLinks}
                  onAddSub={addSubLink}
                  onUpdateSub={updateSubLink}
                  onRemoveSub={removeSubLink}
                  onReorderSub={reorderSubLinks}
                  error={errors.sidebarLinks}
                />

                <s-checkbox
                  label="Expand sub-links by default (uncheck to start collapsed until clicked)"
                  name="sidebarSubmenusExpandedByDefault"
                  checked={form.sidebarSubmenusExpandedByDefault}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarSubmenusExpandedByDefault", e.target.checked)}
                ></s-checkbox>

                <s-text-area
                  label="Sidebar note"
                  name="sidebarNote"
                  value={form.sidebarNote}
                  maxLength={500}
                  rows={3}
                  placeholder="A short announcement instead of (or alongside) links. Wrap text in **double asterisks** for bold."
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("sidebarNote", e.target.value)}
                ></s-text-area>
                {errors.sidebarNote && <s-paragraph tone="critical">{errors.sidebarNote}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="nav-header-links-modal"
              title="Header"
              description="Links and the account menu in the portal top bar."
              summary={[
                form.storeLinkEnabled ? form.storeLinkLabel || "Store link" : null,
                form.orderStatusLinkEnabled ? form.orderStatusLinkLabel || "Order status" : null,
                form.headerAvatarEnabled ? "Account menu" : null,
              ].filter(Boolean).join(" · ") || "Header links hidden"}
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-stack direction="block" gap="small-200">
                  <s-checkbox
                    label="Show Store link in the top bar"
                    name="storeLinkEnabled"
                    checked={form.storeLinkEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("storeLinkEnabled", e.target.checked)}
                  ></s-checkbox>
                  <s-text-field
                    label="Store link label"
                    name="storeLinkLabel"
                    value={form.storeLinkLabel}
                    placeholder="Store"
                    disabled={!form.storeLinkEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("storeLinkLabel", e.target.value)}
                  ></s-text-field>
                  {errors.storeLinkLabel && <s-paragraph tone="critical">{errors.storeLinkLabel}</s-paragraph>}
                </s-stack>

                <s-divider></s-divider>

                <s-stack direction="block" gap="small-200">
                  <s-checkbox
                    label="Show an order status link in the header (when an order is open)"
                    name="orderStatusLinkEnabled"
                    checked={form.orderStatusLinkEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("orderStatusLinkEnabled", e.target.checked)}
                  ></s-checkbox>
                  <s-text-field
                    label="Order status link label"
                    name="orderStatusLinkLabel"
                    value={form.orderStatusLinkLabel}
                    placeholder="Order Status"
                    disabled={!form.orderStatusLinkEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("orderStatusLinkLabel", e.target.value)}
                  ></s-text-field>
                  {errors.orderStatusLinkLabel && <s-paragraph tone="critical">{errors.orderStatusLinkLabel}</s-paragraph>}
                </s-stack>

                <s-divider></s-divider>
                <CheckboxWithHelp
                  label="Show customer account menu in the top bar"
                  name="headerAvatarEnabled"
                  checked={form.headerAvatarEnabled}
                  onChange={(e) => set("headerAvatarEnabled", e.target.checked)}
                  help="The avatar / account menu on the right of the header when someone is signed in."
                />
              </s-stack>
            </SettingsEditRow>
          </s-stack>
        </s-section>
      )}

      {activeTab === "table" && (
        <s-section heading="Table & status">
          <s-stack direction="block" gap="base">
            <s-paragraph color="subdued">
              Edit one area at a time. Changes stay in this form until you Save.
            </s-paragraph>
            <SettingsEditRow
              modalId="table-header-search-modal"
              title="Order search"
              description="Whether customers can search their orders from the top bar."
              summary={
                form.headerSearchEnabled
                  ? `On · “${form.headerSearchPlaceholder || "Search orders..."}”`
                  : "Off"
              }
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-checkbox
                  label="Show order search in the top bar"
                  name="headerSearchEnabled"
                  checked={form.headerSearchEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headerSearchEnabled", e.target.checked)}
                ></s-checkbox>
                <s-text-field
                  label="Grey hint text inside the search box"
                  name="headerSearchPlaceholder"
                  value={form.headerSearchPlaceholder}
                  placeholder="Search orders..."
                  disabled={!form.headerSearchEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headerSearchPlaceholder", e.target.value)}
                ></s-text-field>
                {errors.headerSearchPlaceholder && <s-paragraph tone="critical">{errors.headerSearchPlaceholder}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="table-order-items-modal"
              title="Order detail"
              description="How products and tools appear when a customer opens an order."
              summary={`${form.defaultOrderView === "grid" ? "Grid cards" : "List rows"} · ${[
                form.tableSearchEnabled && "product search",
                form.tablePageSizeEnabled && "rows per page",
                form.shipmentCardsEnabled && "shipments",
              ].filter(Boolean).join(" · ") || "simple layout"}`}
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-stack direction="block" gap="small-200">
                  <s-checkbox
                    label="Show search box to find a product or variant in the order"
                    name="tableSearchEnabled"
                    checked={form.tableSearchEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableSearchEnabled", e.target.checked)}
                  ></s-checkbox>
                  <s-text-field
                    label="Hint text inside the product search box"
                    name="tableSearchPlaceholder"
                    value={form.tableSearchPlaceholder}
                    placeholder="Search product or variant..."
                    disabled={!form.tableSearchEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableSearchPlaceholder", e.target.value)}
                  ></s-text-field>
                  {errors.tableSearchPlaceholder && <s-paragraph tone="critical">{errors.tableSearchPlaceholder}</s-paragraph>}
                </s-stack>

                <s-stack direction="block" gap="small-200">
                  <s-checkbox
                    label="Show a Filter button for items that can’t be returned"
                    name="tableFilterButtonEnabled"
                    checked={form.tableFilterButtonEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableFilterButtonEnabled", e.target.checked)}
                  ></s-checkbox>
                  <s-checkbox
                    label="Show Eligible / Ineligible tabs on the order"
                    name="statusFilterEnabled"
                    checked={form.statusFilterEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("statusFilterEnabled", e.target.checked)}
                  ></s-checkbox>
                </s-stack>

                <s-text-field
                  label="Name for the ‘can be returned’ tab"
                  name="eligibleLabel"
                  value={form.eligibleLabel}
                  placeholder="Eligible"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("eligibleLabel", e.target.value)}
                ></s-text-field>
                {errors.eligibleLabel && <s-paragraph tone="critical">{errors.eligibleLabel}</s-paragraph>}
                <s-text-field
                  label="Name for the ‘can’t be returned’ tab"
                  name="ineligibleLabel"
                  value={form.ineligibleLabel}
                  placeholder="Ineligible"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("ineligibleLabel", e.target.value)}
                ></s-text-field>
                {errors.ineligibleLabel && <s-paragraph tone="critical">{errors.ineligibleLabel}</s-paragraph>}
                <s-checkbox
                  label={'Show the "These items can’t be selected here" message on the can’t-return tab'}
                  name="ineligibleMessageEnabled"
                  checked={form.ineligibleMessageEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("ineligibleMessageEnabled", e.target.checked)}
                ></s-checkbox>
                <s-select
                  label="How the My Orders list looks by default"
                  name="defaultOrderView"
                  value={form.defaultOrderView}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("defaultOrderView", e.target.value as "list" | "grid")}
                >
                  <s-option value="grid">Grid of order cards</s-option>
                  <s-option value="list">Simple list of rows</s-option>
                </s-select>

                <s-stack direction="block" gap="small-200">
                  <s-checkbox
                    label="Show a Columns button so customers can hide/show table columns"
                    name="tableColumnsButtonEnabled"
                    checked={form.tableColumnsButtonEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableColumnsButtonEnabled", e.target.checked)}
                  ></s-checkbox>
                  <CheckboxWithHelp
                    label="Show rows-per-page control (Show 10 / 25 / 50)"
                    name="tablePageSizeEnabled"
                    checked={form.tablePageSizeEnabled}
                    onChange={(e) => set("tablePageSizeEnabled", e.target.checked)}
                    help="When on, customers can choose how many product rows appear on each page of the order item table."
                  />
                  <s-checkbox
                    label="Show shipment tracking cards above the item list"
                    name="shipmentCardsEnabled"
                    checked={form.shipmentCardsEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("shipmentCardsEnabled", e.target.checked)}
                  ></s-checkbox>
                  <s-checkbox
                    label="Make product images link to the storefront product page"
                    name="productImageLinksEnabled"
                    checked={form.productImageLinksEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("productImageLinksEnabled", e.target.checked)}
                  ></s-checkbox>
                </s-stack>
              </s-stack>
            </SettingsEditRow>
            <SettingsEditRow
              modalId="table-return-status-modal"
              title="Return status"
              description="How each return stage looks and what sentence customers see."
              summary={`${RETURN_STATUS_CARDS.length} return stages`}
              modalSize="large-100"
              errors={errors}
            >
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                The label, mobile heading, icon, and color shown for each stage of a return. Use {"{days}"} for the
                return window length.
              </s-text>
              {RETURN_STATUS_CARDS.map(({ key, name }) => {
                  const isOpen = openStatusKey === key
                  const style = form.returnLifecycleStyles[key]
                  return (
                    <s-box key={key} padding="base" border="base" borderRadius="base">
                      <s-stack direction="block" gap="small">
                        <s-stack direction="inline" gap="small-300" alignItems="center">
                          <s-button onClick={() => toggleStatusOpen(key)}>{isOpen ? "Collapse" : "Expand"}</s-button>
                          <s-text>{name} — "{style.label}"</s-text>
                        </s-stack>
                        {isOpen && (
                          <>
                            <s-text-field
                              label="Filter/badge label"
                              value={style.label}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "label", e.target.value)}
                            ></s-text-field>
                            <s-text-field
                              label="Mobile accordion heading"
                              value={style.heading}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "heading", e.target.value)}
                            ></s-text-field>
                            <s-select
                              label="Icon"
                              value={style.icon}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusStyle(key, "icon", e.target.value)}
                            >
                              {STATUS_ICON_NAMES.map((iconName) => (
                                <s-option key={iconName} value={iconName}>{iconName}</s-option>
                              ))}
                            </s-select>
                            <s-text-field
                              label="Color (optional — leave blank for the portal's default color)"
                              value={style.color}
                              placeholder="#4F46E5"
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusStyle(key, "color", e.target.value)}
                            ></s-text-field>
                            {key === "returnRequested" && (
                              <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnRequested} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnRequested", e.target.value)}></s-text-area>
                            )}
                            {key === "returnInProgress" && (
                              <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnInProgress} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnInProgress", e.target.value)}></s-text-area>
                            )}
                            {key === "returnDeclined" && (
                              <s-paragraph tone="subdued">
                                This status shows the actual decline reason from Shopify, verbatim — not a fixed
                                sentence, so there's no message to edit here.
                              </s-paragraph>
                            )}
                            {key === "returnCanceled" && (
                              <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnCanceled} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnCanceled", e.target.value)}></s-text-area>
                            )}
                            {key === "returnCompleted" && (
                              <s-text-area label="Sentence" value={form.returnLifecycleMessages.returnCompleted} rows={2}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("returnCompleted", e.target.value)}></s-text-area>
                            )}
                            {key === "awaitingDelivery" && (
                              <s-paragraph tone="subdued">
                                This status covers several shipping stages (not shipped, on its way, out for delivery,
                                attempted delivery) — edit each stage&apos;s sentence in &quot;Awaiting delivery&quot; below.
                              </s-paragraph>
                            )}
                            {key === "returnWindowClosed" && (
                              <s-paragraph tone="subdued">
                                This status covers several reasons (outside the return window, final sale, or other) —
                                edit each reason&apos;s sentence in &quot;Return window closed&quot; below.
                              </s-paragraph>
                            )}
                          </>
                        )}
                      </s-stack>
                    </s-box>
                  )
                })}
                {errors.returnLifecycleMessages && <s-paragraph tone="critical">{errors.returnLifecycleMessages}</s-paragraph>}
                {errors.returnLifecycleStyles && <s-paragraph tone="critical">{errors.returnLifecycleStyles}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>

            <SettingsEditRow
              modalId="table-awaiting-delivery-modal"
              title="Awaiting delivery"
              description="Messages shown while an item is still shipping and hasn't been delivered yet."
              summary="Not shipped · on its way · out for delivery · attempted"
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-text color="subdued">
                  The specific sentence shown under the "Awaiting delivery" badge, depending on the shipment's stage.
                </s-text>
                <s-text-area label="Not yet shipped" value={form.returnLifecycleMessages.shippingConfirmed} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingConfirmed", e.target.value)}></s-text-area>
                <s-text-area label="On its way" value={form.returnLifecycleMessages.shippingOnItsWay} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOnItsWay", e.target.value)}></s-text-area>
                <s-text-area label="Out for delivery" value={form.returnLifecycleMessages.shippingOutForDelivery} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOutForDelivery", e.target.value)}></s-text-area>
                <s-text-area label="Attempted delivery" value={form.returnLifecycleMessages.shippingAttemptedDelivery} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingAttemptedDelivery", e.target.value)}></s-text-area>
              </s-stack>
            </SettingsEditRow>

            <SettingsEditRow
              modalId="table-return-window-closed-modal"
              title="Return window closed"
              description="Messages when an item's return window has permanently passed."
              summary="Window expired · final sale · other"
              modalSize="large-100"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-text color="subdued">
                  The specific sentence shown under the "Return window closed" badge, depending on why the item can't
                  be returned.
                </s-text>
                <s-text-area label="Outside the return window (with a closed date)" value={form.returnLifecycleMessages.outsideWindow} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindow", e.target.value)}></s-text-area>
                <s-text-area label="Outside the return window (no closed date available)" value={form.returnLifecycleMessages.outsideWindowNoDate} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindowNoDate", e.target.value)}></s-text-area>
                <s-text-area label="Final sale" value={form.returnLifecycleMessages.finalSale} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("finalSale", e.target.value)}></s-text-area>
                <s-text-area label="Other" value={form.returnLifecycleMessages.otherNotReturnable} rows={2}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("otherNotReturnable", e.target.value)}></s-text-area>
              </s-stack>
            </SettingsEditRow>

            <SettingsEditRow
              modalId="table-refund-modal"
              title="Refund labels"
              description="Labels next to items that are partly or fully refunded."
              summary={`“${form.refundStatusLabels.partiallyRefunded || "Partially refunded"}” · “${form.refundStatusLabels.refunded || "Refunded"}”`}
              modalSize="large"
              errors={errors}
            >
              <s-stack direction="block" gap="base">
                <s-text color="subdued">
                  Shown as a small extra fact next to the return status, when applicable. No label is shown when
                  nothing has been refunded.
                </s-text>
                <s-text-field label="Partially refunded" value={form.refundStatusLabels.partiallyRefunded}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundStatusLabel("partiallyRefunded", e.target.value)}></s-text-field>
                <s-text-field label="Refunded" value={form.refundStatusLabels.refunded}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundStatusLabel("refunded", e.target.value)}></s-text-field>
                {errors.refundStatusLabels && <s-paragraph tone="critical">{errors.refundStatusLabels}</s-paragraph>}
              </s-stack>
            </SettingsEditRow>
          </s-stack>
        </s-section>
      )}

      {activeTab === "danger" && (
        <>
          <s-section heading="Reset to defaults">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-stack direction="block" gap="small-100">
                <s-text color="subdued">Clears every field on this form back to its default value. Nothing is saved until you click Save.</s-text>
              </s-stack>
              <s-button tone="critical" onClick={handleResetToDefaults}>
                {confirming === "defaults" ? "Click again to confirm" : "Reset to defaults"}
              </s-button>
            </s-stack>
          </s-section>

          <s-section heading="Reset all app data">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-stack direction="block" gap="small-100">
                <s-text color="subdued">Wipes every Dashboard stat (orders, returns, refund value) and resets these settings to defaults immediately — as if the app were freshly installed. This can't be undone.</s-text>
              </s-stack>
              <s-button tone="critical" onClick={handleFullReset} disabled={resetting}>
                {resetting ? "Resetting…" : confirming === "full" ? "Click again to confirm" : "Reset all app data"}
              </s-button>
            </s-stack>
          </s-section>
        </>
      )}
    </s-page>
  )
}
