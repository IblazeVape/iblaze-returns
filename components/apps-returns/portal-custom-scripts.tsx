"use client"

import { useEffect } from "react"

/**
 * Merchant-supplied HTML/JS for third-party widgets (HelpCrunch, etc.).
 * Scripts in innerHTML do not execute — we re-create <script> nodes so they run.
 */
export function PortalCustomScripts({ html }: { html?: string }) {
  useEffect(() => {
    const raw = (html ?? "").trim()
    if (!raw) return

    const host = document.createElement("div")
    host.setAttribute("data-portal-custom-scripts", "true")
    host.style.display = "contents"
    document.body.appendChild(host)

    const template = document.createElement("template")
    template.innerHTML = raw
    const nodes = Array.from(template.content.childNodes)

    for (const node of nodes) {
      if (node.nodeName.toLowerCase() === "script") {
        const srcScript = node as HTMLScriptElement
        const s = document.createElement("script")
        for (const attr of Array.from(srcScript.attributes)) {
          s.setAttribute(attr.name, attr.value)
        }
        if (srcScript.textContent) s.textContent = srcScript.textContent
        host.appendChild(s)
      } else {
        host.appendChild(node.cloneNode(true))
      }
    }

    return () => {
      host.remove()
    }
  }, [html])

  return null
}
