"use client"

import { useState } from "react"
import { validateBrandingInput, type BrandingInput, type PolicyCategoryInput, type SidebarLinkInput } from "@/lib/branding-validation"
import type { TenantBranding } from "@/lib/tenant"

declare const shopify: {
  idToken: () => Promise<string>;
  picker: (options: {
    heading: string;
    items: { id: string; heading: string; thumbnail?: { url: string } }[];
  }) => Promise<{ selected: { id: string }[] } | null>;
};

type MediaLibraryFile = { id: string; url: string; alt: string | null; width: number; height: number };
type SettingsTab = "branding" | "returns" | "navigation";

const TAB_FIELDS: Record<SettingsTab, (keyof BrandingInput)[]> = {
  branding: ["name", "logoUrl", "accentColor", "storefrontUrl", "supportEmail"],
  returns: [
    "returnWindowDays", "policyUrl", "policyText", "requirePolicyAcceptance",
    "policyHeading", "policySubheading", "policyBodyMode", "policyCategories", "policyBodyText", "policyFooterNote",
  ],
  navigation: ["storeLinkEnabled", "storeLinkLabel", "sidebarLinks", "sidebarNote", "sidebarLayoutSwitcherEnabled", "defaultSidebarLayout"],
};

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.slice(path.lastIndexOf("/") + 1)) || "Untitled image";
  } catch {
    return "Untitled image";
  }
}

