import { NextRequest, NextResponse } from "next/server";
import { validateSession, verifyShopifyToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mailjet";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReturnRequestTemplate } = require("@/lib/templates");

const mapReasonToShopify = (frontendReason: string) => {
  if (frontendReason === "WRONG_ITEM") return "WRONG_ITEM";
  if (frontendReason === "FAULTY" || frontendReason === "DAMAGED") return "DEFECTIVE";
  return "OTHER";
};

export async function POST(request: NextRequest) {
  try {
    const { orderId, items } = await request.json();

    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) return NextResponse.json({ error: session.error }, { status: 401 });

    const { email: sessionEmail, accessToken } = session;
    const shop = process.env.SHOPIFY_STORE_URL!;
    const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN!;
    const fullOrderId = `gid://shopify/Order/${orderId}`;

    const getFulfQuery = `
      query {
        shop { id }
        order(id: "${fullOrderId}") { name statusPageUrl email }
        returnableFulfillments(orderId: "${fullOrderId}", first: 10) {
          edges { node { returnableFulfillmentLineItems(first: 50) { edges { node { fulfillmentLineItem { id lineItem { id title variantTitle image { url } discountedUnitPriceSet { shopMoney { amount } } } } } } } } }
        }
      }
    `;

    const getFulfRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": shopifyAccessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: getFulfQuery }),
    });

    const getFulfData = await getFulfRes.json();
    if (getFulfData.errors) throw new Error(getFulfData.errors[0].message);

    const shopId = getFulfData.data.shop.id.split("/").pop();
    const isValid = await verifyShopifyToken(shopId, accessToken!);
    if (!isValid) return NextResponse.json({ error: "Session revoked. Please log in again." }, { status: 401 });

    const orderNode = getFulfData.data?.order || {};
    if (orderNode.email !== sessionEmail) {
      return NextResponse.json({ error: "You do not have permission to submit a return for this order." }, { status: 403 });
    }

    const fetchedOrderName = orderNode.name || `#${orderId}`;
    const fetchedStatusUrl = orderNode.statusPageUrl || `https://${shop}/account/orders`;

    const returnableMap: Record<string, string> = {};
    const productDetailsMap: Record<string, { title: string; variantTitle: string; image: string; price: string }> = {};

    const rfEdges = getFulfData.data?.returnableFulfillments?.edges || [];
    for (const fEdge of rfEdges) {
      const itemsEdges = fEdge.node.returnableFulfillmentLineItems?.edges || [];
      for (const iEdge of itemsEdges) {
        const flItem = iEdge.node.fulfillmentLineItem;
        const flId = flItem?.id;
        const liNode = flItem?.lineItem;
        const liId = liNode?.id;
        if (flId && liId) {
          returnableMap[liId] = flId;
          productDetailsMap[liId] = {
            title: liNode.title,
            variantTitle: liNode.variantTitle,
            image: liNode.image?.url || "",
            price: liNode.discountedUnitPriceSet?.shopMoney?.amount || "0.00",
          };
        }
      }
    }

    const returnLineItems = items.map((item: { lineItemId: string; quantity: number; reason: string; description?: string }) => {
      const fulfillmentLineItemId = returnableMap[item.lineItemId];
      if (!fulfillmentLineItemId) throw new Error("Item is no longer returnable.");
      return {
        fulfillmentLineItemId,
        quantity: item.quantity,
        returnReason: mapReasonToShopify(item.reason),
        customerNote: item.description || "",
      };
    });

    const requestMutation = `
      mutation RequestReturn($input: ReturnRequestInput!) {
        returnRequest(input: $input) {
          return { id status }
          userErrors { field message }
        }
      }
    `;

    const reqRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": shopifyAccessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: requestMutation, variables: { input: { orderId: fullOrderId, returnLineItems } } }),
    });

    const reqData = await reqRes.json();
    if (reqData.errors) throw new Error(reqData.errors[0].message);

    const userErrors = reqData.data?.returnRequest?.userErrors || [];
    if (userErrors.length > 0) throw new Error(userErrors.map((e: { message: string }) => e.message).join(" | "));

    const returnId = reqData.data.returnRequest.return.id;

    const emailItems = items.map((item: { lineItemId: string; quantity: number }) => {
      const details = productDetailsMap[item.lineItemId] || {};
      return { title: details.title || "Returned Item", variantTitle: details.variantTitle || "", image: details.image || "", price: details.price || "0.00", quantity: item.quantity };
    });

    const orderParams = { name: fetchedOrderName, order_status_url: fetchedStatusUrl };
    const shopParams = { url: "https://iblazevape.co.uk", email: "info@iblazevape.co.uk", email_accent_color: "#E5403B" };
    const htmlContent = getReturnRequestTemplate(orderParams, shopParams, emailItems);

    await sendEmail({ toEmail: sessionEmail!, subject: `Return requested for order ${orderParams.name}`, html: htmlContent });

    return NextResponse.json({ success: true, returnId });
  } catch (err) {
    const error = err as Error;
    console.error("Submit Return Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
