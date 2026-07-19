import { NextRequest, NextResponse } from "next/server";
import { validateSession, parseCookies } from "@/lib/auth";
import { validateAppsReturnsSession, APPS_RETURNS_COOKIE_NAME } from "@/lib/apps-returns-session";
import { shopifyAdmin, shopifyAdminRest } from "@/lib/shopify";
import { getOrderReturnInfo, ReturnInfo } from "@/lib/customerAccount";
import { getAdminReturnableInfo, fetchRemainingLineItems, fetchRemainingReturns, fetchRemainingFulfillmentLineItems } from "@/lib/returnEligibility";
import { getRequestShop } from "@/lib/request-shop";
import { withCors, corsPreflight } from "@/lib/cors";
import { getTenant } from "@/lib/tenant";

// Eligibility is time-sensitive (return window expires by date) and user-specific.
// Never cache at the Next.js data layer — always recompute per request.
export const dynamic = "force-dynamic";

// Applied to every response so no eligibility result is ever cached by the browser.
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

type EligibilitySource = "shopify" | "shopify-admin" | "fallback";

async function resolveReturnInfo(
  shop: string,
  orderId: string,
  orderName: string,
  cancelledAt: string | null | undefined,
  accessToken: string | undefined
): Promise<{ returnInfo: ReturnInfo | null; eligibilitySource: EligibilitySource }> {
  if (cancelledAt) return { returnInfo: null, eligibilitySource: "fallback" };

  // Customer Account API path — only possible with a customer OAuth token
  // (the legacy iBlaze session). App Proxy sessions never have one (Shopify
  // itself vouches for the customer instead), so this step is skipped
  // entirely for them — NOT treated as a failure, since the admin-based
  // path below doesn't need a customer token at all and gives real
  // eligibility, not the crude shipping-status-only fallback.
  if (accessToken) {
    try {
      const returnInfo = await getOrderReturnInfo(shop, orderId, accessToken);
      return { returnInfo, eligibilitySource: "shopify" };
    } catch (err) {
      console.error(`getOrderReturnInfo failed for ${orderName}:`, (err as Error).message);
    }
  }

  try {
    const returnInfo = await getAdminReturnableInfo(shop, orderId);
    return { returnInfo, eligibilitySource: "shopify-admin" };
  } catch (adminErr) {
    console.error(`getAdminReturnableInfo failed for ${orderName}:`, (adminErr as Error).message);
    return { returnInfo: null, eligibilitySource: "fallback" };
  }
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  return withCors(await handleGet(request));
}