export function SettingsForm({
  initialBranding,
  initialReturnWindowDays,
}: {
  initialBranding: TenantBranding
  initialReturnWindowDays: number
}) {
  const [form, setForm] = useState<BrandingInput>({
    ...initialBranding,
    returnWindowDays: initialReturnWindowDays,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof BrandingInput, string>>>({})
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "invalid">("idle")
  const [uploading, setUploading] = useState(false)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  // Polaris's s-tabs/s-tab-list/s-tab/s-tab-panel custom elements don't
  // register/render correctly in this app's embedded runtime (confirmed live
  // — they fell back to unstyled inline text with no panel switching), so
  // tab navigation is done manually here with plain state instead.
  const [activeTab, setActiveTab] = useState<SettingsTab>("branding")

  function set<K extends keyof BrandingInput>(key: K, value: BrandingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function authedFetch(input: string, init: RequestInit = {}) {
    const token = await shopify.idToken()
    return fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  }

  async function handleLogoFile(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await authedFetch("/api/app/logo-upload", { method: "POST", body })
      const data = await res.json()
      if (res.ok && data.url) {
        set("logoUrl", data.url)
        setErrors((e) => {
          const { logoUrl, ...rest } = e
          return rest
        })
      } else {
        setErrors((e) => ({ ...e, logoUrl: "Upload failed. Try a different file or paste a URL instead." }))
      }
    } catch {
      setErrors((e) => ({ ...e, logoUrl: "Upload failed. Try a different file or paste a URL instead." }))
    } finally {
      setUploading(false)
    }
  }

  async function handleChooseFromLibrary() {
    setLoadingLibrary(true)
    try {
      const res = await authedFetch("/api/app/media-library")
      const data = (await res.json()) as { files?: MediaLibraryFile[] }
      const files = data.files ?? []
      if (files.length === 0) {
        setErrors((e) => ({ ...e, logoUrl: "No images found in your Shopify media library." }))
        return
      }
      const result = await shopify.picker({
        heading: "Choose a logo",
        items: files.map((f) => ({ id: f.id, heading: f.alt || filenameFromUrl(f.url), thumbnail: { url: f.url } })),
      })
      // A null/undefined result means the merchant cancelled the picker —
      // not an error, do nothing. Only a non-empty selection that fails to
      // match one of the files we listed is a real (unexpected) failure.
      if (!result?.selected?.length) return
      const selectedId = result.selected[0]?.id
      const chosen = files.find((f) => f.id === selectedId)
      if (chosen) {
        set("logoUrl", chosen.url)
        setErrors((e) => {
          const { logoUrl, ...rest } = e
          return rest
        })
      } else {
        setErrors((e) => ({ ...e, logoUrl: "Couldn't match the selected image. Try again." }))
      }
    } catch {
      setErrors((e) => ({ ...e, logoUrl: "Couldn't open the media library. Try again." }))
    } finally {
      setLoadingLibrary(false)
    }
  }

  function updateCategory(index: number, patch: Partial<PolicyCategoryInput>) {
    setForm((f) => ({ ...f, policyCategories: f.policyCategories.map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  }
  function addCategory() {
    setForm((f) => ({ ...f, policyCategories: [...f.policyCategories, { title: "", desc: "" }] }))
  }
  function removeCategory(index: number) {
    setForm((f) => ({ ...f, policyCategories: f.policyCategories.filter((_, i) => i !== index) }))
  }
  function moveCategory(index: number, direction: -1 | 1) {
    setForm((f) => {
      const next = [...f.policyCategories]
      const target = index + direction
      if (target < 0 || target >= next.length) return f
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, policyCategories: next }
    })
  }

  function updateSidebarLink(index: number, patch: Partial<SidebarLinkInput>) {
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)) }))
  }
  function addSidebarLink() {
    setForm((f) => ({ ...f, sidebarLinks: [...f.sidebarLinks, { label: "", url: "" }] }))
  }
  function removeSidebarLink(index: number) {
    setForm((f) => ({ ...f, sidebarLinks: f.sidebarLinks.filter((_, i) => i !== index) }))
  }
  function moveSidebarLink(index: number, direction: -1 | 1) {
    setForm((f) => {
      const next = [...f.sidebarLinks]
      const target = index + direction
      if (target < 0 || target >= next.length) return f
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, sidebarLinks: next }
    })
  }

  async function handleSave(e: React.FormEvent) {
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
        return
      }
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "branding", label: "Branding" },
    { id: "returns", label: "Returns policy" },
    { id: "navigation", label: "Navigation" },
  ]

  return (
    <s-page heading="Returns Settings">
      <s-section padding="none">
        <s-box padding="base">
          <s-stack direction="inline" gap="small-300">
            {TABS.map((tab) => (
              <s-button
                key={tab.id}
                variant={activeTab === tab.id ? "primary" : "secondary"}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </s-button>
            ))}
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
              <s-button onClick={() => document.getElementById("logo-file-input")?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload logo"}
              </s-button>
              <s-button onClick={handleChooseFromLibrary} disabled={loadingLibrary}>
                {loadingLibrary ? "Loading…" : "Choose from Shopify"}
              </s-button>
              <input
                id="logo-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
              />
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

              <s-url-field
                label="Policy URL"
                name="policyUrl"
                value={form.policyUrl}
                placeholder="https://your-store.com/policies/refund-policy"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("policyUrl", e.target.value)}
              ></s-url-field>
              <s-paragraph tone="subdued">Shown as a clickable link in the "{form.returnWindowDays}-day returns" banner on the customer's dashboard home page.</s-paragraph>
              {errors.policyUrl && <s-paragraph tone="critical">{errors.policyUrl}</s-paragraph>}

              <s-text-area
                label="Policy text"
                name="policyText"
                value={form.policyText}
                maxLength={500}
                rows={3}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("policyText", e.target.value)}
              ></s-text-area>
              {errors.policyText && <s-paragraph tone="critical">{errors.policyText}</s-paragraph>}

              <s-checkbox
                label="Require customers to accept the returns policy before selecting items"
                name="requirePolicyAcceptance"
                checked={form.requirePolicyAcceptance}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("requirePolicyAcceptance", e.target.checked)}
              ></s-checkbox>
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
                  {form.policyCategories.map((cat, i) => (
                    <s-box key={i} padding="base" border="base" borderRadius="base">
                      <s-stack direction="block" gap="small">
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
                      </s-stack>
                    </s-box>
                  ))}
                  <s-button onClick={addCategory}>Add category</s-button>
                  {errors.policyCategories && <s-paragraph tone="critical">{errors.policyCategories}</s-paragraph>}
                </s-stack>
              ) : (
                <>
                  <s-text-area
                    label="Policy body text"
                    name="policyBodyText"
                    value={form.policyBodyText}
                    maxLength={20000}
                    rows={12}
                    placeholder="Write your full returns policy here instead of using category cards. Supports Markdown: **bold**, ### headings, and - bullet lists."
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("policyBodyText", e.target.value)}
                  ></s-text-area>
                  {errors.policyBodyText && <s-paragraph tone="critical">{errors.policyBodyText}</s-paragraph>}
                </>
              )}

              <s-text-area
                label="Footer note"
                name="policyFooterNote"
                value={form.policyFooterNote}
                maxLength={300}
                rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("policyFooterNote", e.target.value)}
              ></s-text-area>
              {errors.policyFooterNote && <s-paragraph tone="critical">{errors.policyFooterNote}</s-paragraph>}
            </s-stack>
          </s-section>
        </>
      )}

      {activeTab === "navigation" && (
        <>
          <s-section heading="Store link">
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
            </s-stack>
          </s-section>

          <s-section heading="Sidebar links">
            <s-stack direction="block" gap="base">
              <s-paragraph tone="subdued">Extra links shown in the customer portal's sidebar, alongside Home and Orders. Open in a new tab.</s-paragraph>
              {form.sidebarLinks.map((link, i) => (
                <s-box key={i} padding="base" border="base" borderRadius="base">
                  <s-stack direction="block" gap="small">
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
                    <s-stack direction="inline" gap="small-300">
                      <s-button onClick={() => moveSidebarLink(i, -1)} disabled={i === 0}>Move up</s-button>
                      <s-button onClick={() => moveSidebarLink(i, 1)} disabled={i === form.sidebarLinks.length - 1}>Move down</s-button>
                      <s-button tone="critical" onClick={() => removeSidebarLink(i)}>Remove</s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              ))}
              <s-button onClick={addSidebarLink}>Add link</s-button>
              {errors.sidebarLinks && <s-paragraph tone="critical">{errors.sidebarLinks}</s-paragraph>}

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
            </s-stack>
          </s-section>
        </>
      )}

      <s-section>
        <form onSubmit={handleSave}>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-button type="submit" variant="primary" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save"}
            </s-button>
            {status === "saved" && <s-text tone="success">Saved.</s-text>}
            {status === "error" && <s-paragraph tone="critical">Something went wrong. Try again.</s-paragraph>}
            {status === "invalid" && <s-paragraph tone="critical">Fix the highlighted error and try again.</s-paragraph>}
          </s-stack>
        </form>
      </s-section>
    </s-page>
  )
}
