"use client"

import { useEffect, useRef, useState } from "react"
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput, type SidebarSubLinkInput, type ReturnLifecycleMessagesInput, type ReturnLifecycleStatusInput, type ReturnLifecycleStyleInput } from "@/lib/branding-validation"
import type { TenantBranding } from "@/lib/tenant"
import { SIDEBAR_ICON_NAMES } from "@/lib/sidebar-icons"
import { STATUS_ICON_NAMES } from "@/lib/status-icons"
import { RichTextEditor } from "@/components/app-settings/rich-text-editor"
import { DEFAULT_TENANT_FIELDS } from "@/lib/tenant-defaults"
import { migrateMarkdownIfNeeded } from "@/lib/markdown-to-html"

/** RETURN_STATUS_CARDS drives the "Return status" section (6 cards, each with
 * label/heading/icon/color, plus a per-status sentence for returnRequested,
 * returnInProgress, returnCanceled, and returnCompleted). returnDeclined has no
 * sentence field here since its text comes from the real Shopify decline reason,
 * not a static template. notReturnable's sentences live in a separate "Not
 * returnable reasons" section below (not per-card) since multiple reasons
 * (final sale, outside window, not yet delivered) can apply under that one status.
 */
const RETURN_STATUS_CARDS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "notReturnable", name: "Not returnable" },
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
    "name", "logoUrl", "accentColor", "storefrontUrl", "supportEmail", "guestBackgroundStyle",
    "guestLookupLayout", "guestLookupHeadline", "guestLookupSubtext", "guestLookupHeroUrl",
    "guestLookupBrandDisplay", "guestLookupLogoUrl",
  ],
  returns: [
    "returnWindowDays", "requirePolicyAcceptance", "alwaysShowGuestLookup",
    "policyHeading", "policySubheading", "policyLastUpdated", "policyBodyMode", "policyCategories", "policyBodyText",
    "policyFooterNoteEnabled", "policyFooterNote", "policyAcceptedMessage", "policyDeclinedMessage",
  ],
  navigation: [
    "storeLinkEnabled", "storeLinkLabel", "orderStatusLinkEnabled", "orderStatusLinkLabel",
    "sidebarLinks", "sidebarNote", "sidebarSubmenusExpandedByDefault", "sidebarLayoutSwitcherEnabled", "defaultSidebarLayout",
  ],
  table: [
    "headerSearchEnabled", "headerSearchPlaceholder", "tableSearchEnabled", "tableSearchPlaceholder",
    "tableColumnsButtonEnabled", "tableFilterButtonEnabled", "tablePageSizeEnabled", "shipmentCardsEnabled",
    "productImageLinksEnabled", "returnLifecycleMessages", "returnLifecycleStyles", "refundStatusLabels",
  ],
  // No fields of its own — Reset actions act on the whole form/tenant record,
  // not a validated field subset, so there's nothing for the Save-error tab
  // jump (see handleSave) to ever match here.
  danger: [],
};

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
  const [loadingLibrary, setLoadingLibrary] = useState(false)
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
  // Which sidebar-link rows are expanded — collapsed by default (existing
  // links show a one-line summary) so the list stays scannable once a
  // merchant has several links with sub-links. A newly added link opens
  // automatically so it's immediately editable.
  // Accordion, not independent toggles: opening one closes whichever else
  // was open, for each of the three collapsible lists below (sidebar links,
  // statuses, policy categories) — a merchant asked for this explicitly
  // after finding it disorienting to have several long cards open at once.
  const [openLinkIndex, setOpenLinkIndex] = useState<number | null>(null)
  function toggleLinkOpen(index: number) {
    setOpenLinkIndex((prev) => (prev === index ? null : index))
  }

  // Same collapsed-by-default pattern, applied to the per-status label/
  // heading/icon/color/message cards — keeps the 14-status list scannable.
  const [openStatusKey, setOpenStatusKey] = useState<ReturnLifecycleStatusInput | null>(null)
  function toggleStatusOpen(key: ReturnLifecycleStatusInput) {
    setOpenStatusKey((prev) => (prev === key ? null : key))
  }

  // Same collapsed-by-default pattern as sidebar links above, applied to
  // the returns-policy category list — keeps a long category list scannable.
  const [openCategoryIndex, setOpenCategoryIndex] = useState<number | null>(null)
  function toggleCategoryOpen(index: number) {
    setOpenCategoryIndex((prev) => (prev === index ? null : index))
  }

  function set<K extends keyof BrandingInput>(key: K, value: BrandingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
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
    setLoadingLibrary(true)
    try {
      const res = await authedFetch("/api/app/media-library")
      const data = (await res.json()) as { files?: MediaLibraryFile[] }
      const files = data.files ?? []
      if (files.length === 0) {
        setErrors((e) => ({ ...e, [field]: "No images found in your Shopify media library." }))
        return
      }
      const headings = {
        logoUrl: "Choose a logo",
        guestLookupHeroUrl: "Choose a guest lookup image",
        guestLookupLogoUrl: "Choose a guest lookup logo",
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
      setLoadingLibrary(false)
    }
  }

  function updateCategory(index: number, patch: Partial<PolicyCategoryInput>) {
    setForm((f) => ({ ...f, policyCategories: f.policyCategories.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  }
  function addCategory() {
    setForm((f) => {
      const newIndex = f.policyCategories.length
      setOpenCategoryIndex(newIndex)
      return { ...f, policyCategories: [...f.policyCategories, { title: "", desc: "" }] }
    })
  }
  function removeCategory(index: number) {
    setForm((f) => ({ ...f, policyCategories: f.policyCategories.filter((_, i) => i !== index) }))
    setOpenCategoryIndex((prev) => {
      if (prev === null || prev === index) return null
      return prev > index ? prev - 1 : prev
    })
  }
  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction
    setForm((f) => {
      if (target < 0 || target >= f.policyCategories.length) return f
      const next = [...f.policyCategories]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, policyCategories: next }
    })
    setOpenCategoryIndex((prev) => {
      if (target < 0 || target >= form.policyCategories.length) return prev
      if (prev === index) return target
      if (prev === target) return index
      return prev
    })
  }

  function updateSidebarLink(index: number, patch: Partial<SidebarLinkInput>) {
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)) }))
  }
  function addSidebarLink() {
    setForm((f) => {
      const newIndex = f.sidebarLinks.length
      setOpenLinkIndex(newIndex)
      return { ...f, sidebarLinks: [...f.sidebarLinks, { label: "", url: "" }] }
    })
  }
  function removeSidebarLink(index: number) {
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.filter((_, i) => i !== index) }))
    setOpenLinkIndex((prev) => {
      if (prev === null || prev === index) return null
      return prev > index ? prev - 1 : prev
    })
  }
  function moveSidebarLink(index: number, direction: -1 | 1) {
    const target = index + direction
    setForm((f) => {
      if (target < 0 || target >= f.sidebarLinks.length) return f
      const next = [...f.sidebarLinks]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, sidebarLinks: next }
    })
    setOpenLinkIndex((prev) => {
      if (target < 0 || target >= form.sidebarLinks.length) return prev
      if (prev === index) return target
      if (prev === target) return index
      return prev
    })
  }

  function addSubLink(parentIndex: number) {
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
    setForm((f) => ({
      ...f,
      sidebarLinks: f.sidebarLinks.map((l, i) =>
        i === parentIndex ? { ...l, children: (l.children ?? []).filter((_, ci) => ci !== childIndex) } : l
      ),
    }))
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateBrandingInput(form)
    setErrors(validationErrors)
    if (!valid) {
      // A validation error on a tab that isn't currently open renders to a
      // hidden section — from the merchant's view, clicking Save appeared to
      // do nothing at all. Jump to whichever tab actually has the error.
      const errorKeys = Object.keys(validationErrors)
      const tabWithError = (Object.keys(TAB_FIELDS) as SettingsTab[]).find((tab) =>
        TAB_FIELDS[tab].some((field) => errorKeys.includes(field))
      )
      if (tabWithError) setActiveTab(tabWithError)
      setStatus("invalid")
      if (typeof shopify !== "undefined") shopify.toast.show("Fix the highlighted error and try again.", { isError: true })
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
    setForm({ ...DEFAULT_TENANT_FIELDS.branding, returnWindowDays: DEFAULT_TENANT_FIELDS.returnWindowDays })
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
                gap: 20,
                borderBottom: "1px solid #e1e3e5",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
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
            <s-text-field
              label="Brand name"
              name="name"
              value={form.name}
              placeholder="Your Store"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("name", e.target.value)}
            ></s-text-field>

            <s-stack direction="inline" gap="base" alignItems="center">
              {form.logoUrl && (
                // key forces a fresh <img> (and fresh error state) whenever the
                // URL changes, so a broken new URL doesn't keep showing a stale
                // "broken image" state from a previous one.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={form.logoUrl}
                  src={form.logoUrl}
                  alt="Current logo"
                  style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, border: "1px solid #d1d5db" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    setErrors((err) => ({ ...err, logoUrl: "This image URL didn't load. Try a different one." }))
                  }}
                />
              )}
              <s-button onClick={() => handleChooseFromLibrary("logoUrl")} disabled={loadingLibrary}>
                {loadingLibrary ? "Loading…" : "Choose from Shopify"}
              </s-button>
            </s-stack>
            <s-url-field
              label="Or paste a logo URL"
              name="logoUrl"
              value={form.logoUrl}
              placeholder="https://cdn.shopify.com/your-logo.png"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("logoUrl", e.target.value)}
            ></s-url-field>
            {errors.logoUrl && <s-paragraph tone="critical">{errors.logoUrl}</s-paragraph>}

            <s-color-field
              label="Accent color"
              name="accentColor"
              value={form.accentColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("accentColor", e.target.value)}
            ></s-color-field>
            {errors.accentColor && <s-paragraph tone="critical">{errors.accentColor}</s-paragraph>}

            <s-url-field
              label="Storefront URL"
              name="storefrontUrl"
              value={form.storefrontUrl}
              placeholder="https://your-store.com"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("storefrontUrl", e.target.value)}
            ></s-url-field>
            <s-paragraph tone="subdued">Where the sidebar logo and the header's store link send customers — usually your live storefront domain, not your myshopify.com admin URL.</s-paragraph>
            {errors.storefrontUrl && <s-paragraph tone="critical">{errors.storefrontUrl}</s-paragraph>}

            <s-email-field
              label="Support email"
              name="supportEmail"
              value={form.supportEmail}
              placeholder="help@your-store.com"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("supportEmail", e.target.value)}
            ></s-email-field>
            <s-paragraph tone="subdued">Only shown after a customer submits a return that includes an item still in transit (a split-shipment order where the rest has already arrived), as a "contact us if that item has a delivery issue" line.</s-paragraph>
            {errors.supportEmail && <s-paragraph tone="critical">{errors.supportEmail}</s-paragraph>}

            <s-select
              label="Guest lookup background"
              name="guestBackgroundStyle"
              value={form.guestBackgroundStyle}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("guestBackgroundStyle", e.target.value as "none" | "shapeGrid" | "dotField")}
            >
              <s-option value="none">None</s-option>
              <s-option value="shapeGrid">Shape grid (animated squares)</s-option>
              <s-option value="dotField">Dot field (interactive dots)</s-option>
            </s-select>
            <s-paragraph tone="subdued">An animated background behind the "Find your order" guest lookup screen, before a customer signs in.</s-paragraph>

            <s-select
              label="Guest lookup layout"
              name="guestLookupLayout"
              value={form.guestLookupLayout}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                set("guestLookupLayout", e.target.value as "classic" | "split")
              }
            >
              <s-option value="classic">Classic — form only</s-option>
              <s-option value="split">Split — image left, form right</s-option>
            </s-select>
            <s-paragraph tone="subdued">
              Classic is the original centered form. Split adds a branded image panel beside the form (desktop) or above it (mobile).
            </s-paragraph>
            {errors.guestLookupLayout && <s-paragraph tone="critical">{errors.guestLookupLayout}</s-paragraph>}

            {form.guestLookupLayout === "split" && (
              <>
                <s-text-field
                  label="Panel headline"
                  name="guestLookupHeadline"
                  value={form.guestLookupHeadline}
                  placeholder="Return your order with ease"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupHeadline", e.target.value)}
                ></s-text-field>
                {errors.guestLookupHeadline && <s-paragraph tone="critical">{errors.guestLookupHeadline}</s-paragraph>}

                <s-text-field
                  label="Panel supporting text"
                  name="guestLookupSubtext"
                  value={form.guestLookupSubtext}
                  placeholder="Look up your order in seconds — no account needed."
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupSubtext", e.target.value)}
                ></s-text-field>
                {errors.guestLookupSubtext && <s-paragraph tone="critical">{errors.guestLookupSubtext}</s-paragraph>}

                <s-stack direction="inline" gap="base" alignItems="center">
                  {form.guestLookupHeroUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={form.guestLookupHeroUrl}
                      src={form.guestLookupHeroUrl}
                      alt="Guest lookup hero"
                      style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        setErrors((err) => ({ ...err, guestLookupHeroUrl: "This image URL didn't load. Try a different one." }))
                      }}
                    />
                  )}
                  <s-button onClick={() => handleChooseFromLibrary("guestLookupHeroUrl")} disabled={loadingLibrary}>
                    {loadingLibrary ? "Loading…" : "Choose from Shopify"}
                  </s-button>
                  {form.guestLookupHeroUrl && (
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
                      Use default image
                    </s-button>
                  )}
                </s-stack>
                <s-url-field
                  label="Or paste a hero image URL"
                  name="guestLookupHeroUrl"
                  value={form.guestLookupHeroUrl}
                  placeholder="Leave blank for the default returns package image"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupHeroUrl", e.target.value)}
                ></s-url-field>
                <s-paragraph tone="subdued">Pick from your Shopify media library, or paste a URL. Blank uses the built-in default.</s-paragraph>
                {errors.guestLookupHeroUrl && <s-paragraph tone="critical">{errors.guestLookupHeroUrl}</s-paragraph>}

                <s-select
                  label="Brand mark on panel"
                  name="guestLookupBrandDisplay"
                  value={form.guestLookupBrandDisplay}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    set("guestLookupBrandDisplay", e.target.value as "logo" | "text" | "none")
                  }
                >
                  <s-option value="logo">Logo image</s-option>
                  <s-option value="text">Brand name as text</s-option>
                  <s-option value="none">Hidden</s-option>
                </s-select>

                {form.guestLookupBrandDisplay === "logo" && (
                  <>
                    <s-stack direction="inline" gap="base" alignItems="center">
                      {(form.guestLookupLogoUrl || form.logoUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={form.guestLookupLogoUrl || form.logoUrl}
                          src={form.guestLookupLogoUrl || form.logoUrl}
                          alt="Guest lookup logo"
                          style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6, border: "1px solid #d1d5db" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      )}
                      <s-button onClick={() => handleChooseFromLibrary("guestLookupLogoUrl")} disabled={loadingLibrary}>
                        {loadingLibrary ? "Loading…" : "Choose from Shopify"}
                      </s-button>
                      {form.guestLookupLogoUrl && (
                        <s-button variant="tertiary" onClick={() => set("guestLookupLogoUrl", "")}>
                          Use main logo
                        </s-button>
                      )}
                    </s-stack>
                    <s-url-field
                      label="Or paste a panel logo URL"
                      name="guestLookupLogoUrl"
                      value={form.guestLookupLogoUrl}
                      placeholder="Leave blank to use the main Branding logo"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("guestLookupLogoUrl", e.target.value)}
                    ></s-url-field>
                    {errors.guestLookupLogoUrl && <s-paragraph tone="critical">{errors.guestLookupLogoUrl}</s-paragraph>}
                  </>
                )}
              </>
            )}
          </s-stack>
        </s-section>
      )}

      {activeTab === "returns" && (
        <>
          <s-section heading="Return window">
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

              <s-checkbox
                label="Require customers to accept the returns policy before selecting items"
                name="requirePolicyAcceptance"
                checked={form.requirePolicyAcceptance}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("requirePolicyAcceptance", e.target.checked)}
              ></s-checkbox>
            </s-stack>
          </s-section>

          <s-section heading="Guest lookup">
            <s-stack direction="block" gap="base">
              <s-checkbox
                label="Always show the order lookup form, even for logged-in customers"
                name="alwaysShowGuestLookup"
                checked={form.alwaysShowGuestLookup}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("alwaysShowGuestLookup", e.target.checked)}
              ></s-checkbox>
              <s-paragraph tone="subdued">
                When on, a logged-in customer visiting the returns portal directly sees the order lookup form (order
                number + email — no postcode needed, since we already know they're logged in) instead of their full
                order history. When off, logged-in customers see their full order list as normal. Guests (not logged
                in) always need order number, email and postcode — that isn't configurable.
              </s-paragraph>
            </s-stack>
          </s-section>

          <s-section heading="Returns policy dialog">
            <s-stack direction="block" gap="base">
              <s-paragraph tone="subdued">Controls the "Review & Accept" dialog customers see before selecting items to return.</s-paragraph>

              <s-text-field
                label="Dialog heading"
                name="policyHeading"
                value={form.policyHeading}
                placeholder="iBlaze Returns Policy"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyHeading", e.target.value)}
              ></s-text-field>
              {errors.policyHeading && <s-paragraph tone="critical">{errors.policyHeading}</s-paragraph>}

              <s-text-field
                label="Dialog subheading"
                name="policySubheading"
                value={form.policySubheading}
                placeholder="Review our returns policy before selecting items to return."
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policySubheading", e.target.value)}
              ></s-text-field>
              {errors.policySubheading && <s-paragraph tone="critical">{errors.policySubheading}</s-paragraph>}

              <s-text-field
                label="Last updated"
                name="policyLastUpdated"
                value={form.policyLastUpdated}
                placeholder="14 July 2026"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyLastUpdated", e.target.value)}
              ></s-text-field>
              <s-paragraph tone="subdued">Shown under the dialog subheading. Leave blank to hide it. Free text — you control the date format.</s-paragraph>
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
                <s-stack direction="block" gap="base">
                  {form.policyCategories.map((cat, i) => {
                    const isOpen = openCategoryIndex === i
                    return (
                      <s-box key={i} padding="base" border="base" borderRadius="base">
                        <s-stack direction="block" gap="small">
                          <s-stack direction="inline" gap="small-300" alignItems="center">
                            <s-button onClick={() => toggleCategoryOpen(i)}>{isOpen ? "Collapse" : "Expand"}</s-button>
                            <s-text>{cat.title || "(untitled category)"}</s-text>
                          </s-stack>
                          {isOpen && (
                            <>
                              <s-text-field
                                label="Category title"
                                value={cat.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCategory(i, { title: e.target.value })}
                              ></s-text-field>
                              <s-text-field
                                label="Category description"
                                value={cat.desc}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCategory(i, { desc: e.target.value })}
                              ></s-text-field>
                              <s-stack direction="inline" gap="small-300">
                                <s-button onClick={() => moveCategory(i, -1)} disabled={i === 0}>Move up</s-button>
                                <s-button onClick={() => moveCategory(i, 1)} disabled={i === form.policyCategories.length - 1}>Move down</s-button>
                                <s-button tone="critical" onClick={() => removeCategory(i)}>Remove</s-button>
                              </s-stack>
                            </>
                          )}
                        </s-stack>
                      </s-box>
                    )
                  })}
                  <s-button onClick={addCategory}>Add category</s-button>
                  {errors.policyCategories && <s-paragraph tone="critical">{errors.policyCategories}</s-paragraph>}
                </s-stack>
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

              <s-checkbox
                label="Show the footer note"
                name="policyFooterNoteEnabled"
                checked={form.policyFooterNoteEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyFooterNoteEnabled", e.target.checked)}
              ></s-checkbox>
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
            </s-stack>
          </s-section>

          <s-section heading="Confirmation messages">
            <s-stack direction="block" gap="base">
              <s-paragraph tone="subdued">Shown briefly as a toast after a customer accepts or declines the policy.</s-paragraph>
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
          </s-section>
        </>
      )}

      {activeTab === "navigation" && (
        <>
          <s-section heading="Sidebar layout">
            <s-stack direction="block" gap="base">
              <s-checkbox
                label="Let customers switch between sidebar and inset layouts"
                name="sidebarLayoutSwitcherEnabled"
                checked={form.sidebarLayoutSwitcherEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarLayoutSwitcherEnabled", e.target.checked)}
              ></s-checkbox>
              <s-select
                label={form.sidebarLayoutSwitcherEnabled ? "Default layout" : "Layout (fixed — switcher is off)"}
                name="defaultSidebarLayout"
                value={form.defaultSidebarLayout}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("defaultSidebarLayout", e.target.value as "inset" | "sidebar")}
              >
                <s-option value="inset">Inset</s-option>
                <s-option value="sidebar">Sidebar</s-option>
              </s-select>
              <s-checkbox
                label="Sidebar starts open on desktop"
                name="sidebarDefaultOpenOnDesktop"
                checked={form.sidebarDefaultOpenOnDesktop}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarDefaultOpenOnDesktop", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label="Show the customer avatar in the sidebar"
                name="sidebarAvatarEnabled"
                checked={form.sidebarAvatarEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("sidebarAvatarEnabled", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label="Show the customer avatar/account menu in the header"
                name="headerAvatarEnabled"
                checked={form.headerAvatarEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headerAvatarEnabled", e.target.checked)}
              ></s-checkbox>
            </s-stack>
          </s-section>

          <s-section heading="Sidebar links">
            <s-stack direction="block" gap="base">
              <s-paragraph tone="subdued">Extra links shown in the customer portal's sidebar, alongside Home and Orders. Open in a new tab. Each link can optionally have its own sub-links (a one-level submenu).</s-paragraph>
              {form.sidebarLinks.map((link, i) => {
                const isOpen = openLinkIndex === i
                const subCount = link.children?.length ?? 0
                return (
                  <s-box key={i} padding="base" border="base" borderRadius="base">
                    <s-stack direction="block" gap="small">
                      <s-stack direction="inline" gap="small-300" alignItems="center">
                        <s-button onClick={() => toggleLinkOpen(i)}>{isOpen ? "Collapse" : "Expand"}</s-button>
                        <s-text>{link.label || "(untitled link)"}{subCount > 0 ? ` · ${subCount} sub-link${subCount === 1 ? "" : "s"}` : ""}</s-text>
                      </s-stack>
                      {isOpen && (
                        <>
                          <s-text-field
                            label="Label"
                            value={link.label}
                            placeholder="FAQ"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSidebarLink(i, { label: e.target.value })}
                          ></s-text-field>
                          <s-url-field
                            label="URL"
                            value={link.url}
                            placeholder="https://your-store.com/pages/faq"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSidebarLink(i, { url: e.target.value })}
                          ></s-url-field>
                          <s-select
                            label="Icon (optional)"
                            value={link.icon ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSidebarLink(i, { icon: e.target.value || undefined })}
                          >
                            <s-option value="">No icon</s-option>
                            {SIDEBAR_ICON_NAMES.map((name) => (
                              <s-option key={name} value={name}>{name}</s-option>
                            ))}
                          </s-select>

                          {(link.children ?? []).length > 0 && (
                            <s-stack direction="block" gap="small">
                              <s-text tone="subdued">Sub-links</s-text>
                              {link.children!.map((child, ci) => (
                                <s-box key={ci} padding="small" border="base" borderRadius="base">
                                  <s-stack direction="block" gap="small">
                                    <s-text-field
                                      label="Sub-link label"
                                      value={child.label}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSubLink(i, ci, { label: e.target.value })}
                                    ></s-text-field>
                                    <s-url-field
                                      label="Sub-link URL"
                                      value={child.url}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSubLink(i, ci, { url: e.target.value })}
                                    ></s-url-field>
                                    <s-button tone="critical" onClick={() => removeSubLink(i, ci)}>Remove sub-link</s-button>
                                  </s-stack>
                                </s-box>
                              ))}
                            </s-stack>
                          )}
                          <s-stack direction="inline" gap="small-300">
                            <s-button onClick={() => addSubLink(i)}>Add sub-link</s-button>
                            <s-button onClick={() => moveSidebarLink(i, -1)} disabled={i === 0}>Move up</s-button>
                            <s-button onClick={() => moveSidebarLink(i, 1)} disabled={i === form.sidebarLinks.length - 1}>Move down</s-button>
                            <s-button tone="critical" onClick={() => removeSidebarLink(i)}>Remove</s-button>
                          </s-stack>
                        </>
                      )}
                    </s-stack>
                  </s-box>
                )
              })}
              <s-button onClick={addSidebarLink}>Add link</s-button>
              {errors.sidebarLinks && <s-paragraph tone="critical">{errors.sidebarLinks}</s-paragraph>}

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
          </s-section>

          <s-section heading="Store & order status links">
            <s-stack direction="block" gap="base">
              <s-checkbox
                label="Show a link back to the storefront in the header"
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

              <s-divider></s-divider>

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
          </s-section>
        </>
      )}

      {activeTab === "table" && (
        <>
          <s-section heading="Header search">
            <s-stack direction="block" gap="base">
              <s-checkbox
                label="Show the order search bar in the header"
                name="headerSearchEnabled"
                checked={form.headerSearchEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headerSearchEnabled", e.target.checked)}
              ></s-checkbox>
              <s-text-field
                label="Header search placeholder"
                name="headerSearchPlaceholder"
                value={form.headerSearchPlaceholder}
                placeholder="Search orders..."
                disabled={!form.headerSearchEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("headerSearchPlaceholder", e.target.value)}
              ></s-text-field>
              {errors.headerSearchPlaceholder && <s-paragraph tone="critical">{errors.headerSearchPlaceholder}</s-paragraph>}
            </s-stack>
          </s-section>

          <s-section heading="Order item table">
            <s-stack direction="block" gap="base">
              <s-checkbox
                label="Show the product/variant search bar"
                name="tableSearchEnabled"
                checked={form.tableSearchEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableSearchEnabled", e.target.checked)}
              ></s-checkbox>
              <s-text-field
                label="Table search placeholder"
                name="tableSearchPlaceholder"
                value={form.tableSearchPlaceholder}
                placeholder="Search product or variant..."
                disabled={!form.tableSearchEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableSearchPlaceholder", e.target.value)}
              ></s-text-field>
              {errors.tableSearchPlaceholder && <s-paragraph tone="critical">{errors.tableSearchPlaceholder}</s-paragraph>}

              <s-checkbox
                label="Show the Filter button (ineligible items)"
                name="tableFilterButtonEnabled"
                checked={form.tableFilterButtonEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableFilterButtonEnabled", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label="Show the Eligible/Ineligible status filter"
                name="statusFilterEnabled"
                checked={form.statusFilterEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("statusFilterEnabled", e.target.checked)}
              ></s-checkbox>
              <s-text-field
                label="Eligible tab label"
                name="eligibleLabel"
                value={form.eligibleLabel}
                placeholder="Eligible"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("eligibleLabel", e.target.value)}
              ></s-text-field>
              {errors.eligibleLabel && <s-paragraph tone="critical">{errors.eligibleLabel}</s-paragraph>}
              <s-text-field
                label="Ineligible tab label"
                name="ineligibleLabel"
                value={form.ineligibleLabel}
                placeholder="Ineligible"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("ineligibleLabel", e.target.value)}
              ></s-text-field>
              {errors.ineligibleLabel && <s-paragraph tone="critical">{errors.ineligibleLabel}</s-paragraph>}
              <s-checkbox
                label={'Show the "These items can’t be selected here" message on the Ineligible tab'}
                name="ineligibleMessageEnabled"
                checked={form.ineligibleMessageEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("ineligibleMessageEnabled", e.target.checked)}
              ></s-checkbox>
              <s-select
                label="Default order view"
                name="defaultOrderView"
                value={form.defaultOrderView}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("defaultOrderView", e.target.value as "list" | "grid")}
              >
                <s-option value="grid">Grid</s-option>
                <s-option value="list">List</s-option>
              </s-select>
              <s-checkbox
                label="Show the Columns button"
                name="tableColumnsButtonEnabled"
                checked={form.tableColumnsButtonEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tableColumnsButtonEnabled", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label='Show the "Show N" page-size selector'
                name="tablePageSizeEnabled"
                checked={form.tablePageSizeEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("tablePageSizeEnabled", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label="Show shipment tracking cards"
                name="shipmentCardsEnabled"
                checked={form.shipmentCardsEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("shipmentCardsEnabled", e.target.checked)}
              ></s-checkbox>
              <s-checkbox
                label="Make product images clickable links to the storefront product page"
                name="productImageLinksEnabled"
                checked={form.productImageLinksEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("productImageLinksEnabled", e.target.checked)}
              ></s-checkbox>
            </s-stack>
          </s-section>

          <s-section heading="Return status">
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
                          {key === "notReturnable" && (
                            <s-paragraph tone="subdued">
                              This status covers several reasons (not yet delivered, final sale, outside the return
                              window, or other) — edit each reason's sentence in "Not returnable reasons" below.
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
          </s-section>

          <s-section heading="Not returnable reasons">
            <s-stack direction="block" gap="base">
              <s-text color="subdued">
                The specific sentence shown under the "Not returnable" badge, depending on why the item can't be
                returned right now.
              </s-text>
              <s-text-area label="Not yet shipped" value={form.returnLifecycleMessages.shippingConfirmed} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingConfirmed", e.target.value)}></s-text-area>
              <s-text-area label="On its way" value={form.returnLifecycleMessages.shippingOnItsWay} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOnItsWay", e.target.value)}></s-text-area>
              <s-text-area label="Out for delivery" value={form.returnLifecycleMessages.shippingOutForDelivery} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingOutForDelivery", e.target.value)}></s-text-area>
              <s-text-area label="Attempted delivery" value={form.returnLifecycleMessages.shippingAttemptedDelivery} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("shippingAttemptedDelivery", e.target.value)}></s-text-area>
              <s-text-area label="Outside the return window (with a closed date)" value={form.returnLifecycleMessages.outsideWindow} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindow", e.target.value)}></s-text-area>
              <s-text-area label="Outside the return window (no closed date available)" value={form.returnLifecycleMessages.outsideWindowNoDate} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("outsideWindowNoDate", e.target.value)}></s-text-area>
              <s-text-area label="Final sale" value={form.returnLifecycleMessages.finalSale} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("finalSale", e.target.value)}></s-text-area>
              <s-text-area label="Other" value={form.returnLifecycleMessages.otherNotReturnable} rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReturnLifecycleMessage("otherNotReturnable", e.target.value)}></s-text-area>
            </s-stack>
          </s-section>

          <s-section heading="Refund">
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
          </s-section>
        </>
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
