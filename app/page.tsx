import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client";

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = validateSession(cookieHeader);

  if (!session.valid) {
    // Build Shopify OAuth URL and redirect directly
    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const redirectUri = `${appUrl}/api/callback`;

    const discoveryRes = await fetch(`https://${shopDomain}/.well-known/openid-configuration`);
    const authConfig = await discoveryRes.json();

    const authUrl = new URL(authConfig.authorization_endpoint);
    authUrl.searchParams.append("scope", "openid email customer-account-api:full");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", Math.random().toString(36).substring(2));

    redirect(authUrl.toString());
  }

  return <DashboardClient />;
}
