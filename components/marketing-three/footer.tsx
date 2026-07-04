import Link from "next/link"
import { Github, Package2, Twitter } from "lucide-react"
import { Accent, Button, Container } from "./frame"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#workflow" },
      { label: "Pricing", href: "#pricing" },
      { label: "Reviews", href: "#reviews" },
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
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "GDPR", href: "#" },
    ],
  },
]

export function FooterThree() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/50">
      {/* CTA band */}
      <Container className="py-16">
        <div className="overflow-hidden rounded-3xl bg-zinc-950 px-6 py-14 text-center text-white sm:px-12">
          <p
            style={{ fontFamily: "var(--font-kalam)" }}
            className="text-base text-zinc-400 underline decoration-zinc-700 decoration-1 underline-offset-4"
          >
            Ready when you are
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Make Returns Your <Accent>Best</Accent> Customer Experience
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-400">
            Join 1,600+ Shopify brands turning returns from a cost center into loyal, repeat
            customers.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href="/portal"
              size="lg"
              icon
              className="bg-white text-zinc-900 hover:bg-zinc-100"
            >
              Start free trial
            </Button>
            <Button
              href="#pricing"
              size="lg"
              variant="outline"
              className="border-zinc-700 bg-transparent text-white hover:bg-white/10"
            >
              View pricing
            </Button>
          </div>
        </div>
      </Container>

      {/* link columns */}
      <Container className="pb-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/marketing-three" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Package2 className="size-4" />
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-zinc-900">Reflow</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              The branded returns platform for Shopify brands that want fewer refunds and more
              repeat customers.
            </p>
            <div className="mt-5 flex gap-2">
              <SocialIcon label="Twitter">
                <Twitter className="size-4" />
              </SocialIcon>
              <SocialIcon label="GitHub">
                <Github className="size-4" />
              </SocialIcon>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-zinc-900">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Reflow. All rights reserved.</p>
          <p>Built for Shopify brands.</p>
        </div>
      </Container>
    </footer>
  )
}

function SocialIcon({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      {children}
    </a>
  )
}
