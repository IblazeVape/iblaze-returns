"use client"

import { useState } from "react"
import { validateBrandingInput, type BrandingInput } from "@/lib/branding-validation"
import type { TenantBranding } from "@/lib/tenant"

declare const shopify: {
  idToken: () => Promise<string>;
  picker: (options: {
    heading: string;
    items: { id: string; heading: string; thumbnail?: { url: string } }[];
  }) => Promise<{ selected: { id: string }[] } | null>;
};

type MediaLibraryFile = { id: string; url: string; alt: string | null; width: number; height: number };

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
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [uploading, setUploading] = useState(false)
  const [loadingLibrary, setLoadingLibrary] = useState(false)

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
      const selectedId = result?.selected?.[0]?.id
      const chosen = files.find((f) => f.id === selectedId)
      if (chosen) {
        set("logoUrl", chosen.url)
        setErrors((e) => {
          const { logoUrl, ...rest } = e
          return rest
        })
      }
    } catch {
      setErrors((e) => ({ ...e, logoUrl: "Couldn't open the media library. Try again." }))
    } finally {
      setLoadingLibrary(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateBrandingInput(form)
    setErrors(validationErrors)
    if (!valid) return

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

  return (
    <s-page heading="Returns Settings">
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
          {errors.storefrontUrl && <s-paragraph tone="critical">{errors.storefrontUrl}</s-paragraph>}
        </s-stack>
      </s-section>

      <s-section heading="Returns">
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

          <s-email-field
            label="Support email"
            name="supportEmail"
            value={form.supportEmail}
            placeholder="help@your-store.com"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("supportEmail", e.target.value)}
          ></s-email-field>
          {errors.supportEmail && <s-paragraph tone="critical">{errors.supportEmail}</s-paragraph>}

          <s-checkbox
            label="Require customers to accept the returns policy before selecting items"
            name="requirePolicyAcceptance"
            checked={form.requirePolicyAcceptance}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("requirePolicyAcceptance", e.target.checked)}
          ></s-checkbox>
        </s-stack>
      </s-section>

      <s-section>
        <form onSubmit={handleSave}>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-button type="submit" variant="primary" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save"}
            </s-button>
            {status === "saved" && <s-text tone="success">Saved.</s-text>}
            {status === "error" && <s-paragraph tone="critical">Something went wrong. Try again.</s-paragraph>}
          </s-stack>
        </form>
      </s-section>
    </s-page>
  )
}
