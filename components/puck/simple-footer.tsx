"use client"

import Link from "next/link"
import {
  Dribbble,
  Facebook,
  Github,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react"
import { SimpleNavLogo } from "./simple-nav"

// Clean shadcn-style footer block for the page builder. Brand/logo, links,
// social icons, and the copyright line are all editable from the editor.

export interface SimpleFooterLink {
  title: string
  href: string
}

export interface SimpleFooterSocial {
  platform: string
  href: string
}

export interface SimpleFooterProps {
  logoUrl?: string
  brand?: string
  brandHref?: string
  links?: SimpleFooterLink[]
  socials?: SimpleFooterSocial[]
  copyright?: string
}

const DEFAULT_LINKS: SimpleFooterLink[] = [
  { title: "About", href: "/#about" },
  { title: "Contact", href: "/#contact" },
  { title: "Terms of Service", href: "/#terms" },
  { title: "Privacy Policy", href: "/#privacy" },
]

const DEFAULT_SOCIALS: SimpleFooterSocial[] = [
  { platform: "twitter", href: "#" },
  { platform: "instagram", href: "#" },
  { platform: "facebook", href: "#" },
]

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  dribbble: Dribbble,
}

export function SimpleFooter({
  logoUrl,
  brand = "Reflow",
  brandHref = "/",
  links = DEFAULT_LINKS,
  socials = DEFAULT_SOCIALS,
  copyright,
}: SimpleFooterProps) {
  return (
    <footer className="border-t bg-background px-6 py-2 text-foreground">
      <div className="mx-auto w-full max-w-screen-2xl divide-y">
        <div className="flex flex-col items-center justify-between gap-4 px-2 pt-3 pb-5 sm:flex-row">
          <Link className="flex items-center gap-2" href={brandHref}>
            <SimpleNavLogo logoUrl={logoUrl} brand={brand} />
          </Link>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-sm">
            {links.map(({ title, href }) => (
              <li key={title + href}>
                <Link href={href}>{title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col-reverse items-center justify-between gap-4 px-2 pt-4 pb-2 sm:flex-row">
          <p className="font-medium text-muted-foreground text-sm">
            Copyright &copy; {new Date().getFullYear()} {copyright || brand}. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {socials.map(({ platform, href }, i) => {
              const Icon = SOCIAL_ICONS[platform] || Twitter
              return (
                <Link key={platform + i} href={href} aria-label={platform}>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
