"use client"

import * as React from "react"
import { ShoppingBag, Search, ExternalLink, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { isGuestOrderContext, lookupAnotherOrder, getAppsReturnsIdentityKind } from "@/lib/apps-returns-portal-mode"
import { getSidebarIcon } from "@/lib/sidebar-icons"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

type SidebarLinkData = { label: string; url: string; icon?: string; children?: { label: string; url: string; icon?: string }[] }

type SidebarBranding = {
  name: string
  logoUrl: string
  storefrontUrl: string
  sidebarLinks?: SidebarLinkData[]
  sidebarNote?: string
  sidebarSubmenusExpandedByDefault?: boolean
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: { name: string; email: string }
  onNavigate?: (section: string) => void
  activeSection?: string
  branding?: SidebarBranding
}

/** Renders **double-asterisk** spans as <strong> — the only formatting the
 * Settings page's sidebar note field supports, so this is a small regex
 * split rather than a markdown dependency. */
function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  )
}

function SidebarCustomLinks({
  links,
  note,
  submenusExpandedByDefault = true,
}: {
  links?: SidebarLinkData[]
  note?: string
  submenusExpandedByDefault?: boolean
}) {
  if (!links?.length && !note) return null
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        {links && links.length > 0 && (
          <SidebarMenu>
            {links.map((link) => {
              const Icon = getSidebarIcon(link.icon) ?? ExternalLink
              const hasChildren = !!link.children?.length
              // The parent link navigates on click (own <a>), so the
              // expand/collapse toggle has to be a separate control next to
              // it rather than the same clickable element — nesting an
              // interactive toggle inside an <a> isn't valid, and would
              // conflict with normal link clicks anyway.
              return (
                <SidebarMenuItem key={link.label}>
                  <Collapsible defaultOpen={submenusExpandedByDefault} className="group/collapsible">
                    <div className="flex items-center">
                      <SidebarMenuButton tooltip={link.label} asChild className="flex-1">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Icon className="size-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                        </a>
                      </SidebarMenuButton>
                      {hasChildren && (
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Toggle ${link.label} submenu`}
                            className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
                          >
                            <ChevronRight className="size-3.5 opacity-50 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {hasChildren && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {link.children!.map((child) => {
                            const ChildIcon = getSidebarIcon(child.icon)
                            return (
                              <SidebarMenuSubItem key={child.label}>
                                <SidebarMenuSubButton asChild>
                                  <a href={child.url} target="_blank" rel="noopener noreferrer">
                                    {ChildIcon && <ChildIcon className="size-3.5 shrink-0" />}
                                    <span>{child.label}</span>
                                  </a>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        )}
        {note && (
          <p className="px-2 py-1.5 text-xs text-sidebar-foreground/70 leading-snug group-data-[collapsible=icon]:hidden">
            <BoldText text={note} />
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function SidebarBrandHeader({ branding }: { branding?: { name: string; logoUrl: string; storefrontUrl: string } }) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const storeUrl = branding?.storefrontUrl || "https://iblazevape.co.uk"
  const logoUrl = branding?.logoUrl || "https://cdn.shopify.com/s/files/1/0941/5383/4761/files/IblazeLogo.png?v=14858"
  const brandName = branding?.name || "iBlaze Returns"

  return (
    <SidebarHeader
      className={cn(
        "flex min-[1025px]:pt-3.5",
        isCollapsed
          ? "flex-row items-center justify-between gap-y-4 min-[1025px]:flex-col min-[1025px]:items-center min-[1025px]:justify-start"
          : "flex-row items-center justify-between"
      )}
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className="data-[slot=sidebar-menu-button]:p-1.5! group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:hover:bg-transparent brand-logo-button"
          >
            <a
              href={storeUrl}
              target="_blank"
              className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                className="size-8 shrink-0 object-contain object-center brand-logo-img"
                alt={brandName}
              />
              <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">{brandName}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

const LOOKUP_ANOTHER_ORDER_URL = "#lookup-another-order"

/** Placeholder identity shown in the account menu before a guest has
 * verified an order or logged in — same menu (NavUser, unmodified) as a
 * real customer sees, just no name/email yet, and a generic person icon
 * instead of an initial letter. */
const GUEST_PENDING_USER = { name: "Login to see all orders", email: "" }

export function AppSidebar({ user, onNavigate, activeSection, branding, ...props }: AppSidebarProps) {
  // Guest hasn't verified an order yet (still on the lookup form) — nothing
  // to navigate to yet.
  const isGuestPending = getAppsReturnsIdentityKind() === "guest-or-login" && !isGuestOrderContext()
  // Guests verified exactly one order — there's no list to browse back to,
  // so "My Orders" is replaced with an action that takes them back to the
  // lookup form instead.
  const navMain = isGuestPending
    ? []
    : isGuestOrderContext()
      ? [{ title: "Return another order", url: LOOKUP_ANOTHER_ORDER_URL, icon: Search }]
      : [{ title: "My Orders", url: "#orders", icon: ShoppingBag }]
  const handleNavigate = (url: string) => {
    if (url === LOOKUP_ANOTHER_ORDER_URL) {
      lookupAnotherOrder()
      return
    }
    onNavigate?.(url)
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrandHeader branding={branding} />
      <SidebarContent className="styled-scroll">
        <div className="flex min-h-0 flex-1 w-full flex-col group-data-[collapsible=icon]:items-center">
          {navMain.length > 0 && <NavMain items={navMain} onNavigate={handleNavigate} activeSection={activeSection} />}
          <SidebarCustomLinks
            links={branding?.sidebarLinks}
            note={branding?.sidebarNote}
            submenusExpandedByDefault={branding?.sidebarSubmenusExpandedByDefault}
          />
        </div>
      </SidebarContent>
      <SidebarFooter className="overflow-visible group-data-[collapsible=icon]:pb-3">
        <div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <NavUser
            user={isGuestPending ? GUEST_PENDING_USER : user || { name: "Customer", email: "" }}
            avatarIcon={isGuestPending}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
