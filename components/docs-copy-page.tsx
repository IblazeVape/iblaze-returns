"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

// Self-contained "Copy Page" button — copies this page's own raw markdown to
// the clipboard. No external service/account required, unlike the rest of
// that toolbar on the reference site (share, prev/next were already handled
// separately via DocsPagerNav).
export function DocsCopyPage({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(markdown)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy Page"}
    </Button>
  )
}
