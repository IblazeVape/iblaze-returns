"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { validateBrandingInput, type BrandingInput } from "@/lib/branding-validation"
import { BrandingPreview } from "@/components/app-settings/branding-preview"
import type { TenantBranding } from "@/lib/tenant"

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

  function set<K extends keyof BrandingInput>(key: K, value: BrandingInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleLogoFile(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/app/logo-upload", { method: "POST", body })
      const data = await res.json()
      if (res.ok && data.url) set("logoUrl", data.url)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { valid, errors: validationErrors } = validateBrandingInput(form)
    setErrors(validationErrors)
    if (!valid) return

    setStatus("saving")
    try {
      const res = await fetch("/api/app/branding", {
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
    <div className="mx-auto flex max-w-4xl gap-8 p-6">
      <form onSubmit={handleSave} className="flex flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>How your returns portal looks to customers.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand-name">Brand name</Label>
              <Input id="brand-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your Store" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="logo-url">Logo</Label>
              <Input
                id="logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
              />
              <Input
                id="logo-url"
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
                placeholder="https://cdn.shopify.com/your-logo.png"
              />
              {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accent-color">Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="accent-color"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-9 w-12 rounded border"
                />
                <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="w-32" />
              </div>
              {errors.accentColor && <p className="text-sm text-destructive">{errors.accentColor}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="storefront-url">Storefront URL</Label>
              <Input id="storefront-url" value={form.storefrontUrl} onChange={(e) => set("storefrontUrl", e.target.value)} placeholder="https://your-store.com" />
              {errors.storefrontUrl && <p className="text-sm text-destructive">{errors.storefrontUrl}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Returns</CardTitle>
            <CardDescription>Return window and policy shown to customers.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="return-window">Return window (days)</Label>
              <Input
                id="return-window"
                type="number"
                min={1}
                max={365}
                value={form.returnWindowDays}
                onChange={(e) => set("returnWindowDays", Number(e.target.value))}
                className="w-32"
              />
              {errors.returnWindowDays && <p className="text-sm text-destructive">{errors.returnWindowDays}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-url">Policy URL</Label>
              <Input id="policy-url" value={form.policyUrl} onChange={(e) => set("policyUrl", e.target.value)} placeholder="https://your-store.com/policies/refund-policy" />
              {errors.policyUrl && <p className="text-sm text-destructive">{errors.policyUrl}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-text">Policy text</Label>
              <Textarea id="policy-text" value={form.policyText} onChange={(e) => set("policyText", e.target.value)} maxLength={500} rows={3} />
              {errors.policyText && <p className="text-sm text-destructive">{errors.policyText}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-email">Support email</Label>
              <Input id="support-email" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} placeholder="help@your-store.com" />
              {errors.supportEmail && <p className="text-sm text-destructive">{errors.supportEmail}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"} className="bg-[#000000]">
            {status === "saving" ? "Saving…" : "Save"}
          </Button>
          {status === "saved" && <span className="text-sm text-green-700">Saved.</span>}
          {status === "error" && <span className="text-sm text-destructive">Something went wrong. Try again.</span>}
        </div>
      </form>

      <BrandingPreview logoUrl={form.logoUrl} name={form.name} accentColor={form.accentColor} />
    </div>
  )
}
