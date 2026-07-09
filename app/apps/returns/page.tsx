import { verifyAppProxySignature, parseProxyRequest } from "@/lib/app-proxy";
import { getTenant } from "@/lib/tenant";
import { shopifyAdmin } from "@/lib/shopify";

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
 */
export default async function AppProxyReturnsPage({
  searchParams,
}: {
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
    return (
      <Notice
        title="Please log in to your account"
        body="Log into your store account and open your order to start a return."
      />
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
