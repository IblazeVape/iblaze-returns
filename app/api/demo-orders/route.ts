import { NextResponse } from "next/server"

// Public demo data for /demo — the same OrdersData shape /api/get-orders
// returns, so DashboardClient renders it identically to the real portal.
// Dates are computed relative to "now" so return windows always look live.

export const dynamic = "force-dynamic"

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

// Self-contained product thumbnails (no external image hosts)
function thumb(label: string, bg: string, fg = "#ffffff") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="12" fill="${bg}"/><text x="60" y="68" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${fg}" text-anchor="middle">${label}</text></svg>`
  return { url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` }
}

const IMG = {
  berry: thumb("BB", "#7c3aed"),
  mint: thumb("IM", "#0d9488"),
  mango: thumb("MT", "#f59e0b"),
  grape: thumb("GS", "#6d28d9"),
  cola: thumb("CC", "#b45309"),
  cherry: thumb("CH", "#dc2626"),
  kiwi: thumb("KP", "#16a34a"),
  blue: thumb("BR", "#2563eb"),
}

const baseItem = {
  refundedQuantity: 0,
  requestedReturnQuantity: 0,
  openReturnQuantity: 0,
  completedReturnQuantity: 0,
  declinedReturnQuantity: 0,
  declinedReturnEntries: [] as { quantity: number; message: string }[],
}

const ORDERS = [
  // ── Delivered 4 days ago — fully eligible ────────────────────────────────
  {
    id: "gid://shopify/Order/9001",
    name: "#1035",
    createdAt: daysAgo(9),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "72.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 18, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 18,
    earliestDelivery: daysAgo(4), latestDelivery: daysAgo(4),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/1", title: "Blazed Berry Burst 3500", quantity: 6, eligibleQuantity: 6, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "berry-burst", image: IMG.berry, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/2", title: "Iced Mint 3500 Puffs", quantity: 6, eligibleQuantity: 6, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "iced-mint", image: IMG.mint, variant: { title: "10mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/3", title: "Mango Tango 3500", quantity: 6, eligibleQuantity: 6, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "mango-tango", image: IMG.mango, variant: { title: "20mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/1", displayStatus: "DELIVERED", shippedAt: daysAgo(7), deliveredAt: daysAgo(4), trackingInfo: [{ company: "Royal Mail", number: "RM123456789GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/1", quantity: 6 }, { id: "gid://shopify/LineItem/2", quantity: 6 }, { id: "gid://shopify/LineItem/3", quantity: 6 }] },
    ],
  },
  // ── Partially delivered — 4 delivered, 14 not yet shipped ────────────────
  {
    id: "gid://shopify/Order/9002",
    name: "#1034",
    createdAt: daysAgo(6),
    cancelledAt: null,
    displayFulfillmentStatus: "PARTIALLY_FULFILLED",
    totalPriceSet: { shopMoney: { amount: "72.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Partially delivered",
    deliveredCount: 4, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 14, notDispatchedCount: 0,
    totalUnits: 18,
    earliestDelivery: daysAgo(2), latestDelivery: daysAgo(2),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/4", title: "Grape Soda 3500 Puffs", quantity: 4, eligibleQuantity: 4, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(2), productHandle: "grape-soda", image: IMG.grape, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/5", title: "Classic Cola 3500", quantity: 14, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Confirmed", returnReason: "This item hasn't been dispatched yet — check back once it ships.", lineDeliveredAt: null, productHandle: "classic-cola", image: IMG.cola, variant: { title: "10mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/2", displayStatus: "DELIVERED", shippedAt: daysAgo(4), deliveredAt: daysAgo(2), trackingInfo: [{ company: "Evri", number: "H0012345678", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/4", quantity: 4 }] },
    ],
  },
  // ── On its way ────────────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9003",
    name: "#1033",
    createdAt: daysAgo(3),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "148.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "On its way",
    deliveredCount: 0, dispatchedCount: 37, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 37,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/6", title: "Cherry Ice 3500 Puffs", quantity: 20, eligibleQuantity: 0, unitPrice: 4, returnStatus: "On its way", returnReason: "Your parcel is on its way. Your return window starts once it's delivered.", inTransitQuantity: 20, lineDeliveredAt: null, productHandle: "cherry-ice", image: IMG.cherry, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/7", title: "Kiwi Passion 3500", quantity: 17, eligibleQuantity: 0, unitPrice: 4, returnStatus: "On its way", returnReason: "Your parcel is on its way. Your return window starts once it's delivered.", inTransitQuantity: 17, lineDeliveredAt: null, productHandle: "kiwi-passion", image: IMG.kiwi, variant: { title: "10mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/3", displayStatus: "IN_TRANSIT", shippedAt: daysAgo(1), deliveredAt: null, trackingInfo: [{ company: "Royal Mail", number: "RM987654321GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/6", quantity: 20 }, { id: "gid://shopify/LineItem/7", quantity: 17 }] },
    ],
  },
  // ── Confirmed — not yet shipped ───────────────────────────────────────────
  {
    id: "gid://shopify/Order/9004",
    name: "#1032",
    createdAt: daysAgo(1),
    cancelledAt: null,
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "260.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Confirmed",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 65, notDispatchedCount: 0,
    totalUnits: 65,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/8", title: "Blue Razz 3500 Puffs", quantity: 40, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Confirmed", returnReason: "This item hasn't been dispatched yet — check back once it ships.", lineDeliveredAt: null, productHandle: "blue-razz", image: IMG.blue, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/9", title: "Iced Mint 3500 Puffs", quantity: 25, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Confirmed", returnReason: "This item hasn't been dispatched yet — check back once it ships.", lineDeliveredAt: null, productHandle: "iced-mint", image: IMG.mint, variant: { title: "10mg" } },
    ],
    shipments: [],
  },
  // ── Delivered with a completed refund ────────────────────────────────────
  {
    id: "gid://shopify/Order/9005",
    name: "#1031",
    createdAt: daysAgo(20),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "160.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "16.00" } },
    orderStatus: "Delivered",
    deliveredCount: 40, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 40,
    earliestDelivery: daysAgo(15), latestDelivery: daysAgo(15),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/10", title: "Mango Tango 3500", quantity: 20, eligibleQuantity: 16, refundedQuantity: 4, completedReturnQuantity: 4, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(15), productHandle: "mango-tango", image: IMG.mango, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/11", title: "Grape Soda 3500 Puffs", quantity: 20, eligibleQuantity: 20, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(15), productHandle: "grape-soda", image: IMG.grape, variant: { title: "10mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/5", displayStatus: "DELIVERED", shippedAt: daysAgo(18), deliveredAt: daysAgo(15), trackingInfo: [{ company: "DPD", number: "155001234567", url: "https://track.dpd.co.uk" }], items: [{ id: "gid://shopify/LineItem/10", quantity: 20 }, { id: "gid://shopify/LineItem/11", quantity: 20 }] },
    ],
  },
  // ── Cancelled ─────────────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9006",
    name: "#1030",
    createdAt: daysAgo(25),
    cancelledAt: daysAgo(25),
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "288.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "288.00" } },
    orderStatus: "Cancelled",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 72,
    totalUnits: 72,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/12", title: "Cherry Ice 3500 Puffs", quantity: 72, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Cancelled", lineDeliveredAt: null, productHandle: "cherry-ice", image: IMG.cherry, variant: { title: "20mg" } },
    ],
    shipments: [],
  },
  // ── Delivered long ago — return window passed ─────────────────────────────
  {
    id: "gid://shopify/Order/9007",
    name: "#1029",
    createdAt: daysAgo(55),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 25, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 25,
    earliestDelivery: daysAgo(50), latestDelivery: daysAgo(50),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/13", title: "Classic Cola 3500", quantity: 15, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Passed the return window", returnReason: "The 30-day return window closed on this item.", lineDeliveredAt: daysAgo(50), productHandle: "classic-cola", image: IMG.cola, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/14", title: "Blazed Berry Burst 3500", quantity: 10, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Passed the return window", returnReason: "The 30-day return window closed on this item.", lineDeliveredAt: daysAgo(50), productHandle: "berry-burst", image: IMG.berry, variant: { title: "10mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/7", displayStatus: "DELIVERED", shippedAt: daysAgo(53), deliveredAt: daysAgo(50), trackingInfo: [{ company: "Royal Mail", number: "RM555666777GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/13", quantity: 15 }, { id: "gid://shopify/LineItem/14", quantity: 10 }] },
    ],
  },
  // ── Dispatched recently ──────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9008",
    name: "#1028",
    createdAt: daysAgo(60),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "8.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 2, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 2,
    earliestDelivery: daysAgo(56), latestDelivery: daysAgo(56),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/15", title: "Kiwi Passion 3500", quantity: 2, eligibleQuantity: 0, unitPrice: 4, returnStatus: "Passed the return window", returnReason: "The 30-day return window closed on this item.", lineDeliveredAt: daysAgo(56), productHandle: "kiwi-passion", image: IMG.kiwi, variant: { title: "20mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/8", displayStatus: "DELIVERED", shippedAt: daysAgo(58), deliveredAt: daysAgo(56), trackingInfo: [], items: [{ id: "gid://shopify/LineItem/15", quantity: 2 }] },
    ],
  },
  // ── Delivered — mostly refunded already ──────────────────────────────────
  {
    id: "gid://shopify/Order/9009",
    name: "#1027",
    createdAt: daysAgo(28),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "120.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "48.00" } },
    orderStatus: "Delivered",
    deliveredCount: 30, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 30,
    earliestDelivery: daysAgo(24), latestDelivery: daysAgo(24),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/16", title: "Blue Razz 3500 Puffs", quantity: 18, eligibleQuantity: 6, refundedQuantity: 12, completedReturnQuantity: 12, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(24), productHandle: "blue-razz", image: IMG.blue, variant: { title: "20mg" } },
      { ...baseItem, id: "gid://shopify/LineItem/17", title: "Cherry Ice 3500 Puffs", quantity: 12, eligibleQuantity: 12, unitPrice: 4, returnStatus: "Eligible", lineDeliveredAt: daysAgo(24), productHandle: "cherry-ice", image: IMG.cherry, variant: { title: "10mg" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/9", displayStatus: "DELIVERED", shippedAt: daysAgo(26), deliveredAt: daysAgo(24), trackingInfo: [{ company: "Evri", number: "H0099887766", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/16", quantity: 18 }, { id: "gid://shopify/LineItem/17", quantity: 12 }] },
    ],
  },
]

export async function GET() {
  return NextResponse.json({
    firstName: "Demo",
    email: "demo@reflow.app",
    orders: ORDERS,
    hasNextPage: false,
    endCursor: null,
  })
}