async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const ctx = await getRequestShop(request);
    if (!ctx) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }
    const { shop } = ctx;
    const tenant = await getTenant(shop);
    const returnWindowDays = tenant?.returnWindowDays ?? 30;

    const cookieHeader = request.headers.get("cookie");
    const session = validateSession(cookieHeader);

    let sessionEmail: string | undefined;
    let accessToken: string | undefined;
    let orderScope: string | undefined;

    if (session.valid) {
      // Legacy iBlaze customer OAuth session (account.iblazevape.co.uk).
      sessionEmail = session.email;
      accessToken = session.accessToken;
    } else {
      // App Proxy portal session (any tenant) — no customer OAuth token; the
      // eligibility fallback below (getAdminReturnableInfo) already handles
      // an absent accessToken. orderScope, if set, restricts a guest lookup
      // to the single order they verified (not their whole order history).
      //
      // Identity travels as a HEADER (x-apps-returns-session), not a cookie:
      // Shopify's App Proxy strips Set-Cookie on the way back to the browser
      // (confirmed live), so the client stores the session token in
      // localStorage and attaches it via this header on every API call
      // (lib/apps-returns-client-session.ts). The cookie is still checked as
      // a fallback in case Set-Cookie ever does survive.
      const headerSession = validateAppsReturnsSession(request.headers.get("x-apps-returns-session"));
      const appsSession = headerSession.valid
        ? headerSession
        : validateAppsReturnsSession(parseCookies(cookieHeader)[APPS_RETURNS_COOKIE_NAME]);
      if (appsSession.valid && appsSession.email) {
        sessionEmail = appsSession.email;
        orderScope = appsSession.orderScope;
      }
    }

    if (!sessionEmail) {
      return NextResponse.json({ error: "Session missing. Please log in." }, { status: 401, headers: NO_STORE });
    }

    // Fetch ALL orders by paginating until hasNextPage is false.
    // Each page fetches 50 orders; most customers will need only 1 page.
    const allRawOrders: unknown[] = []
    let firstName = ""
    const MAX_PAGES = 10

    // ORDER_FIELDS: kept conservative to stay under Shopify's 1000 query-cost limit.
    // Key reductions vs naive values:
    //   refunds/fulfillments get explicit first: (no first = Shopify uses a large default = expensive)
    //   returns(5) × returnLineItems(5) = 25 cost vs returns(25) × returnLineItems(25) = 625
    // Pagination handlers below fetch additional pages when hasNextPage is true.
    const ORDER_FIELDS = `
      id name createdAt cancelledAt displayFulfillmentStatus displayFinancialStatus
      statusPageUrl
      customer { firstName }
      totalPriceSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount } }
      refunds(first: 5) {
        refundLineItems(first: 5) {
          edges { node { quantity lineItem { id } } }
        }
      }
      returns(first: 5) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id status decline { reason note }
            returnLineItems(first: 5) {
              edges {
                node {
                  ... on ReturnLineItem {
                    quantity
                    fulfillmentLineItem { lineItem { id } }
                  }
                }
              }
            }
          }
        }
      }
      fulfillments(first: 5) {
        id displayStatus createdAt deliveredAt updatedAt
        trackingInfo { company number url }
        fulfillmentLineItems(first: 30) {
          pageInfo { hasNextPage endCursor }
          edges { node { lineItem { id } quantity } }
        }
      }
      lineItems(first: 20) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id title quantity
            discountedUnitPriceSet { shopMoney { amount } }
            product { handle }
            image { url }
            variant { title }
          }
        }
      }
    `;

    // Step 1: get customer ID + firstName
    const customerData = await shopifyAdmin(shop, `
      query GetCustomer($query: String!) {
        customers(first: 1, query: $query) {
          edges { node { id firstName } }
        }
      }
    `, { query: `email:${sessionEmail}` });
    const customerNode = customerData?.customers?.edges?.[0]?.node;
    firstName = customerNode?.firstName || "";
    const customerId: string | null = customerNode?.id || null;

    // Step 2: fetch orders through customer.orders — same source Shopify Admin uses,
    // guaranteed to return ALL orders for this customer regardless of how they were placed.
    console.log(`[get-orders] customerId: ${customerId}, email: ${sessionEmail}`);
    if (customerId) {
      let cur: string | null = null;
      let pages = 0;
      do {
        pages++;
        const data = await shopifyAdmin(shop, `
          query GetCustomerOrders($id: ID!, $after: String) {
            customer(id: $id) {
              firstName
              orders(first: 20, after: $after, sortKey: CREATED_AT, reverse: true) {
                pageInfo { hasNextPage endCursor }
                edges { node { ${ORDER_FIELDS} } }
              }
            }
          }
        `, { id: customerId, after: cur });
        const conn = data?.customer?.orders;
        console.log(`[get-orders] customer.orders page ${pages}: ${conn?.edges?.length ?? 0} orders, hasNextPage: ${conn?.pageInfo?.hasNextPage}`);
        if (!conn) break;
        if (!firstName && data.customer?.firstName) firstName = data.customer.firstName;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        allRawOrders.push(...conn.edges.map((e: any) => e.node));
        if (!conn.pageInfo?.hasNextPage) break;
        cur = conn.pageInfo.endCursor ?? null;
        if (!cur) break;
      } while (pages < MAX_PAGES);
    } else {
      console.log(`[get-orders] WARNING: no customerId found for email ${sessionEmail}`);
    }
    console.log(`[get-orders] after customer.orders: ${allRawOrders.length} total`);

    // Step 3: also fetch by email to catch any orphaned guest orders not linked
    // to the customer record, then merge & deduplicate.
    const seen = new Set<string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allRawOrders as any[]).map((o) => o.id)
    );
    {
      let cur: string | null = null;
      let pages = 0;
      do {
        pages++;
        const data = await shopifyAdmin(shop, `
          query GetOrdersByEmail($query: String!, $after: String) {
            orders(first: 20, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
              pageInfo { hasNextPage endCursor }
              edges { node { ${ORDER_FIELDS} } }
            }
          }
        `, { query: `email:${sessionEmail}`, after: cur });
        const conn = data?.orders;
        console.log(`[get-orders] email query page ${pages}: ${conn?.edges?.length ?? 0} orders, hasNextPage: ${conn?.pageInfo?.hasNextPage}`);
        if (!conn) break;
        let newFromEmail = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const edge of conn.edges as any[]) {
          if (!seen.has(edge.node.id)) {
            seen.add(edge.node.id);
            allRawOrders.push(edge.node);
            newFromEmail++;
          }
        }
        console.log(`[get-orders] email query page ${pages}: ${newFromEmail} new orders not in customer.orders`);
        if (!conn.pageInfo?.hasNextPage) break;
        cur = conn.pageInfo.endCursor ?? null;
        if (!cur) break;
      } while (pages < MAX_PAGES);
    }

    // Step 4: GraphQL customer_id: search fallback (Sidekick-recommended approach).
    // orders(query: "customer_id:...") matches what Shopify Admin's customer_id filter uses
    // and may return orders missing from customer.orders (e.g. Turnr exchange orders).
    // Also test direct lookup of a known missing order to diagnose scope issues.
    if (customerId) {
      try {
        const numericId = customerId.replace("gid://shopify/Customer/", "");

        // Diagnostic: try fetching one known-missing order directly
        const directTest = await shopifyAdmin(shop, `
          query TestMissingOrder($id: ID!) {
            order(id: $id) { id name }
          }
        `, { id: "gid://shopify/Order/11419307933961" }).catch(() => null);
        console.log(`[get-orders] direct order(#1018) lookup:`, JSON.stringify(directTest?.order ?? null));

        const knownIds = new Set((allRawOrders as any[]).map((o: any) => o.id));// eslint-disable-line @typescript-eslint/no-explicit-any
        let cur: string | null = null;
        let pages = 0;
        let newFromCustomerIdQuery = 0;
        do {
          pages++;
          const data = await shopifyAdmin(shop, `
            query OrdersByCustomerId($query: String!, $after: String) {
              orders(first: 20, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
                pageInfo { hasNextPage endCursor }
                edges { node { ${ORDER_FIELDS} } }
              }
            }
          `, { query: `customer_id:${numericId}`, after: cur });
          const conn = data?.orders;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const edge of (conn?.edges ?? []) as any[]) {
            if (!knownIds.has(edge.node.id)) {
              knownIds.add(edge.node.id);
              allRawOrders.push(edge.node);
              newFromCustomerIdQuery++;
            }
          }
          if (!conn?.pageInfo?.hasNextPage) break;
          cur = conn.pageInfo.endCursor ?? null;
          if (!cur) break;
        } while (pages < MAX_PAGES);
        console.log(`[get-orders] customer_id: query added ${newFromCustomerIdQuery} new orders`);
      } catch (err) {
        console.warn(`[get-orders] customer_id: fallback failed:`, (err as Error).message);
      }
    }

    console.log(`[get-orders] FINAL total after merge: ${allRawOrders.length} orders`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`[get-orders] order names: ${(allRawOrders as any[]).map((o: any) => o.name).join(", ")}`);

    // Sort merged list newest first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allRawOrders as any[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Guest session scoped to a single verified order — restrict here, before
    // the expensive per-order eligibility processing below, and before any
    // other order for this email is ever touched.
    if (orderScope) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scoped = (allRawOrders as any[]).filter((o: any) => o.id === orderScope);
      allRawOrders.length = 0;
      allRawOrders.push(...scoped);
    }

    if (allRawOrders.length === 0) {
      return NextResponse.json({ firstName: "", email: sessionEmail, orders: [] }, { headers: NO_STORE });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOrders = allRawOrders as any[];

    // Paginate line items and returns when an order exceeds the first page
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawOrders.map(async (order: any) => {
        const linePageInfo = order.lineItems?.pageInfo;
        if (linePageInfo?.hasNextPage && linePageInfo.endCursor) {
          const extraLines = await fetchRemainingLineItems(shop, order.id, linePageInfo.endCursor);
          order.lineItems.edges.push(...extraLines);
        }

        const returnsPageInfo = order.returns?.pageInfo;
        if (returnsPageInfo?.hasNextPage && returnsPageInfo.endCursor) {
          const extraReturns = await fetchRemainingReturns(shop, order.id, returnsPageInfo.endCursor);
          order.returns.edges.push(...extraReturns.map((node: unknown) => ({ node })));
        }

        // Paginate fulfillment line items for fulfillments with >30 variants
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const f of (order.fulfillments || []) as any[]) {
          const fliPageInfo = f.fulfillmentLineItems?.pageInfo;
          if (fliPageInfo?.hasNextPage && fliPageInfo.endCursor) {
            const extraFLIs = await fetchRemainingFulfillmentLineItems(shop, f.id, fliPageInfo.endCursor);
            f.fulfillmentLineItems.edges.push(...extraFLIs);
          }
        }
      })
    );

    // ── Fetch Shopify return eligibility for all orders in parallel ──────────
    // Customer Account API first; Admin returnableFulfillments if that fails;
    // delivery-based manual logic only as last resort.
    const returnInfoResults = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawOrders.map((order: any) =>
        resolveReturnInfo(shop, order.id, order.name, order.cancelledAt, accessToken)
      )
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedOrders = rawOrders.map((order: any, orderIdx: number) => {
      const { returnInfo, eligibilitySource } = returnInfoResults[orderIdx];

      // ── 1. Refunded quantities per line item ──────────────────────────────
      const refundedQuantities: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.refunds || []).forEach((ref: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ref.refundLineItems?.edges || []).forEach((rli: any) => {
          const id = rli.node.lineItem?.id;
          if (id) refundedQuantities[id] = (refundedQuantities[id] || 0) + rli.node.quantity;
        });
      });

      // ── 2. Collect ALL return records per line item ───────────────────────
      const returnPriority: Record<string, number> = {
        OPEN: 5, REQUESTED: 4, DECLINED: 3, CANCELED: 2, CLOSED: 1,
      };

      type ReturnEntry = {
        status: string;
        declineReason?: string;
        declineNote?: string;
        quantity: number;
      };
      const returnsByItem: Record<string, ReturnEntry[]> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order.returns?.edges || []).forEach((retEdge: any) => {
        const ret = retEdge.node;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const rliEdge of (ret.returnLineItems?.edges || [])) {
          const lineItemId = rliEdge.node.fulfillmentLineItem?.lineItem?.id;
          if (!lineItemId) continue;
          if (!returnsByItem[lineItemId]) returnsByItem[lineItemId] = [];
          returnsByItem[lineItemId].push({
            status: ret.status,
            declineReason: ret.decline?.reason,
            declineNote: ret.decline?.note,
            quantity: rliEdge.node.quantity || 1,
          });
        }
      });

      const itemReturnStatus: Record<string, ReturnEntry> = {};
      const requestedReturnQty: Record<string, number> = {}; // REQUESTED only
      const openReturnQty: Record<string, number> = {};      // OPEN only
      const completedReturnQty: Record<string, number> = {}; // CLOSED only
      const declinedReturnEntries: Record<string, { quantity: number; message: string; declineReason?: string }[]> = {}; // DECLINED — per entry with resolved message

      const lineItemQuantities: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const edge of order.lineItems.edges) {
        const li = edge.node;
        lineItemQuantities[li.id] = li.quantity;
      }

      const directRefundQtyByLine: Record<string, number> = {};

      for (const [lid, entries] of Object.entries(returnsByItem)) {
        const sorted = [...entries].sort(
          (a, b) => (returnPriority[b.status] ?? 0) - (returnPriority[a.status] ?? 0)
        );
        itemReturnStatus[lid] = sorted[0];

        const lineQty = lineItemQuantities[lid] ?? 0;
        const requestedRaw = entries
          .filter(e => e.status === "REQUESTED")
          .reduce((sum, e) => sum + e.quantity, 0);
        const openRaw = entries
          .filter(e => e.status === "OPEN")
          .reduce((sum, e) => sum + e.quantity, 0);
        const completedRaw = entries
          .filter(e => e.status === "CLOSED")
          .reduce((sum, e) => sum + e.quantity, 0);

        const declinedMapped = entries
          .filter(e => e.status === "DECLINED")
          .map(e => {
            const note = (e.declineNote || "").trim();
            const message = note && !/^decline reason\.?$/i.test(note) && !/^n\/?a$/i.test(note)
              && !(note.length < 12 && !/\s/.test(note) && !/[.!?]/.test(note))
              ? note
              : (e.declineReason === "RETURN_PERIOD_ENDED" || e.declineReason === "RETURN_WINDOW_EXPIRED")
                ? "Your return request was declined because it is outside the return window."
                : e.declineReason === "FINAL_SALE"
                  ? "Your return request was declined because the item is a final sale."
                  : "Your return request was declined.";
            return { quantity: e.quantity, message, declineReason: e.declineReason };
          });
        const declinedRaw = declinedMapped.reduce((sum, e) => sum + e.quantity, 0);

        const allocated = allocateExclusiveReturnQty(
          lineQty,
          requestedRaw,
          openRaw,
          completedRaw,
          declinedRaw,
          refundedQuantities[lid] || 0,
        );

        if (allocated.requested > 0) requestedReturnQty[lid] = allocated.requested;
        if (allocated.open > 0) openReturnQty[lid] = allocated.open;
        if (allocated.completed > 0) completedReturnQty[lid] = allocated.completed;
        if (allocated.declined > 0) {
          declinedReturnEntries[lid] = capDeclinedEntries(declinedMapped, allocated.declined);
        }
        if (allocated.directRefund > 0) directRefundQtyByLine[lid] = allocated.directRefund;
      }

      // Items refunded directly with NO return record never enter the loop above
      // (it only iterates returnsByItem). Reserve their refunded quantity here so a
      // refunded-only item (e.g. Shopify zeroes currentQuantity) can never appear
      // eligible. Matches Shopify's native page, which excludes refunded units.
      for (const [lid, refundedQty] of Object.entries(refundedQuantities)) {
        if (returnsByItem[lid]) continue; // already allocated above
        const directRefund = Math.min(lineItemQuantities[lid] ?? 0, refundedQty);
        if (directRefund > 0) directRefundQtyByLine[lid] = directRefund;
      }

      // ── 3. Build shipments with tracking ─────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipments = (order.fulfillments || []).map((f: any) => ({
        id: f.id,
        displayStatus: f.displayStatus,
        shippedAt: f.createdAt ? new Date(f.createdAt).toISOString() : null,
        deliveredAt: f.deliveredAt ? new Date(f.deliveredAt).toISOString() : null,
        trackingInfo: (f.trackingInfo || [])
          .filter((t: { number?: string }) => t.number)
          .map((t: { number: string; url: string | null; company: string | null }) => ({
            number: t.number,
            url: t.url || buildTrackingUrl(t.company, t.number),
            company: t.company || "Carrier",
          })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (f.fulfillmentLineItems?.edges || []).map((e: any) => ({
          id: e.node.lineItem.id,
          quantity: e.node.quantity,
        })),
      }));

      // ── 4. Per-line-item delivery state ───────────────────────────────────
      type LineDelivery = {
        deliveredQty: number;
        inTransitQty: number;
        outForDeliveryQty: number;
        attemptedDeliveryQty: number;
        confirmedQty: number;
        latestDeliveredAt: Date | null;
        earliestShippedAt: Date | null; // earliest fulfillment createdAt for in-transit items
      };
      
      const lineItemDelivery: Record<string, LineDelivery> = {};
      let earliestDelivery = null as Date | null;
      let latestDelivery = null as Date | null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (order.fulfillments || [])) {
        const s = f.displayStatus;
        const isDelivered = s === "DELIVERED";
        const isConfirmed = s === "CONFIRMED" || s === "SUBMITTED" || s === "LABEL_PURCHASED" || s === "LABEL_PRINTED";
        const outForDelivery = s === "OUT_FOR_DELIVERY";
        const attemptedDelivery = s === "ATTEMPTED_DELIVERY";
        const inTransit = s === "IN_TRANSIT" || s === "READY_FOR_PICKUP" || s === "PICKED_UP" || s === "FULFILLED" || s === "MARKED_AS_FULFILLED";

        let dDate: Date | null = null;
        if (isDelivered) {
          dDate = f.deliveredAt ? new Date(f.deliveredAt) : new Date(f.updatedAt);
          if (!earliestDelivery || dDate < earliestDelivery) earliestDelivery = dDate;
          if (!latestDelivery || dDate > latestDelivery) latestDelivery = dDate;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const edge of (f.fulfillmentLineItems?.edges || [])) {
          const liId = edge.node.lineItem.id;
          const qty = edge.node.quantity;
          
          if (!lineItemDelivery[liId]) {
            lineItemDelivery[liId] = { deliveredQty: 0, inTransitQty: 0, outForDeliveryQty: 0, attemptedDeliveryQty: 0, confirmedQty: 0, latestDeliveredAt: null, earliestShippedAt: null };
          }

          if (isDelivered) {
            lineItemDelivery[liId].deliveredQty += qty;
            if (!lineItemDelivery[liId].latestDeliveredAt || (dDate && dDate > lineItemDelivery[liId].latestDeliveredAt!)) {
              lineItemDelivery[liId].latestDeliveredAt = dDate;
            }
          } else if (outForDelivery || attemptedDelivery || inTransit) {
            if (outForDelivery) lineItemDelivery[liId].outForDeliveryQty += qty;
            else if (attemptedDelivery) lineItemDelivery[liId].attemptedDeliveryQty += qty;
            else lineItemDelivery[liId].inTransitQty += qty;
            // Track earliest ship date so fallback can detect expired return windows
            const shippedAt = f.createdAt ? new Date(f.createdAt) : null;
            if (shippedAt && (!lineItemDelivery[liId].earliestShippedAt || shippedAt < lineItemDelivery[liId].earliestShippedAt!)) {
              lineItemDelivery[liId].earliestShippedAt = shippedAt;
            }
          } else if (isConfirmed) {
            lineItemDelivery[liId].confirmedQty += qty;
          }
        }
      }

      // ── 5. Map each line item ─────────────────────────────────────────────

      // Shopify's returnInformation is the single source of truth for eligibility,
      // exactly as Shopify's own native order-status page uses it. We do NOT override
      // it: anything Shopify omits from returnableLineItems is not eligible here either.
      const ri = returnInfo;

      const now = new Date();
      let totalUnits = 0;
      let deliveredCount = 0;
      let dispatchedCount = 0;
      let outForDeliveryCount = 0;
      let attemptedDeliveryCount = 0;
      let confirmedCount = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = order.lineItems.edges.map(({ node: item }: any) => {
        totalUnits += item.quantity;
        const delivery = lineItemDelivery[item.id] || { deliveredQty: 0, inTransitQty: 0, outForDeliveryQty: 0, attemptedDeliveryQty: 0, confirmedQty: 0, latestDeliveredAt: null };
        const bestReturn = itemReturnStatus[item.id];

        deliveredCount += delivery.deliveredQty;
        dispatchedCount += delivery.inTransitQty;
        outForDeliveryCount += delivery.outForDeliveryQty;
        attemptedDeliveryCount += delivery.attemptedDeliveryQty;
        confirmedCount += delivery.confirmedQty;

        const refQty          = directRefundQtyByLine[item.id] || 0;
        const requestedQty    = requestedReturnQty[item.id]  || 0;
        const openQty         = openReturnQty[item.id]       || 0;
        const completedQty    = completedReturnQty[item.id]  || 0;
        const declinedEntries = declinedReturnEntries[item.id] || [];
        const declinedQty     = declinedEntries.reduce((s, e) => s + e.quantity, 0);

        const reservedQty = Math.min(
          item.quantity,
          refQty + requestedQty + openQty + completedQty + declinedQty
        );
        const shopifyReturnableQty = ri ? (ri.returnableItems[item.id] ?? 0) : 0;
        const slotAvailable = Math.max(0, item.quantity - reservedQty);
        const deliveredAvailable = Math.max(0, delivery.deliveredQty - reservedQty);
        // Shopify return rules (returnInformation) + portal rule: must be delivered before selectable
        const shopifySlotEligible = ri
          ? Math.min(shopifyReturnableQty, slotAvailable)
          : deliveredAvailable;
        const effectiveEligible = ri
          ? Math.min(shopifySlotEligible, deliveredAvailable)
          : deliveredAvailable;

        // returnableFulfillments (the Admin fallback used when the Customer Account
        // API / returnInformation is unavailable — e.g. native self-serve returns
        // disabled) is NOT window-aware. Enforce the return window ourselves so an
        // item delivered more than returnWindowDays ago is never eligible,
        // regardless of which returnable source produced ri.returnableItems.
        const windowExpired = delivery.latestDeliveredAt
          ? (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24) > returnWindowDays
          : false;
        const effectiveEligibleWindowed = windowExpired ? 0 : effectiveEligible;

        let returnStatus: string;
        let returnReason: string;
        let notReturnableReason: string | null = null;
        let shippingStage: ShippingStage | null = null;
        let effectiveEligibleQty = effectiveEligibleWindowed;

        if (order.cancelledAt) {
          returnStatus = "Cancelled";
          returnReason = "This order was cancelled.";

        } else if (effectiveEligibleWindowed > 0) {
          returnStatus = "Eligible";
          returnReason = "";

        } else if (shopifySlotEligible > 0 && delivery.attemptedDeliveryQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "attemptedDelivery";
          returnReason = SHIPPING_STAGE_REASON.attemptedDelivery;
        } else if (shopifySlotEligible > 0 && delivery.outForDeliveryQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "outForDelivery";
          returnReason = SHIPPING_STAGE_REASON.outForDelivery;
        } else if (shopifySlotEligible > 0 && delivery.inTransitQty > 0) {
          returnStatus = "notReturnable"; notReturnableReason = "notDelivered"; shippingStage = "onItsWay";
          returnReason = SHIPPING_STAGE_REASON.onItsWay;

        } else if (bestReturn && Math.max(0, item.quantity - reservedQty) <= 0) {
          // ── Priority 2: Return record covers all units ─────────────────────
          const statusMap: Record<string, string> = {
            REQUESTED: "returnRequested", OPEN: "returnInProgress", CLOSED: "returnCompleted", DECLINED: "returnDeclined", CANCELED: "returnCanceled",
          };
          returnStatus = statusMap[bestReturn.status] || "returnInProgress";
          if (bestReturn.status === "DECLINED") {
            const note = (bestReturn.declineNote || "").trim();
            if (note && !/^decline reason\.?$/i.test(note)) returnReason = note;
            else if (bestReturn.declineReason === "RETURN_WINDOW_EXPIRED" || bestReturn.declineReason === "RETURN_PERIOD_ENDED") returnReason = "Your return request was declined because it is outside the return window.";
            else if (bestReturn.declineReason === "FINAL_SALE") returnReason = "Your return request was declined because the item is a final sale.";
            else returnReason = "Your return request was declined.";
          } else {
            returnReason = bestReturn.status === "CLOSED"
              ? "Your return has been processed."
              : "You have an active or completed return for this item.";
          }

        } else if (ri) {
          // ── Priority 3: Shopify returnInformation (no returnable qty right now) ─
          const nonReturnableDetail = ri.nonReturnableItems[item.id];

          if (nonReturnableDetail) {
            // Sidekick-aligned priority order for nonReturnable reason codes:
            //   UNFULFILLED first (operational blocker — delivery hasn't happened)
            //   RETURN_WINDOW_EXPIRED next — but only once item is actually delivered
            //   FINAL_SALE (permanent — item never returnable)
            //   RETURNED (item already returned — UI uses Return records for detail)
            //   Unknown/OTHER last — generic copy, log for monitoring
            const reasonCodes = nonReturnableDetail.map((d: { reasonCode: string }) => d.reasonCode);

            // Log any codes we haven't mapped — helps us extend coverage over time
            const knownCodes = new Set(["UNFULFILLED", "RETURN_WINDOW_EXPIRED", "FINAL_SALE", "RETURNED", "OTHER"]);
            const unknownCodes = reasonCodes.filter((c: string) => !knownCodes.has(c));
            if (unknownCodes.length > 0) {
              console.warn(`[get-orders] Unknown nonReturnableReason codes for item ${item.id}: ${unknownCodes.join(", ")}`);
            }

            if (reasonCodes.includes("UNFULFILLED")) {
              // Item confirmed as unfulfilled — delivery state takes precedence
              const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered.returnStatus;
              notReturnableReason = undelivered.notReturnableReason;
              shippingStage = undelivered.shippingStage;
              returnReason = undelivered.returnReason;
            } else if (reasonCodes.includes("RETURN_WINDOW_EXPIRED")) {
              // Window can't be expired before delivery — guard against Shopify API edge cases
              if (delivery.deliveredQty <= 0) {
                const undelivered = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
                returnStatus = undelivered.returnStatus;
                notReturnableReason = undelivered.notReturnableReason;
                shippingStage = undelivered.shippingStage;
                returnReason = undelivered.returnReason;
              } else {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              }
            } else if (reasonCodes.includes("FINAL_SALE")) {
              returnStatus = "notReturnable"; notReturnableReason = "finalSale";
              returnReason = "This item is marked as final sale and cannot be returned.";
            } else if (reasonCodes.includes("RETURNED")) {
              // Sidekick guidance: RETURNED ≠ refunded.
              // This is an eligibility signal only — quantity splits use Return records.
              returnStatus = "returnCompleted";
              returnReason = "This item has already been returned.";
            } else {
              // Unknown reason code — generic copy; logged above
              returnStatus = "notReturnable"; notReturnableReason = "other";
              returnReason = "This item is not eligible for return.";
            }
          } else {
            // Not in either Shopify list — item has been zeroed out by Shopify
            // (currentQuantity=0 after refund/return removes it from both lists).
            // Check if it was delivered and fully covered before falling to transit state.
            if (delivery.deliveredQty > 0 && slotAvailable <= 0) {
              // Delivered but all quantity accounted for by refunds or return records.
              // This is a DIRECT refund with no Return record — the lifecycle status
              // itself is "not applicable" (see get-orders API contract note below);
              // returnCompleted is used as the closest-fit lifecycle status when a
              // refund happened but no return record exists, with refundStatus (set
              // below, outside this if-chain) carrying the actual refund fact.
              const isDirectRefund = refQty > 0 && completedQty === 0 && openQty === 0;
              returnStatus = isDirectRefund ? "returnCompleted" : "returnCompleted";
              returnReason = isDirectRefund
                ? "This item has already been refunded."
                : "This item has already been returned.";
            } else if (delivery.deliveredQty > 0) {
              // Delivered but Shopify doesn't list it in either returnable or non-returnable.
              // Common with Admin API fallback: returnableFulfillments omits expired items.
              // Use delivery date to determine correct status rather than falling through
              // to statusFromUndeliveredDelivery which would incorrectly show "Confirmed".
              const daysSince = delivery.latestDeliveredAt
                ? (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24)
                : Infinity;
              if (daysSince > returnWindowDays) {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
                effectiveEligibleQty = deliveredAvailable;
              }
            } else {
              const undelivered2 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
              returnStatus = undelivered2.returnStatus;
              notReturnableReason = undelivered2.notReturnableReason;
              shippingStage = undelivered2.shippingStage;
              returnReason = undelivered2.returnReason;
            }
          }

        } else {
          // ── Priority 4: Manual fallback (Customer Account API unavailable) ─
          if (bestReturn) {
            const statusMap: Record<string, string> = {
              REQUESTED: "returnRequested", OPEN: "returnInProgress", CLOSED: "returnCompleted", DECLINED: "returnDeclined", CANCELED: "returnCanceled",
            };
            returnStatus = statusMap[bestReturn.status] || "returnInProgress";
            returnReason = "You have an active or completed return for this item.";
          } else if (Math.max(0, item.quantity - reservedQty) <= 0) {
            returnStatus = "returnCompleted";
            returnReason = "This item has already been fully refunded.";
          } else if (effectiveEligible > 0) {
            if (delivery.latestDeliveredAt) {
              const daysSince = (now.getTime() - delivery.latestDeliveredAt.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince > returnWindowDays) {
                returnStatus = "notReturnable"; notReturnableReason = "outsideWindow";
                returnReason = formatReturnWindowExpiredReason(delivery.latestDeliveredAt, returnWindowDays);
              } else {
                returnStatus = "Eligible";
                returnReason = "";
              }
            } else {
              returnStatus = "Eligible";
              returnReason = "";
            }
          } else {
            const undelivered3 = statusFromUndeliveredDelivery(delivery, now, returnWindowDays);
            returnStatus = undelivered3.returnStatus;
            notReturnableReason = undelivered3.notReturnableReason;
            shippingStage = undelivered3.shippingStage;
            returnReason = undelivered3.returnReason;
          }
        }

        const refundStatus: string =
          refQty <= 0 ? "notRefunded"
          : refQty >= item.quantity ? "refunded"
          : "partiallyRefunded";

        return {
          ...item,
          productHandle: item.product?.handle || null,
          unitPrice: item.discountedUnitPriceSet?.shopMoney?.amount
            ? parseFloat(item.discountedUnitPriceSet.shopMoney.amount)
            : null,
          eligibleQuantity: returnStatus === "Eligible" ? effectiveEligibleQty : 0,
          refundedQuantity: refQty,
          requestedReturnQuantity: requestedQty,
          openReturnQuantity: openQty,
          completedReturnQuantity: completedQty,
          declinedReturnQuantity: declinedQty,
          declinedReturnEntries: declinedEntries,
          inTransitQuantity: delivery.inTransitQty,
          outForDeliveryQuantity: delivery.outForDeliveryQty,
          attemptedDeliveryQuantity: delivery.attemptedDeliveryQty,
          pendingQuantity: Math.max(0, item.quantity - delivery.deliveredQty - delivery.inTransitQty - delivery.outForDeliveryQty - delivery.attemptedDeliveryQty - delivery.confirmedQty),
          returnStatus,
          returnReason,
          notReturnableReason,
          shippingStage,
          refundStatus,
          lineDeliveredAt: delivery.latestDeliveredAt
            ? delivery.latestDeliveredAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null,
        };
      });

      const notDispatchedCount = Math.max(0, totalUnits - deliveredCount - dispatchedCount - outForDeliveryCount - attemptedDeliveryCount - confirmedCount);

      const totalInTransit = dispatchedCount + outForDeliveryCount + attemptedDeliveryCount;
      let orderStatus: string;
      if (order.cancelledAt) {
        orderStatus = "Cancelled";
      } else if (deliveredCount === totalUnits && totalUnits > 0) {
        orderStatus = "Delivered";
      } else if (deliveredCount > 0) {
        orderStatus = "Partially delivered";
      } else if (attemptedDeliveryCount > 0) {
        orderStatus = attemptedDeliveryCount === totalUnits ? "Attempted delivery" : "Partially dispatched";
      } else if (outForDeliveryCount > 0 && outForDeliveryCount === totalUnits) {
        orderStatus = "Out for delivery";
      } else if (totalInTransit > 0 && totalInTransit === totalUnits) {
        orderStatus = "On its way";
      } else if (totalInTransit > 0) {
        orderStatus = "Partially dispatched";
      } else {
        orderStatus = "Confirmed";
      }

      return {
        ...order,
        processedItems: items,
        shipments,
        orderStatus,
        eligibilitySource,
        deliveredCount,
        dispatchedCount,
        outForDeliveryCount,
        attemptedDeliveryCount,
        confirmedCount,
        notDispatchedCount,
        totalUnits,
        earliestDelivery: earliestDelivery ? earliestDelivery.toISOString() : null,
        latestDelivery: latestDelivery ? latestDelivery.toISOString() : null,
      };
    });

    return NextResponse.json(
      { firstName, email: sessionEmail, returnWindowDays, orders: processedOrders },
      { headers: NO_STORE }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("get-orders error:", message);
    return NextResponse.json({ error: message || "Unexpected server error" }, { status: 500, headers: NO_STORE });
  }
}

