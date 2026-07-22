import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { ClientPortalGate, type GateInitial, type InitialBranding } from "@/components/apps-returns/client-portal-gate";

export const dynamic = "force-dynamic";

/**
 * Shopify App Proxy entry: theirstore.com/apps/returns
 *
 * This server component ONLY verifies the signed proxy request and resolves
 * the tenant (needs the server-only secret + a DB lookup) — all rendering
 * and identity-session logic lives client-side in ClientPortalGate. See that
 * file for why: Shopify's App Proxy strips Set-Cookie on responses AND
 * normalizes any server-side redirect Location to our own Vercel origin
 * (both confirmed live), so neither cookies nor redirects can carry identity
 * through this flow — only a client-held token (localStorage) can.
 *
 * CATCH-ALL ROUTE (`[[...slug]]`) is required here, not a plain page: a plain
 * Next.js route 308-redirects `/apps/returns/` -> `/apps/returns` (trailing
 * slash normalization). Shopify's App Proxy treats ANY redirect response from
 * the app as an instruction to redirect the customer's storefront browser to
 * that path — which re-enters proxy signing and calls this route again,
 * causing an infinite redirect loop entirely at Shopify's edge. A catch-all
 * matches every path/trailing-slash variant with zero redirects.
 */
export default async function AppProxyReturnsPage({
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") query.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => query.append(k, val));
  }

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(query, secret);

  let initial: GateInitial;
  if (!signedOk) {
    initial = { kind: "unsigned" };
  } else {
    const { shop, loggedInCustomerId } = parseProxyRequest(query);
    const tenant = await getTenant(shop);
    if (!tenant?.accessToken) {
      initial = { kind: "not-set-up", shop };
    } else if (loggedInCustomerId && !tenant.branding.alwaysShowGuestLookup) {
      // Pass accent (+ toast/script) so AuthenticatingCard paints the real
      // brand colour immediately — no wait for /api/branding after mint.
      initial = {
        kind: "logged-in",
        branding: {
          accentColor: tenant.branding.accentColor,
          toastPosition: tenant.branding.toastPosition,
          portalCustomScript: tenant.branding.portalCustomScript,
        },
      };
    } else if (!loggedInCustomerId && !tenant.branding.guestLookupEnabled) {
      // Merchant disabled guest lookup — clientside redirect to store login
      // (App Proxy rewrites server Location headers, so we cannot 302 here).
      initial = { kind: "guest-login-required" };
    } else {
      const branding: InitialBranding = {
        name: tenant.branding.name,
        logoUrl: tenant.branding.logoUrl,
        accentColor: tenant.branding.accentColor,
        storefrontUrl: tenant.branding.storefrontUrl,
        storeLinkEnabled: tenant.branding.storeLinkEnabled,
        storeLinkLabel: tenant.branding.storeLinkLabel,
        sidebarLinks: tenant.branding.sidebarLinks,
        sidebarNote: tenant.branding.sidebarNote,
        sidebarLayoutSwitcherEnabled: tenant.branding.sidebarLayoutSwitcherEnabled,
        defaultSidebarLayout: tenant.branding.defaultSidebarLayout,
        sidebarEnabled: tenant.branding.sidebarEnabled,
        lookupSidebarEnabled: tenant.branding.lookupSidebarEnabled,
        sidebarDefaultOpenOnDesktop: tenant.branding.sidebarDefaultOpenOnDesktop,
        sidebarSubmenusExpandedByDefault: tenant.branding.sidebarSubmenusExpandedByDefault,
        guestBackgroundStyle: tenant.branding.guestBackgroundStyle,
        guestLookupLayout: tenant.branding.guestLookupLayout,
        guestLookupHeadline: tenant.branding.guestLookupHeadline,
        guestLookupSubtext: tenant.branding.guestLookupSubtext,
        guestLookupHeroUrl: tenant.branding.guestLookupHeroUrl,
        guestLookupBrandDisplay: tenant.branding.guestLookupBrandDisplay,
        guestLookupLogoUrl: tenant.branding.guestLookupLogoUrl,
        guestLookupOverlayOpacity: tenant.branding.guestLookupOverlayOpacity,
        guestLookupOverlayBlur: tenant.branding.guestLookupOverlayBlur,
        guestLookupSnakeBorder: tenant.branding.guestLookupSnakeBorder,
        guestLookupSideStyle: tenant.branding.guestLookupSideStyle,
        guestLookupGradientFrom: tenant.branding.guestLookupGradientFrom,
        guestLookupGradientTo: tenant.branding.guestLookupGradientTo,
        toastPosition: tenant.branding.toastPosition,
        portalCustomScript: tenant.branding.portalCustomScript,
        loggedInLookupRequirePostcode: tenant.branding.loggedInLookupRequirePostcode,
      };
      initial = loggedInCustomerId
        ? { kind: "logged-in-lookup", branding }
        : { kind: "guest-or-login", branding };
    }
  }

  return <ClientPortalGate initial={initial} />;
}
