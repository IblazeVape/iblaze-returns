import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client";

const AUTH_URL = "https://account.iblazevape.co.uk/authentication/oauth/authorize";
const APP_URL = "https://iblaze-returns.vercel.app";

export default async function HomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = validateSession(cookieHeader);

  if (!session.valid) {
    const clientId = process.env.CUSTOMER_API_CLIENT_ID!;
    const redirectUri = `${APP_URL}/api/callback`;

    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.append("scope", "openid email customer-account-api:full");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", Math.random().toString(36).substring(2));

    redirect(authUrl.toString());
  }

  return <DashboardClient />;
}
