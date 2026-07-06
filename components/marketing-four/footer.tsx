import Link from "next/link"
import { Package2 } from "lucide-react"

const LINKS = [
  { title: "Docs", href: "/docs" },
  { title: "Installation", href: "/docs/installation" },
  { title: "Customization", href: "/docs/customization" },
  { title: "FAQ", href: "/docs/faq" },
]

export function MarketingFourFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
        <Link href="/marketing-four" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Package2 className="size-3.5" />
          </span>
          <span className="text-sm font-semibold">Reflow</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.title}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-muted-foreground">
          &copy;{new Date().getFullYear()} Reflow
        </p>
      </div>
    </footer>
  )
}
