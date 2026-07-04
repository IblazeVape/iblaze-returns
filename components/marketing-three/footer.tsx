import Link from "next/link"
import { Package2 } from "lucide-react"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Workflow", href: "#workflow" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Help center", href: "#" },
      { label: "Status", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
]

export function FooterThree() {
  return (
    <footer className="relative">
      <div aria-hidden className="border-t border-dashed border-zinc-300" />
      <div className="px-2 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/marketing-three" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Package2 className="size-4" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-zinc-900">Reflow</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              The branded returns platform for Shopify brands that want fewer refunds and more repeat customers.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-zinc-900">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-dashed border-zinc-300 pt-6 text-xs text-zinc-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Reflow. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-zinc-700">Privacy</a>
            <a href="#" className="transition-colors hover:text-zinc-700">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
