import { NextRequest, NextResponse } from "next/server";
import { validateSession, verifyShopifyToken } from "@/lib/auth";

const GLEAP_TOKEN = process.env.GLEAP_TOKEN || "";
const GLEAP_PROJECT = process.env.GLEAP_PROJECT || "";

export async function POST(request: NextRequest) {
  try {
    const { orderId, items } = await request.json();

    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) return NextResponse.json({ error: session.error }, { status: 401 });

    const { email: sessionEmail, accessToken } = session;
    const shop = process.env.SHOPIFY_STORE_URL!;
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN!;

    const shopRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": shopifyAccessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `query { shop { id } }` }),
    });
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id.split("/").pop();

    const isValid = await verifyShopifyToken(accessToken!);
    if (!isValid) return NextResponse.json({ error: "Session revoked." }, { status: 401 });

    const sessionRes = await fetch("https://api.gleap.io/v3/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GLEAP_TOKEN}`, Project: GLEAP_PROJECT, "Content-Type": "application/json" },
      body: JSON.stringify({ email: sessionEmail, name: `Customer (Order #${orderId})`, userId: sessionEmail }),
    });
    const sessionData = await sessionRes.json();

    const itemDetails = items
      .map((i: { title: string; quantity: number; reason: string; description: string }) =>
        `Item: ${i.title}\nQuantity: ${i.quantity}\nReason: ${i.reason}\nExplanation: ${i.description}\n`
      )
      .join("\n-------------------\n\n");

    const ticketRes = await fetch("https://api.gleap.io/v3/tickets", {
      method: "POST",
      headers: { Authorization: `Bearer ${GLEAP_TOKEN}`, Project: GLEAP_PROJECT, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Logistics Claim: Order ${orderId}`,
        type: "BUG",
        session: sessionData.id,
        formData: { description: `LOGISTICS CLAIM SUBMITTED\n\nOrder: ${orderId}\n\n${itemDetails}` },
      }),
    });

    if (!ticketRes.ok) throw new Error("Gleap submission failed.");
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
