import { NextRequest, NextResponse } from "next/server";
import { validateSession, verifyShopifyToken } from "@/lib/auth";
import { getShopifyToken } from "@/lib/redis";
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
    const fullOrderId = `gid://shopify/Order/${orderId}`;

    // *** ROOT CAUSE FIX ***
    // The Shopify Admin token lives in Redis (set by /api/shopify-callback)
    // NOT in process.env.SHOPIFY_ACCESS_TOKEN (which doesn't exist in Vercel env)
    const shopifyAccessToken = await getShopifyToken();
    if (!shopifyAccessToken) {
      console.error("No Shopify Admin token in Redis. Visit /api/shopify-callback to install.");
      return NextResponse.json(
        { error: "Store configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const getFulfQuery = `
      query {
        shop { id }
        order(id: "${fullOrderId}") { name statusPageUrl email }
        returnableFulfillments(orderId: "${fullOrderId}", first: 10) {
          edges {
            node {
              returnableFulfillmentLineItems(first: 50) {
                edges {
                  node {
                    fulfillmentLineItem {
                      id
                      lineItem {
                        id title variantTitle
                        image { url }
                        discountedUnitPriceSet { shopMoney { amount } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const getFulfRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": shopifyAccessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query: getFulfQuery }),
    });

    const getFulfData = await getFulfRes.json();

    if (getFulfData.errors) {
      const errMsg = Array.isArray(getFulfData.errors)
        ? getFulfData.errors.map((e: { message?: string }) => e.message || "GraphQL error").join(" | ")
        : String(getFulfData.errors);
      throw new Error(errMsg);
    }

    // Verify customer session
    const shopId = getFulfData.data?.shop?.id?.split("/").pop();
    if (shopId && accessToken) {
      const isValid = await verifyShopifyToken(shopId, accessToken);
      if (!isValid) {
        return NextResponse.json({ error: "Session revoked. Please log in again." }, { status: 401 });
      }
    }

    const orderNode = getFulfData.data?.order || {};
    if (orderNode.email !== sessionEmail) {
      return NextResponse.json(
        { error: "You do not have permission to submit a return for this order." },
        { status: 403 }
      );
    }

    const fetchedOrderName = orderNode.name || `#${orderId}`;
    const fetchedStatusUrl = orderNode.statusPageUrl || `https://${shop}/account/orders`;

    // Map lineItemId → fulfillmentLineItemId
    const returnableMap: Record<string, string> = {};
    const productDetailsMap: Record<string, { title: string; variantTitle: string; image: string; price: string }> = {};

    for (const fEdge of getFulfData.data?.returnableFulfillments?.edges || []) {
      for (const iEdge of fEdge.node.returnableFulfillmentLineItems?.edges || []) {
        const flItem = iEdge.node.fulfillmentLineItem;
        if (flItem?.id && flItem?.lineItem?.id) {
          returnableMap[flItem.lineItem.id] = flItem.id;
          productDetailsMap[flItem.lineItem.id] = {
            title: flItem.lineItem.title,
            variantTitle: flItem.lineItem.variantTitle,
            image: flItem.lineItem.image?.url || "",
            price: flItem.lineItem.discountedUnitPriceSet?.shopMoney?.amount || "0.00",
          };
        }
      }
    }

    const returnLineItems = items.map((item: { lineItemId: string; quantity: number; reason: string; description?: string }) => {
      const fulfillmentLineItemId = returnableMap[item.lineItemId];
      if (!fulfillmentLineItemId) {
        throw new Error("One or more items are no longer eligible for return. They may have already been returned.");
      }
      return {
        fulfillmentLineItemId,
        quantity: item.quantity,
        returnReason: mapReasonToShopify(item.reason),
        customerNote: item.description || "",
      };
    });

    const reqRes = await fetch(`https://${shop}/admin/api/2024-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": shopifyAccessToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation RequestReturn($input: ReturnRequestInput!) {
          returnRequest(input: $input) {
            return { id status }
            userErrors { field message }
          }
        }`,
        variables: { input: { orderId: fullOrderId, returnLineItems } },
      }),
    });

    const reqData = await reqRes.json();
    if (reqData.errors) {
      const errMsg = Array.isArray(reqData.errors)
        ? reqData.errors.map((e: { message?: string }) => e.message || "GraphQL error").join(" | ")
        : String(reqData.errors);
      throw new Error(errMsg);
    }

    const userErrors = reqData.data?.returnRequest?.userErrors || [];
    if (userErrors.length > 0) {
      throw new Error(userErrors.map((e: { message: string }) => e.message).join(" | "));
    }

    const returnId = reqData.data.returnRequest.return.id;

    // Send confirmation email
    const emailItems = items.map((item: { lineItemId: string; quantity: number }) => {
      const d = productDetailsMap[item.lineItemId] || {};
      return { title: d.title || "Item", variantTitle: d.variantTitle || "", image: d.image || "", price: d.price || "0.00", quantity: item.quantity };
    });

    const htmlContent = getReturnRequestTemplate(
      { name: fetchedOrderName, order_status_url: fetchedStatusUrl },
      { url: "https://iblazevape.co.uk", email: "info@iblazevape.co.uk", email_accent_color: "#E5403B" },
      emailItems
    );
    await sendEmail({ toEmail: sessionEmail!, subject: `Return requested for order ${fetchedOrderName}`, html: htmlContent });

    return NextResponse.json({ success: true, returnId });
  } catch (err) {
    const error = err as Error;
    console.error("Submit Return Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
