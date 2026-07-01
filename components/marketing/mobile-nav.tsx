"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface NavGroup {
  title: string
  links?: { title: string; href: string }[]
  href?: string
}

const NAV_LINKS: NavGroup[] = [
  {
    title: "Features",
    links: [
      { title: "Branded portal", href: "#features" },
      { title: "Return windows", href: "#features" },
      { title: "Shopify sync", href: "#features" },
      { title: "Admin panel", href: "#admin" },
    ],
  },
  { title: "Pricing", href: "#pricing" },
  { title: "FAQ", href: "#faq" },
]

const DARK_VARS = {
  "--popover": "0 0% 4%",
  "--popover-foreground": "0 0% 98%",
  "--border": "0 0% 10%",
  "--accent": "0 0% 7%",
  "--accent-foreground": "0 0% 98%",
  "--muted-foreground": "0 0% 63%",
  "--background": "0 0% 0.78%",
  "--foreground": "0 0% 98%",
} as CSSProperties

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const handleClose = () => setIsOpen(false)

  return (
    <div className="flex md:hidden items-center justify-end">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent style={DARK_VARS} className="w-screen border-white/10">
          <SheetClose asChild className="absolute right-5 top-3 z-20 flex items-center justify-center bg-background">
            <Button size="icon" variant="ghost" className="text-neutral-400">
              <X className="size-5" />
            </Button>
          </SheetClose>
          <div className="mt-10 flex w-full flex-col items-start py-2">
            <div className="flex w-full items-center justify-evenly gap-2">
              <Link href="/sign-in" onClick={handleClose} className="w-full">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href="/sign-up" onClick={handleClose} className="w-full">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">Sign Up</Button>
              </Link>
            </div>
            <ul className="mt-6 flex w-full flex-col items-start">
              <Accordion type="single" collapsible className="!w-full">
                {NAV_LINKS.map((link) => (
                  <AccordionItem key={link.title} value={link.title} className="border-white/10 last:border-none">
                    {link.links ? (
                      <>
                        <AccordionTrigger>{link.title}</AccordionTrigger>
                        <AccordionContent>
                          <ul onClick={handleClose}>
                            {link.links.map((item) => (
                              <li key={item.title}>
                                <a href={item.href} className="block rounded-lg p-3 text-sm leading-none text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground">
                                  {item.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </>
                    ) : (
                      <a
                        href={link.href}
                        onClick={handleClose}
                        className="flex w-full items-center py-4 font-medium text-muted-foreground hover:text-foreground"
                      >
                        <span>{link.title}</span>
                      </a>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
