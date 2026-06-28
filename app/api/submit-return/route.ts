import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { getShopifyToken } from "@/lib/redis";
import { sendEmail } from "@/lib/mailjet";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReturnRequestTemplate } = require("@/lib/templates");

// ── Return reason mapping ────────────────────────────────────────────────────
//
// Shopify Admin API 2025-04 confirmed reason enums from the ReturnReason scalar:
//   WRONG_ITEM | DEFECTIVE | UNWANTED | SIZE_TOO_SMALL | SIZE_TOO_LARGE |
//   STYLE | COLOR | NOT_AS_DESCRIBED | UNKNOWN | OTHER
//
// We map our portal's reason labels → the closest Shopify enum.
// The customer's original label is always preserved in customerNote.
const REASON_LABEL_MAP: Record<string, string> = {
  CHANGED_MIND:     "Changed my mind",
  WRONG_ITEM:       "Wrong item received",
  FAULTY:           "Faulty / not working",
  DAMAGED:          "Damaged in transit",
  NOT_AS_DESCRIBED: "Not as described",
  OTHER:            "Other",
};

const mapReasonToShopify = (frontendReason: string): string => {
  switch (frontendReason) {
    case "WRONG_ITEM":       return "WRONG_ITEM";
    case "FAULTY":           return "DEFECTIVE";
    case "DAMAGED":          return "DEFECTIVE";
    case "NOT_AS_DESCRIBED": return "NOT_AS_DESCRIBED";
    case "CHANGED_MIND":     return "UNWANTED";
    default:
      // Log unexpected reasons so we can extend the map
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[submit-return] Unknown reason "${frontendReason}" — falling back to OTHER`);
      }
      return "OTHER";
  }
};

// Prepend the human-readable reason label to the customerNote so merchants
// see the full reason in Admin even when Shopify's enum is coarser.
const buildCustomerNote = (frontendReason: string, description: string): string => {
  const label = REASON_LABEL_MAP[frontendReason] ?? frontendReason;
  const note = description?.trim() ?? "";
  return note ? `${label}: ${note}` : label;
};

// ── Submission fingerprint (idempotency) ────────────────────────────────────
// A simple hash of orderId + sorted lineItemId:qty:reason tuples.
// Prevents duplicate Return records from double-taps / slow networks.
const pendingSubmissions = new Map<string, number>();

function buildFingerprint(
  orderId: string,
  items: { lineItemId: string; quantity: number; reason: string }[]
): string {
  const sorted = [...items]
    .sort((a, b) => a.lineItemId.localeCompare(b.lineItemId))
    .map(i => `${i.lineItemId}:${i.quantity}:${i.reason}`)
    .join("|");
  return `${orderId}||${sorted}`;
}

// ── userErrors → structured error codes ─────────────────────────────────────
type ReturnErrorCode =
  | "ELIGIBILITY_CHANGED"
  | "INVALID_QUANTITY"
  | "PERMISSION_DENIED"
  | "THROTTLED"
  | "DUPLICATE_SUBMISSION"
  | "UNKNOWN";

function classifyUserErrors(
  userErrors: { field?: string[]; message?: string }[]
): { code: ReturnErrorCode; message: string } {
  for (const e of userErrors) {
    const msg = (e.message ?? "").toLowerCase();
    if (msg.includes("no longer eligible") || msg.includes("not eligible") || msg.includes("returnable"))
      return { code: "ELIGIBILITY_CHANGED", message: "Some items are no longer eligible. Please refresh and try again." };
    if (msg.includes("quantity"))
      return { code: "INVALID_QUANTITY", message: "The requested quantity is invalid. Please refresh and try again." };
    if (msg.includes("permission") || msg.includes("unauthorized") || msg.includes("forbidden"))
      return { code: "PERMISSION_DENIED", message: "You don't have permission to return this order." };
    if (msg.includes("throttl") || msg.includes("rate limit"))
      return { code: "THROTTLED", message: "Too many requests. Please wait a moment and try again." };
    if (msg.includes("duplicate") || msg.includes("already"))
      return { code: "DUPLICATE_SUBMISSION", message: "This return has already been submitted." };
  }
  const first = userErrors[0]?.message ?? "Something went wrong.";
  return { code: "UNKNOWN", message: first };
}

const SHOPIFY_API_VERSION = "2025-04";

export async function POST(request: NextRequest) {
  try {
    const { orderId, items } = await request.json();

    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) return NextResponse.json({ error: session.error }, { status: 401 });

    const { email: sessionEmail, accessToken } = session;
    const shop = process.env.SHOPIFY_STORE_URL!;
    const fullOrderId = `gid://shopify/Order/${orderId}`;

    // ── Idempotency check ────────────────────────────────────────────────────
    const fingerprint = buildFingerprint(orderId, items);
    const lastSubmit = pendingSubmissions.get(fingerprint);
    const now = Date.now();
    if (lastSubmit && now - lastSubmit < 30_000) {
      return NextResponse.json(
        { error: "This return was already submitted. Please wait before trying again.", code: "DUPLICATE_SUBMISSION" },
        { status: 409 }
      );
    }
    pendingSubmissions.set(fingerprint, now);
    // Clean up old entries to avoid memory leak
    for (const [key, ts] of pendingSubmissions) {
      if (now - ts > 60_000) pendingSubmissions.delete(key);
    }
    // ─────────────────────────────────────────────────────────────────────────

    void accessToken; // Customer Account token present in session — not used for Admin mutations

    const shopifyAccessToken = await getShopifyToken();
    if (!shopifyAccessToken) {
      console.error("No Shopify Admin token in Redis. Visit /api/shopify-callback to install.");
      return NextResponse.json(
        { error: "Store configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const adminFetch = (query: string, variables?: Record<string, unknown>) =>
      fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": shopifyAccessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      }).then(r => r.json());

    // ── 1. Verify order ownership + get fulfillment line item IDs ────────────
    const getFulfData = await adminFetch(`
      query GetReturnableFulfillments($orderId: ID!) {
        order(id: $orderId) { name statusPageUrl email }
        returnableFulfillments(orderId: $orderId, first: 10) {
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
    `, { orderId: fullOrderId });

    if (getFulfData.errors) {
      throw new Error(
        Array.isArray(getFulfData.errors)
          ? getFulfData.errors.map((e: { message?: string }) => e.message).join(" | ")
          : String(getFulfData.errors)
      );
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

    // lineItemId → fulfillmentLineItemId (first returnable match per line)
    const returnableMap: Record<string, string> = {};
    const productDetailsMap: Record<string, { title: string; variantTitle: string; image: string; price: string }> = {};

    for (const fEdge of getFulfData.data?.returnableFulfillments?.edges || []) {
      for (const iEdge of fEdge.node.returnableFulfillmentLineItems?.edges || []) {
        const flItem = iEdge.node.fulfillmentLineItem;
        if (flItem?.id && flItem?.lineItem?.id) {
          // Only take the first returnable fulfillment line item per line item
          if (!returnableMap[flItem.lineItem.id]) {
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
    }

    // ── 2. Build return line items ───────────────────────────────────────────
    type ReturnLineItem = {
      fulfillmentLineItemId: string;
      quantity: number;
      returnReason: string;
      customerNote: string;
    };

    const returnLineItems: ReturnLineItem[] = [];

    for (const item of items as { lineItemId: string; quantity: number; reason: string; description?: string }[]) {
      const fulfillmentLineItemId = returnableMap[item.lineItemId];
      if (!fulfillmentLineItemId) {
        const err = new Error("One or more items are no longer eligible. Please refresh and try again.") as Error & { code?: string };
        err.code = "ELIGIBILITY_CHANGED";
        throw err;
      }
      returnLineItems.push({
        fulfillmentLineItemId,
        quantity: item.quantity,
        returnReason: mapReasonToShopify(item.reason),
        customerNote: buildCustomerNote(item.reason, item.description ?? ""),
      });
    }

    // ── 3. Submit returnRequest ──────────────────────────────────────────────
    // One mutation call — creates a single Return with all line items.
    // Sidekick confirmed: each call creates one Return record.
    const reqData = await adminFetch(
      `mutation ReturnRequest($input: ReturnRequestInput!) {
        returnRequest(input: $input) {
          return { id status }
          userErrors { field message code }
        }
      }`,
      { input: { orderId: fullOrderId, returnLineItems } }
    );

    if (reqData.errors) {
      throw new Error(
        Array.isArray(reqData.errors)
          ? reqData.errors.map((e: { message?: string }) => e.message).join(" | ")
          : String(reqData.errors)
      );
    }

    const userErrors: { field?: string[]; message?: string; code?: string }[] =
      reqData.data?.returnRequest?.userErrors ?? [];

    if (userErrors.length > 0) {
      console.error("[submit-return] userErrors:", JSON.stringify(userErrors));
      const classified = classifyUserErrors(userErrors);
      return NextResponse.json(
        { error: classified.message, code: classified.code },
        { status: 422 }
      );
    }

    const returnId = reqData.data?.returnRequest?.return?.id;

    // ── 4. Send confirmation email ───────────────────────────────────────────
    const emailItems = items.map((item: { lineItemId: string; quantity: number; reason: string; description?: string }) => {
      const d = productDetailsMap[item.lineItemId] || {};
      return {
        title: d.title || "Item",
        variantTitle: d.variantTitle || "",
        image: d.image || "",
        price: d.price || "0.00",
        quantity: item.quantity,
        reason: REASON_LABEL_MAP[item.reason] ?? item.reason,
      };
    });

    const htmlContent = getReturnRequestTemplate(
      { name: fetchedOrderName, order_status_url: fetchedStatusUrl },
      { url: "https://iblazevape.co.uk", email: "info@iblazevape.co.uk", email_accent_color: "#E5403B" },
      emailItems
    );
    await sendEmail({
      toEmail: sessionEmail!,
      subject: `Return requested for order ${fetchedOrderName}`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, returnId });

  } catch (err) {
    const error = err as Error & { code?: string };
    console.error("[submit-return] error:", error.message, error.code ?? "");
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred.", code: error.code },
      { status: error.code === "ELIGIBILITY_CHANGED" ? 409 : 500 }
    );
  }
}
