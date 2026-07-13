import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyQueryHmac } from "@/lib/shopify-hmac";
import { validateMerchantSession, MERCHANT_COOKIE_NAME } from "@/lib/merchant-session";
import { getTenant, getTenantToken, DEFAULT_TENANT_FIELDS } from "@/lib/tenant";
import { SettingsForm } from "@/components/app-settings/settings-form";

export const dynamic = "force-dynamic";

/**
 * Merchant app entry — the app's `application_url`. This is what Shopify opens
 * when a merchant installs or opens the app (NOT the customer portal at `/`).
 *
 * Automatic install lifecycle:
 *  - Merchant opens the app → Shopify sends ?shop&hmac&host (signed).
 *  - If we don't yet have a valid admin token for that shop → redirect to the
 *    admin OAuth (/api/shopify-callback), which captures the token and sets a
 *    signed merchant_session cookie. No manual URL, ever.
 *  - With a token (or a valid merchant_session), show the merchant home
 *    (placeholder for the Settings page — the next sub-project).
 */
export default async function MerchantAppEntry({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const secret = process.env.SHOPIFY_CLIENT_SECRET!;

  // 1) Fresh Shopify app-load context (signed ?shop&hmac).
  const shopParam = typeof sp.shop === "string" ? sp.shop : undefined;
  if (shopParam && sp.hmac) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") query.set(k, v);
      else if (Array.isArray(v)) v.forEach((val) => query.append(k, val));
    }
    if (verifyQueryHmac(query, secret)) {
      const token = await getTenantToken(shopParam);
      if (!token) {
        // Auto-capture the admin token — no manual step.
        redirect(`/api/shopify-callback?shop=${encodeURIComponent(shopParam)}`);
      }
      return <MerchantHome shop={shopParam} />;
    }
  }

  // 2) Returning merchant with a valid signed session cookie.
  const session = validateMerchantSession(cookieStore.get(MERCHANT_COOKIE_NAME)?.value);
  if (session.valid && session.shop) {
    return <MerchantHome shop={session.shop} />;
  }

  // 3) Reached without Shopify context — tell them to open it from admin.
  return (
    <Shell
      title="Open this app from your Shopify admin"
      body="This is the iBlaze Returns admin. Open it from Apps in your Shopify admin to manage your returns portal."
    />
  );
}

async function MerchantHome({ shop }: { shop: string }) {
  const tenant = await getTenant(shop);
  return (
    <SettingsForm
      initialBranding={tenant?.branding ?? DEFAULT_TENANT_FIELDS.branding}
      initialReturnWindowDays={tenant?.returnWindowDays ?? DEFAULT_TENANT_FIELDS.returnWindowDays}
    />
  );
}

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 650, marginBottom: "0.5rem" }}>{title}</h1>
        <p style={{ color: "#555", lineHeight: 1.55 }}>{body}</p>
      </div>
    </main>
  );
}
