import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";
import { GuestLookupForm } from "@/components/apps-returns/guest-lookup-form";

export const dynamic = "force-dynamic";

/**
 * Shopify App Proxy entry: theirstore.com/apps/returns
 *
 * FOUNDATION LAYER (this file): verify Shopify's signed proxy request, resolve
 * the tenant (shop) and the logged-in customer, and confirm the whole chain
 * works against a REAL signed request. This is the verifiable ground the full
 * portal UI gets built on next (server-rendering the customer's orders +
 * routing client mutations under /apps/returns, both of which must be developed
 * against the live proxy).
 *
 * CATCH-ALL ROUTE (`[[...slug]]`) is required here, not a plain page: a plain
 * Next.js route 308-redirects `/apps/returns/` -> `/apps/returns` (trailing
 * slash normalization). Shopify's App Proxy treats ANY redirect response from
 * the app as an instruction to redirect the customer's storefront browser to
 * that path — which re-enters proxy signing and calls this route again,
 * causing an infinite redirect loop entirely at Shopify's edge (confirmed:
 * `/apps/returns/apps/returns/...` never reaches our server past the first
 * hit). A catch-all matches every path/trailing-slash variant with zero
 * redirects, which is what this route must never do.
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

  if (!loggedInCustomerId) {
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

  // Resolve the customer (email + name) via the merchant's admin token — proves
  // the proxy → tenant → customer chain works with real per-tenant credentials.
  let email = "";
  let firstName = "";
  try {
    const gid = `gid://shopify/Customer/${loggedInCustomerId}`;
    const data = await shopifyAdmin(
      shop,
      `query GetCustomer($id: ID!) { customer(id: $id) { email firstName } }`,
      { id: gid },
      "AppProxyCustomerLookup"
    );
    email = data?.customer?.email ?? "";
    firstName = data?.customer?.firstName ?? "";
  } catch (e) {
    return (
      <Notice
        title="Couldn't load your account"
        body={`Tenant resolved (${shop}) but the customer lookup failed: ${(e as Error).message}`}
      />
    );
  }

  return (
    <Notice
      title={`✅ Multi-tenant proxy working${firstName ? `, ${firstName}` : ""}`}
      body={`Shop: ${shop} · Customer: ${email || loggedInCustomerId}. The full branded portal renders here next (server-rendered orders + proxy-routed actions).`}
    />
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
