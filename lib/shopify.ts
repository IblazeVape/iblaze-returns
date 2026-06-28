import { getShopifyToken } from "@/lib/redis";

const SHOPIFY_API_VERSION = "2025-04";

interface GraphQLCost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
}

function logQueryCost(operationName: string, cost: GraphQLCost) {
  const { actualQueryCost, throttleStatus } = cost;
  const pctUsed = Math.round(
    (actualQueryCost / throttleStatus.maximumAvailable) * 100
  );
  const level =
    throttleStatus.currentlyAvailable < 200
      ? "warn"
      : actualQueryCost > 500
      ? "warn"
      : "info";

  console[level](
    `[Shopify GQL] ${operationName} — cost: ${actualQueryCost} | ` +
      `available: ${throttleStatus.currentlyAvailable}/${throttleStatus.maximumAvailable} ` +
      `(${pctUsed}% of max used this call) | restore: ${throttleStatus.restoreRate}/s`
  );

  if (throttleStatus.currentlyAvailable < 100) {
    console.error(
      `[Shopify GQL] THROTTLE WARNING — only ${throttleStatus.currentlyAvailable} points left. ` +
        `Consider batching or caching.`
    );
  }
}

export async function shopifyAdminRest(
  path: string,
  params: Record<string, string> = {}
) {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const token = await getShopifyToken();
  if (!token) throw new Error("No Shopify access token found.");

  const url = new URL(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify REST ${path} failed: ${res.status}`);
  return res.json();
}

export async function shopifyAdmin(
  query: string,
  variables: Record<string, unknown> = {},
  operationName?: string
) {
  const shop = process.env.SHOPIFY_STORE_URL!;
  const token = await getShopifyToken() || process.env.SHOPIFY_ACCESS_TOKEN || null;

  if (!token) {
    throw new Error("No Shopify access token found. Please reinstall the app.");
  }

  const isDev = process.env.NODE_ENV === "development";

  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
        // Request cost data in dev so we can spot expensive queries early
        ...(isDev ? { "Shopify-GraphQL-Cost-Debug": "1" } : {}),
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const result = await res.json();

  // Log query cost in dev (or always in prod if cost is high)
  if (result.extensions?.cost) {
    const cost = result.extensions.cost as GraphQLCost;
    if (isDev || cost.actualQueryCost > 500) {
      logQueryCost(operationName ?? "unnamed", cost);
    }
  }

  if (result.errors) {
    const msg = result.errors[0]?.message || JSON.stringify(result.errors[0]) || "Unknown Shopify error";
    console.error("[Shopify GQL] Error response:", JSON.stringify(result.errors));
    throw new Error(msg);
  }
  return result.data;
}