function allocateExclusiveReturnQty(
  lineQty: number,
  requestedRaw: number,
  openRaw: number,
  completedRaw: number,
  declinedRaw: number,
  totalRefundedRaw: number,
) {
  let remaining = lineQty;

  const completed = Math.min(remaining, completedRaw);
  remaining -= completed;

  const declined = Math.min(remaining, declinedRaw);
  remaining -= declined;

  const open = Math.min(remaining, openRaw);
  remaining -= open;

  const requested = Math.min(remaining, requestedRaw);
  remaining -= requested;

  // Refunds tied to completed/open returns are already represented above.
  const directRefund = Math.min(remaining, Math.max(0, totalRefundedRaw - completed - open));
  remaining -= directRefund;

  return { completed, declined, open, requested, directRefund };
}

function capDeclinedEntries(
  entries: { quantity: number; message: string; declineReason?: string }[],
  cap: number,
) {
  if (cap <= 0) return [];
  let remaining = cap;
  const result: typeof entries = [];
  for (const entry of entries) {
    if (remaining <= 0) break;
    const quantity = Math.min(entry.quantity, remaining);
    if (quantity > 0) result.push({ ...entry, quantity });
    remaining -= quantity;
  }
  return result;
}

type ShippingStage = "confirmed" | "onItsWay" | "outForDelivery" | "attemptedDelivery";

