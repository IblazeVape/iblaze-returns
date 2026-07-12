import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { validateAppsReturnsSession, APPS_RETURNS_COOKIE_NAME } from "@/lib/apps-returns-session";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";
import DashboardClient from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

/**
 * Shopify App Proxy entry: theirstore.com/apps/returns
 *
 * Renders the SAME DashboardClient used by the legacy iBlaze portal (`/`),
 * for ANY tenant. Identity comes from one of two places:
 *  - Logged-in customer: signed proxy request -> redirect to /apps/returns/
 *    session (mints apps_returns_session) -> re-render here, cookie present.
 *  - Guest: order-lookup form -> guest-lookup route mints a session scoped to
 *    the one verified order -> reload here, cookie present.
 * Once apps_returns_session exists, DashboardClient's own fetches (get-orders
 * etc.) resolve the shop from it via lib/request-shop.ts — no proxy signature
 * needed on those, only on this initial page load.
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
  // Fast path: an existing session (logged-in or guest-scoped) renders the
  // real portal directly — no need to re-verify a proxy signature here.
  const cookieStore = await cookies();
  const session = validateAppsReturnsSession(cookieStore.get(APPS_RETURNS_COOKIE_NAME)?.value);
  if (session.valid) {
    return <DashboardClient />;
  }

  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") query.set(k, v);
    else if (Array.isArray(v)) v.forEach((val) => query.append(k, val));
  }

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  const signedOk = !!secret && verifyAppProxySignature(query, secret);

  if (!signedOk) {
    return (
      <Notice
        title="Open your returns portal from your store"
        body="This page must be reached through your shop (the Returns link on your order). The request wasn't a valid Shopify App Proxy request."
      />
    );
  }

  const { shop, loggedInCustomerId } = parseProxyRequest(query);
  const tenant = await getTenant(shop);

  if (!tenant?.accessToken) {
    return (
      <Notice
        title="This store isn't set up yet"
        body={`No tenant record for ${shop}. The merchant needs to (re)install the app.`}
      />
    );
  }

  if (loggedInCustomerId) {
    // Signed + logged in, but no session cookie yet — mint it, then land back
    // here with the cookie present (fast path above).
    redirect(`/apps/returns/session?${query.toString()}`);
  }

  // Not logged in — but NOT everyone has a Shopify account: guest checkout
  // means there's no account to log into at all. Forcing a login redirect
  // here would block guest-checkout customers from ever returning an item.
  // Offer both: log in (for account holders) or a guest order lookup
  // (order number + email + postcode) for everyone else.
  const loginUrl = `/account/login?return_url=${encodeURIComponent("/apps/returns")}`;
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <GuestLookupForm />
      <div style={{ color: "#888", fontSize: "0.85rem" }}>— or —</div>
      <a href={loginUrl} style={{ color: "#111", fontSize: "0.95rem", fontWeight: 600 }}>
        Log in to see all your orders
      </a>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{title}</h1>
        <p style={{ color: "#555", lineHeight: 1.5 }}>{body}</p>
      </div>
    </main>
  );
}
