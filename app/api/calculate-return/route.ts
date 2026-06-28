import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { getShopifyToken } from "@/lib/redis";

// ── returnCalculate ──────────────────────────────────────────────────────────
// Calls Shopify's returnCalculate mutation (dry-run — no state changes).
// Returns the Shopify-computed financial breakdown:
//   returnSubtotalSet, returnSubtotalWithCartDiscountSet, returnTotalTaxSet,
//   restockingFeeSubtotalSet, returnShippingFeeSubtotalSet, returnTotalSet
//
// The UI uses this to show the customer a Shopify-accurate refund estimate
// before they confirm submission — replacing our naive unitPrice × qty calc.
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_API_VERSION = "2025-04";

const mapReasonToShopify = (frontendReason: string): string => {
  switch (frontendReason) {
    case "WRONG_ITEM":       return "WRONG_ITEM";
    case "FAULTY":           return "DEFECTIVE";
    case "DAMAGED":          return "DEFECTIVE";
    case "NOT_AS_DESCRIBED": return "NOT_AS_DESCRIBED";
    case "CHANGED_MIND":     return "UNWANTED";
    default:                 return "OTHER";
  }
};

export interface ReturnCalculationSummary {
  returnSubtotal: number;
  returnSubtotalWithCartDiscount: number;
  returnTotalTax: number;
  restockingFee: number;
  returnShippingFee: number;
  returnTotal: number;
  currencyCode: string;
}

function parseMoney(set?: { shopMoney?: { amount?: string } }): number {
  return parseFloat(set?.shopMoney?.amount ?? "0") || 0;
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, items } = await request.json() as {
      orderId: string;
      items: { lineItemId: string; quantity: number; reason: string }[];
    };

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);
    if (!session.valid) {
      return NextResponse.json({ error: session.error }, { status: 401 });
    }

    const { email: sessionEmail } = session;
    const shop = process.env.SHOPIFY_STORE_URL!;
    const fullOrderId = `gid://shopify/Order/${orderId}`;

    const shopifyAccessToken = await getShopifyToken();
    if (!shopifyAccessToken) {
      return NextResponse.json({ error: "Store configuration error." }, { status: 500 });
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

    // ── Verify order ownership ───────────────────────────────────────────────
    const orderCheckData = await adminFetch(`
      query CheckOrderOwner($id: ID!) {
        order(id: $id) { email }
      }
    `, { id: fullOrderId });

    if (orderCheckData.data?.order?.email !== sessionEmail) {
      return NextResponse.json({ error: "Permission denied." }, { status: 403 });
    }

    // ── Get fulfillment line item IDs ────────────────────────────────────────
    const fulfData = await adminFetch(`
      query GetReturnableFulfillments($orderId: ID!) {
        returnableFulfillments(orderId: $orderId, first: 10) {
          edges {
            node {
              returnableFulfillmentLineItems(first: 50) {
                edges {
                  node {
                    fulfillmentLineItem {
                      id
                      lineItem { id }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, { orderId: fullOrderId });

    const returnableMap: Record<string, string> = {};
    for (const fEdge of fulfData.data?.returnableFulfillments?.edges ?? []) {
      for (const iEdge of fEdge.node.returnableFulfillmentLineItems?.edges ?? []) {
        const fl = iEdge.node.fulfillmentLineItem;
        if (fl?.id && fl?.lineItem?.id && !returnableMap[fl.lineItem.id]) {
          returnableMap[fl.lineItem.id] = fl.id;
        }
      }
    }

    // ── Build return line items for the calculation ──────────────────────────
    const returnLineItems = items
      .filter(item => returnableMap[item.lineItemId])
      .map(item => ({
        fulfillmentLineItemId: returnableMap[item.lineItemId],
        quantity: item.quantity,
        returnReason: mapReasonToShopify(item.reason),
      }));

    if (returnLineItems.length === 0) {
      return NextResponse.json({ error: "No returnable items found." }, { status: 422 });
    }

    // ── Call returnCalculate (dry-run — no state change) ─────────────────────
    const calcData = await adminFetch(
      `mutation ReturnCalculate($input: ReturnInput!) {
        returnCalculate(input: $input) {
          userErrors { field message }
          returnCalculation {
            lineItems(first: 50) {
              edges {
                node {
                  quantity
                  refundableQuantity
                  fulfillmentLineItem { lineItem { id } }
                  financials {
                    discountedUnitPriceSet { shopMoney { amount currencyCode } }
                    restockingFeeSet      { shopMoney { amount currencyCode } }
                    subtotalSet           { shopMoney { amount currencyCode } }
                    totalTaxSet           { shopMoney { amount currencyCode } }
                  }
                }
              }
            }
            financialSummary {
              restockingFeeSubtotalSet             { shopMoney { amount currencyCode } }
              returnShippingFeeSubtotalSet          { shopMoney { amount currencyCode } }
              returnSubtotalSet                    { shopMoney { amount currencyCode } }
              returnSubtotalWithCartDiscountSet     { shopMoney { amount currencyCode } }
              returnTotalSet                       { shopMoney { amount currencyCode } }
              returnTotalTaxSet                    { shopMoney { amount currencyCode } }
            }
          }
        }
      }`,
      { input: { orderId: fullOrderId, returnLineItems } }
    );

    if (calcData.errors) {
      console.error("[calculate-return] GraphQL errors:", calcData.errors);
      return NextResponse.json({ error: "Calculation failed. Please try again." }, { status: 500 });
    }

    const calcErrors = calcData.data?.returnCalculate?.userErrors ?? [];
    if (calcErrors.length > 0) {
      console.warn("[calculate-return] userErrors:", calcErrors);
      // Fall through — return a null summary so UI falls back to estimate
      return NextResponse.json({ summary: null, userErrors: calcErrors });
    }

    const fs = calcData.data?.returnCalculate?.returnCalculation?.financialSummary;
    const currencyCode: string =
      fs?.returnTotalSet?.shopMoney?.currencyCode ?? "GBP";

    const summary: ReturnCalculationSummary = {
      returnSubtotal:                  parseMoney(fs?.returnSubtotalSet),
      returnSubtotalWithCartDiscount:  parseMoney(fs?.returnSubtotalWithCartDiscountSet),
      returnTotalTax:                  parseMoney(fs?.returnTotalTaxSet),
      restockingFee:                   parseMoney(fs?.restockingFeeSubtotalSet),
      returnShippingFee:               parseMoney(fs?.returnShippingFeeSubtotalSet),
      returnTotal:                     parseMoney(fs?.returnTotalSet),
      currencyCode,
    };

    return NextResponse.json({ summary });

  } catch (err) {
    const error = err as Error;
    console.error("[calculate-return] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
