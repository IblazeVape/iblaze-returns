"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ZapIcon, Palette, Clock, Truck, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink,
  NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { MaxWidthWrapper } from "@/components/marketing/max-width-wrapper"
import { AnimationContainer } from "@/components/marketing/animation-container"
import { MobileNav } from "@/components/marketing/mobile-nav"

const FEATURES = [
  { title: "Branded portal", href: "#features", icon: Palette, tagline: "Custom domain, logo, and colours." },
  { title: "Return windows", href: "#features", icon: Clock, tagline: "Configurable expiry rules per product." },
  { title: "Shopify sync", href: "#features", icon: Truck, tagline: "Orders and refunds update in real time." },
  { title: "Admin panel", href: "#admin", icon: LayoutDashboard, tagline: "One dashboard for every store." },
]

export function Navbar() {
  const [scroll, setScroll] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScroll(window.scrollY > 8)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={cn(
      "sticky top-0 inset-x-0 z-40 h-14 w-full select-none border-b border-transparent",
      scroll && "border-white/10 bg-background/40 backdrop-blur-md",
    )}>
      <AnimationContainer reverse delay={0.1} className="size-full">
        <MaxWidthWrapper className="flex items-center justify-between">
          <div className="flex items-center space-x-12">
            <Link href="/marketing">
              <span className="text-lg font-bold !leading-none">Reflow</span>
            </Link>

            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-1 rounded-xl p-4 lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                      <li className="relative row-span-4 overflow-hidden rounded-lg pr-2">
                        <div className="absolute inset-0 z-10 h-full w-[calc(100%-10px)] bg-[linear-gradient(to_right,rgb(38,38,38,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgb(38,38,38,0.5)_1px,transparent_1px)] bg-[size:1rem_1rem]" />
                        <NavigationMenuLink asChild className="relative z-20">
                          <a href="#features" className="flex h-full w-full select-none flex-col justify-end rounded-lg bg-gradient-to-b from-muted/50 to-muted p-4 no-underline outline-none focus:shadow-md">
                            <h6 className="mb-2 mt-4 text-lg font-medium">All features</h6>
                            <p className="text-sm leading-tight text-muted-foreground">Branding, rules, sync, and the admin panel.</p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      {FEATURES.map((item) => (
                        <li key={item.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={item.href}
                              className="block select-none space-y-1 rounded-lg p-3 leading-none outline-none transition-all duration-100 ease-out hover:bg-accent hover:text-accent-foreground"
                            >
                              <div className="flex items-center space-x-2 text-neutral-300">
                                <item.icon className="size-4" />
                                <h6 className="text-sm font-medium !leading-none">{item.title}</h6>
                              </div>
                              <p className="line-clamp-1 text-sm leading-snug text-muted-foreground">{item.tagline}</p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <a href="#pricing">Pricing</a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                    <a href="#faq">FAQ</a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden lg:flex items-center gap-x-4">
            <Link href="/sign-in" className={buttonVariants({ size: "sm", variant: "ghost" })}>
              Sign In
            </Link>
            <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">
              <Link href="/sign-up">
                Get Started
                <ZapIcon className="ml-1.5 size-3.5 fill-orange-500 text-orange-500" />
              </Link>
            </Button>
          </div>

          <MobileNav />
        </MaxWidthWrapper>
      </AnimationContainer>
    </header>
  )
}
