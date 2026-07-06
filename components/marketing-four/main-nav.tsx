"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { playClick } from "@/lib/sound"
import { triggerHaptic } from "@/lib/haptics"

// Ported from shadcn-labs/startercn components/main-nav.tsx (MIT — see
// NOTICE.md). Their custom Button `sound` prop and Link `transitionTypes`
// are replaced with our own click feedback helpers.
export const MainNav = ({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string }[]
}) => {
  const pathname = usePathname()

  return (
    <nav className={cn("items-center gap-0.5", className)} {...props}>
      {items.map((item) => (
        <Button key={item.href} variant="ghost" asChild size="sm">
          <Link
            href={item.href}
            onClick={() => { void playClick(); triggerHaptic("selection") }}
            className={cn(pathname === item.href && "text-primary")}
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
