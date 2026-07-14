"use client"

import { Check, PanelLeft, Square } from "lucide-react"
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useSidebarLayout } from "@/components/sidebar-layout-provider"
import type { SidebarLayout } from "@/lib/sidebar-layout"

const menuItemClass =
  "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

function LayoutOption({
  value,
  label,
  description,
  icon: Icon,
  inline,
}: {
  value: SidebarLayout
  label: string
  description: string
  icon: typeof PanelLeft
  inline?: boolean
}) {
  const { layout, setLayout } = useSidebarLayout()
  const active = layout === value

  if (inline) {
    return (
      <button
        type="button"
        className={cn(menuItemClass, "w-full text-left hover:bg-accent hover:text-accent-foreground")}
        onClick={() => setLayout(value)}
      >
        <Icon className="size-4" />
        <span className="flex-1">{label}</span>
        {active && <Check className="size-4 text-foreground" />}
      </button>
    )
  }

  return (
    <DropdownMenuItem onClick={() => setLayout(value)}>
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {active && <Check className="size-4 text-foreground" />}
      <span className="sr-only">{description}</span>
    </DropdownMenuItem>
  )
}

export function SidebarLayoutSwitcher({ inline = false }: { inline?: boolean }) {
  const { switcherEnabled } = useSidebarLayout()
  if (!switcherEnabled) return null

  if (inline) {
    return (
      <>
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sidebar layout</p>
        <LayoutOption
          inline
          value="inset"
          label="Inset"
          description="Rounded content card with padded sidebar"
          icon={Square}
        />
        <LayoutOption
          inline
          value="sidebar"
          label="Sidebar"
          description="Edge-to-edge sidebar rail"
          icon={PanelLeft}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
        Sidebar layout
      </DropdownMenuLabel>
      <LayoutOption
        value="inset"
        label="Inset"
        description="Rounded content card with padded sidebar"
        icon={Square}
      />
      <LayoutOption
        value="sidebar"
        label="Sidebar"
        description="Edge-to-edge sidebar rail"
        icon={PanelLeft}
      />
    </>
  )
}