const SHIPPING_STAGE_REASON: Record<ShippingStage, string> = {
  confirmed: "We're preparing your items for shipping.",
  onItsWay: "Your parcel is on its way. Your return window starts once it's delivered.",
  outForDelivery: "Your parcel is out for delivery today. Your return window starts once it's delivered.",
  attemptedDelivery: "A delivery attempt was made for your parcel. You'll be able to request a return once it's been delivered.",
};

function statusFromUndeliveredDelivery(
  delivery: {
    inTransitQty: number;
    outForDeliveryQty: number;
    attemptedDeliveryQty: number;
    confirmedQty: number;
    earliestShippedAt: Date | null;
  },
  now: Date,
  returnWindowDays: number,
): { returnStatus: string; notReturnableReason: string; shippingStage: ShippingStage | null; returnReason: string } {
  const isInTransit = delivery.attemptedDeliveryQty > 0 || delivery.outForDeliveryQty > 0 || delivery.inTransitQty > 0;

  if (isInTransit && delivery.earliestShippedAt) {
    const daysSinceShipped = (now.getTime() - delivery.earliestShippedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceShipped > returnWindowDays) {
      return {
        returnStatus: "notReturnable",
        notReturnableReason: "outsideWindow",
        shippingStage: null,
        returnReason: formatReturnWindowExpiredReason(delivery.earliestShippedAt, returnWindowDays),
      };
    }
  }

  const stage: ShippingStage =
    delivery.attemptedDeliveryQty > 0 ? "attemptedDelivery"
    : delivery.outForDeliveryQty > 0 ? "outForDelivery"
    : delivery.inTransitQty > 0 ? "onItsWay"
    : "confirmed";

  return {
    returnStatus: "notReturnable",
    notReturnableReason: "notDelivered",
    shippingStage: stage,
    returnReason: SHIPPING_STAGE_REASON[stage],
  };
}

function formatReturnWindowExpiredReason(deliveredAt: Date | null, returnWindowDays: number): string {
  if (!deliveredAt) return "The return window has expired for this item.";
  const closed = new Date(deliveredAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000);
  const closedLabel = closed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `The return window closed on ${closedLabel}.`;
}

function buildTrackingUrl(company: string | null, number: string): string {
  const c = (company || "").toLowerCase();
  if (c.includes("royal mail")) return `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(number)}`;
  if (c.includes("evri") || c.includes("hermes")) return `https://www.evri.com/track-a-parcel#/reference/${encodeURIComponent(number)}`;
  if (c.includes("dpd")) return `https://www.dpd.co.uk/service/index.jsp?focusOnRef=true&reference=${encodeURIComponent(number)}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}`;
  if (c.includes("fedex")) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(number)}`;
  if (c.includes("dhl")) return `https://www.dhl.com/gb-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(number)}`;
  if (c.includes("yodel")) return `https://www.yodel.co.uk/track/${encodeURIComponent(number)}`;
  return `https://www.royalmail.com/portal/rm/track?trackNumber=${encodeURIComponent(number)}`;
}
