"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn's MainNav (MIT — see NOTICE.md).
// Their `transitionTypes` prop on next/link is part of their own View
// Transitions setup and isn't ported (no equivalent infra here).
export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[]
}) {
  const pathname = usePathname()

  return (
    <nav className={cn("items-center gap-0.5", className)} {...props}>
      {items.map((item) => (
        <Button key={item.href} variant="ghost" asChild size="sm" sound="click">
          <Link href={item.href} className={cn(pathname === item.href && "text-primary")}>
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
