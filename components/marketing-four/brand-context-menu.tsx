"use client"

import { DownloadIcon } from "lucide-react"
import { useCallback } from "react"
import { toast } from "sonner"

import { useMarketingTwoTheme } from "@/components/marketing-two/theme-provider"
import { getLogoMarkSVG, LogoMark } from "@/components/marketing-four/logo"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/marketing-four/ui/context-menu"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn's BrandContextMenu (MIT — see
// NOTICE.md). Their version reads next-themes' resolvedTheme; this reads
// the scoped useMarketingTwoTheme() context instead, since dark mode here
// is scoped to /marketing-four only.
export function BrandContextMenu({ children }: { children: React.ReactNode }) {
  const { dark } = useMarketingTwoTheme()
  const { copyToClipboard } = useCopyToClipboard()

  const logoMarkSvgString = getLogoMarkSVG(dark ? "#fff" : "#000")

  const handleCopy = useCallback(() => {
    copyToClipboard(logoMarkSvgString)
    toast.success("Icon as SVG copied")
  }, [logoMarkSvgString, copyToClipboard])

  const handleDownload = useCallback(() => {
    const blob = new Blob([logoMarkSvgString], {
      type: "image/svg+xml;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "icon.svg"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Icon as SVG downloaded")
  }, [logoMarkSvgString])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent className={cn("marketing-four-root", dark && "dark")}>
        <ContextMenuItem onClick={handleCopy}>
          <LogoMark />
          Copy as SVG
        </ContextMenuItem>

        <ContextMenuItem onClick={handleDownload}>
          <DownloadIcon /> Download as SVG
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
