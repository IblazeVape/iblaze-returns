import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (!validateAdminSession(cookieHeader)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const shop = process.env.SHOPIFY_STORE_URL!;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN!;

    // Fetch recent returns from Shopify
    const query = `
      query GetReturns {
        returns(first: 50, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              status
              createdAt
              order {
                id
                name
                email
                totalPriceSet { shopMoney { amount currencyCode } }
                customer { firstName lastName }
              }
              returnLineItems(first: 20) {
                edges {
                  node {
                    quantity
                    returnReason
                    customerNote
                    fulfillmentLineItem {
                      lineItem { title image { url } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);

    const returns = result.data?.returns?.edges?.map((e: { node: unknown }) => e.node) || [];
    return NextResponse.json({ returns });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
