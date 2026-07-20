import { NextResponse } from "next/server"

// Public demo data for /demo — the same OrdersData shape /api/get-orders
// returns, so DashboardClient renders it identically to the real portal.
// Dates are computed relative to "now" so return windows always look live.

export const dynamic = "force-dynamic"

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

// Self-contained product thumbnails (no external image hosts) — soft-tinted
// tiles with an emoji product glyph, so they read as product photos.
function thumb(emoji: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="12" fill="${bg}"/><text x="60" y="76" font-size="52" text-anchor="middle">${emoji}</text></svg>`
  return { url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` }
}

const IMG = {
  headphones: thumb("🎧", "#eef2ff"),
  keyboard: thumb("⌨️", "#f0fdf4"),
  charger: thumb("🔌", "#fff7ed"),
  watch: thumb("⌚", "#fdf2f8"),
  speaker: thumb("🔊", "#ecfeff"),
  mouse: thumb("🖱️", "#f5f3ff"),
  camera: thumb("📷", "#fefce8"),
  earbuds: thumb("🎵", "#f0f9ff"),
  monitor: thumb("🖥️", "#f0f9ff"),
  tablet: thumb("📱", "#fdf4ff"),
  drone: thumb("🚁", "#f0fdfa"),
  lamp: thumb("💡", "#fffbeb"),
  printer: thumb("🖨️", "#f8fafc"),
  router: thumb("📶", "#f0fdf4"),
  ssd: thumb("💾", "#eef2ff"),
  webcam: thumb("📸", "#fdf2f8"),
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
    totalPriceSet: { shopMoney: { amount: "236.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 4, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 4,
    earliestDelivery: daysAgo(4), latestDelivery: daysAgo(4),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/1", title: "Aura Wireless Headphones", quantity: 1, eligibleQuantity: 1, unitPrice: 89, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "aura-wireless-headphones", image: IMG.headphones, variant: { title: "Midnight Black" } },
      { ...baseItem, id: "gid://shopify/LineItem/2", title: "AirPro Earbuds Gen 3", quantity: 2, eligibleQuantity: 2, unitPrice: 59, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "airpro-earbuds", image: IMG.earbuds, variant: { title: "White" } },
      { ...baseItem, id: "gid://shopify/LineItem/3", title: "65W GaN Fast Charger", quantity: 1, eligibleQuantity: 1, unitPrice: 29, returnStatus: "Eligible", lineDeliveredAt: daysAgo(4), productHandle: "65w-gan-charger", image: IMG.charger, variant: { title: "White" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/1", displayStatus: "DELIVERED", shippedAt: daysAgo(7), deliveredAt: daysAgo(4), trackingInfo: [{ company: "Royal Mail", number: "RM123456789GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/1", quantity: 1 }, { id: "gid://shopify/LineItem/2", quantity: 2 }, { id: "gid://shopify/LineItem/3", quantity: 1 }] },
    ],
  },
  // ── Partially delivered — 1 delivered, 2 not yet shipped ────────────────
  {
    id: "gid://shopify/Order/9002",
    name: "#1034",
    createdAt: daysAgo(6),
    cancelledAt: null,
    displayFulfillmentStatus: "PARTIALLY_FULFILLED",
    totalPriceSet: { shopMoney: { amount: "247.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Partially delivered",
    deliveredCount: 1, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 2, notDispatchedCount: 0,
    totalUnits: 3,
    earliestDelivery: daysAgo(2), latestDelivery: daysAgo(2),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/4", title: "Pulse Smartwatch S2", quantity: 1, eligibleQuantity: 1, unitPrice: 149, returnStatus: "Eligible", lineDeliveredAt: daysAgo(2), productHandle: "pulse-smartwatch-s2", image: IMG.watch, variant: { title: "44mm · Slate" } },
      { ...baseItem, id: "gid://shopify/LineItem/5", title: "BoomBox Mini Speaker", quantity: 2, eligibleQuantity: 0, unitPrice: 49, returnStatus: "awaitingDelivery", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping.", lineDeliveredAt: null, productHandle: "boombox-mini-speaker", image: IMG.speaker, variant: { title: "Charcoal" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/2", displayStatus: "DELIVERED", shippedAt: daysAgo(4), deliveredAt: daysAgo(2), trackingInfo: [{ company: "Evri", number: "H0012345678", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/4", quantity: 1 }] },
    ],
  },
  // ── On its way ────────────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9003",
    name: "#1033",
    createdAt: daysAgo(3),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "158.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "On its way",
    deliveredCount: 0, dispatchedCount: 2, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 2,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/6", title: "GlideX Wireless Mouse", quantity: 1, eligibleQuantity: 0, unitPrice: 39, returnStatus: "awaitingDelivery", shippingStage: "onItsWay", returnReason: "These items are on their way.", inTransitQuantity: 1, lineDeliveredAt: null, productHandle: "glidex-wireless-mouse", image: IMG.mouse, variant: { title: "Graphite" } },
      { ...baseItem, id: "gid://shopify/LineItem/7", title: "MechType K87 Keyboard", quantity: 1, eligibleQuantity: 0, unitPrice: 119, returnStatus: "awaitingDelivery", shippingStage: "onItsWay", returnReason: "These items are on their way.", inTransitQuantity: 1, lineDeliveredAt: null, productHandle: "mechtype-k87-keyboard", image: IMG.keyboard, variant: { title: "RGB · UK Layout" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/3", displayStatus: "IN_TRANSIT", shippedAt: daysAgo(1), deliveredAt: null, trackingInfo: [{ company: "Royal Mail", number: "RM987654321GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/6", quantity: 1 }, { id: "gid://shopify/LineItem/7", quantity: 1 }] },
    ],
  },
  // ── Confirmed — not yet shipped ───────────────────────────────────────────
  {
    id: "gid://shopify/Order/9004",
    name: "#1032",
    createdAt: daysAgo(1),
    cancelledAt: null,
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "258.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Confirmed",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 2, notDispatchedCount: 0,
    totalUnits: 2,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/8", title: "4K Action Camera Pro", quantity: 1, eligibleQuantity: 0, unitPrice: 199, returnStatus: "awaitingDelivery", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping.", lineDeliveredAt: null, productHandle: "4k-action-camera-pro", image: IMG.camera, variant: { title: "Bundle Kit" } },
      { ...baseItem, id: "gid://shopify/LineItem/9", title: "AirPro Earbuds Gen 3", quantity: 1, eligibleQuantity: 0, unitPrice: 59, returnStatus: "awaitingDelivery", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping.", lineDeliveredAt: null, productHandle: "airpro-earbuds", image: IMG.earbuds, variant: { title: "Midnight" } },
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
    totalPriceSet: { shopMoney: { amount: "277.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "119.00" } },
    orderStatus: "Delivered",
    deliveredCount: 3, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 3,
    earliestDelivery: daysAgo(15), latestDelivery: daysAgo(15),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/10", title: "MechType K87 Keyboard", quantity: 2, eligibleQuantity: 1, refundedQuantity: 1, completedReturnQuantity: 1, unitPrice: 119, returnStatus: "Eligible", lineDeliveredAt: daysAgo(15), productHandle: "mechtype-k87-keyboard", image: IMG.keyboard, variant: { title: "RGB · UK Layout" } },
      { ...baseItem, id: "gid://shopify/LineItem/11", title: "GlideX Wireless Mouse", quantity: 1, eligibleQuantity: 1, unitPrice: 39, returnStatus: "Eligible", lineDeliveredAt: daysAgo(15), productHandle: "glidex-wireless-mouse", image: IMG.mouse, variant: { title: "Graphite" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/5", displayStatus: "DELIVERED", shippedAt: daysAgo(18), deliveredAt: daysAgo(15), trackingInfo: [{ company: "DPD", number: "155001234567", url: "https://track.dpd.co.uk" }], items: [{ id: "gid://shopify/LineItem/10", quantity: 2 }, { id: "gid://shopify/LineItem/11", quantity: 1 }] },
    ],
  },
  // ── Cancelled ─────────────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9006",
    name: "#1030",
    createdAt: daysAgo(25),
    cancelledAt: daysAgo(25),
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "298.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "298.00" } },
    orderStatus: "Cancelled",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 2,
    totalUnits: 2,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/12", title: "Pulse Smartwatch S2", quantity: 2, eligibleQuantity: 0, unitPrice: 149, returnStatus: "Cancelled", lineDeliveredAt: null, productHandle: "pulse-smartwatch-s2", image: IMG.watch, variant: { title: "44mm · Slate" } },
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
    totalPriceSet: { shopMoney: { amount: "107.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 3, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 3,
    earliestDelivery: daysAgo(50), latestDelivery: daysAgo(50),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/13", title: "BoomBox Mini Speaker", quantity: 1, eligibleQuantity: 0, unitPrice: 49, returnStatus: "returnWindowClosed", closedReason: "outsideWindow", returnReason: "The return window has expired for these items.", lineDeliveredAt: daysAgo(50), productHandle: "boombox-mini-speaker", image: IMG.speaker, variant: { title: "Charcoal" } },
      { ...baseItem, id: "gid://shopify/LineItem/14", title: "65W GaN Fast Charger", quantity: 2, eligibleQuantity: 0, unitPrice: 29, returnStatus: "returnWindowClosed", closedReason: "outsideWindow", returnReason: "The return window has expired for these items.", lineDeliveredAt: daysAgo(50), productHandle: "65w-gan-charger", image: IMG.charger, variant: { title: "White" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/7", displayStatus: "DELIVERED", shippedAt: daysAgo(53), deliveredAt: daysAgo(50), trackingInfo: [{ company: "Royal Mail", number: "RM555666777GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/13", quantity: 1 }, { id: "gid://shopify/LineItem/14", quantity: 2 }] },
    ],
  },
  // ── Delivered long ago — window passed ────────────────────────────────────
  {
    id: "gid://shopify/Order/9008",
    name: "#1028",
    createdAt: daysAgo(60),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "199.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 1, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: daysAgo(56), latestDelivery: daysAgo(56),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/15", title: "4K Action Camera Pro", quantity: 1, eligibleQuantity: 0, unitPrice: 199, returnStatus: "returnWindowClosed", closedReason: "outsideWindow", returnReason: "The return window has expired for these items.", lineDeliveredAt: daysAgo(56), productHandle: "4k-action-camera-pro", image: IMG.camera, variant: { title: "Bundle Kit" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/8", displayStatus: "DELIVERED", shippedAt: daysAgo(58), deliveredAt: daysAgo(56), trackingInfo: [], items: [{ id: "gid://shopify/LineItem/15", quantity: 1 }] },
    ],
  },
  // ── Delivered — partly refunded already ──────────────────────────────────
  {
    id: "gid://shopify/Order/9009",
    name: "#1027",
    createdAt: daysAgo(28),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "207.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "59.00" } },
    orderStatus: "Delivered",
    deliveredCount: 3, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 3,
    earliestDelivery: daysAgo(24), latestDelivery: daysAgo(24),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/16", title: "AirPro Earbuds Gen 3", quantity: 2, eligibleQuantity: 1, refundedQuantity: 1, completedReturnQuantity: 1, unitPrice: 59, returnStatus: "Eligible", lineDeliveredAt: daysAgo(24), productHandle: "airpro-earbuds", image: IMG.earbuds, variant: { title: "White" } },
      { ...baseItem, id: "gid://shopify/LineItem/17", title: "Aura Wireless Headphones", quantity: 1, eligibleQuantity: 1, unitPrice: 89, returnStatus: "Eligible", lineDeliveredAt: daysAgo(24), productHandle: "aura-wireless-headphones", image: IMG.headphones, variant: { title: "Midnight Black" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/9", displayStatus: "DELIVERED", shippedAt: daysAgo(26), deliveredAt: daysAgo(24), trackingInfo: [{ company: "Evri", number: "H0099887766", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/16", quantity: 2 }, { id: "gid://shopify/LineItem/17", quantity: 1 }] },
    ],
  },
  // ── Delivered — fully eligible, bigger order ─────────────────────────────
  {
    id: "gid://shopify/Order/9010",
    name: "#1026",
    createdAt: daysAgo(10),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "489.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 2, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 2,
    earliestDelivery: daysAgo(5), latestDelivery: daysAgo(5),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/18", title: "27\" QuantumView Monitor", quantity: 1, eligibleQuantity: 1, unitPrice: 329, returnStatus: "Eligible", lineDeliveredAt: daysAgo(5), productHandle: "quantumview-monitor-27", image: IMG.monitor, variant: { title: "QHD · 165Hz" } },
      { ...baseItem, id: "gid://shopify/LineItem/19", title: "TabPro 11 Tablet", quantity: 1, eligibleQuantity: 1, unitPrice: 159, returnStatus: "Eligible", lineDeliveredAt: daysAgo(5), productHandle: "tabpro-11-tablet", image: IMG.tablet, variant: { title: "128GB · Grey" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/10", displayStatus: "DELIVERED", shippedAt: daysAgo(8), deliveredAt: daysAgo(5), trackingInfo: [{ company: "DPD", number: "155009988776", url: "https://track.dpd.co.uk" }], items: [{ id: "gid://shopify/LineItem/18", quantity: 1 }, { id: "gid://shopify/LineItem/19", quantity: 1 }] },
    ],
  },
  // ── Out for delivery ──────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9011",
    name: "#1025",
    createdAt: daysAgo(2),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "349.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Out for delivery",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 1,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/20", title: "SkyHawk Mini Drone", quantity: 1, eligibleQuantity: 0, unitPrice: 349, returnStatus: "awaitingDelivery", shippingStage: "outForDelivery", returnReason: "These items are out for delivery today.", inTransitQuantity: 1, lineDeliveredAt: null, productHandle: "skyhawk-mini-drone", image: IMG.drone, variant: { title: "Sky Grey" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/11", displayStatus: "OUT_FOR_DELIVERY", shippedAt: daysAgo(1), deliveredAt: null, trackingInfo: [{ company: "Royal Mail", number: "RM445566778GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/20", quantity: 1 }] },
    ],
  },
  // ── Attempted delivery ────────────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9012",
    name: "#1024",
    createdAt: daysAgo(5),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "45.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivery attempted",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 1, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/21", title: "GlowBright Desk Lamp", quantity: 1, eligibleQuantity: 0, unitPrice: 45, returnStatus: "awaitingDelivery", shippingStage: "attemptedDelivery", returnReason: "A delivery attempt was made for these items. You'll be able to request a return once they've been delivered.", lineDeliveredAt: null, productHandle: "glowbright-desk-lamp", image: IMG.lamp, variant: { title: "Warm White" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/12", displayStatus: "ATTEMPTED_DELIVERY", shippedAt: daysAgo(3), deliveredAt: null, trackingInfo: [{ company: "Evri", number: "H0033445566", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/21", quantity: 1 }] },
    ],
  },
  // ── Delivered, fully refunded already ─────────────────────────────────────
  {
    id: "gid://shopify/Order/9013",
    name: "#1023",
    createdAt: daysAgo(18),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "129.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "129.00" } },
    orderStatus: "Delivered",
    deliveredCount: 1, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: daysAgo(14), latestDelivery: daysAgo(14),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/22", title: "InstaPrint Mini Printer", quantity: 1, eligibleQuantity: 0, refundedQuantity: 1, completedReturnQuantity: 1, unitPrice: 129, returnStatus: "Eligible", lineDeliveredAt: daysAgo(14), productHandle: "instaprint-mini-printer", image: IMG.printer, variant: { title: "White" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/13", displayStatus: "DELIVERED", shippedAt: daysAgo(16), deliveredAt: daysAgo(14), trackingInfo: [{ company: "Royal Mail", number: "RM223344556GB", url: "https://www.royalmail.com/track-your-item" }], items: [{ id: "gid://shopify/LineItem/22", quantity: 1 }] },
    ],
  },
  // ── Confirmed, not yet shipped ─────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9014",
    name: "#1022",
    createdAt: daysAgo(0),
    cancelledAt: null,
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "89.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Confirmed",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 1, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/23", title: "MeshLink Wi-Fi 6 Router", quantity: 1, eligibleQuantity: 0, unitPrice: 89, returnStatus: "awaitingDelivery", shippingStage: "confirmed", returnReason: "We're preparing these items for shipping.", lineDeliveredAt: null, productHandle: "meshlink-wifi6-router", image: IMG.router, variant: { title: "2-Pack" } },
    ],
    shipments: [],
  },
  // ── Delivered — return window passed ──────────────────────────────────────
  {
    id: "gid://shopify/Order/9015",
    name: "#1021",
    createdAt: daysAgo(70),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "99.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 1, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 1,
    earliestDelivery: daysAgo(65), latestDelivery: daysAgo(65),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/24", title: "SwiftSSD 1TB Portable Drive", quantity: 1, eligibleQuantity: 0, unitPrice: 99, returnStatus: "returnWindowClosed", closedReason: "outsideWindow", returnReason: "The return window has expired for these items.", lineDeliveredAt: daysAgo(65), productHandle: "swiftssd-1tb-portable", image: IMG.ssd, variant: { title: "Space Grey" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/14", displayStatus: "DELIVERED", shippedAt: daysAgo(67), deliveredAt: daysAgo(65), trackingInfo: [{ company: "DPD", number: "155001122334", url: "https://track.dpd.co.uk" }], items: [{ id: "gid://shopify/LineItem/24", quantity: 1 }] },
    ],
  },
  // ── Cancelled, refunded in full ────────────────────────────────────────────
  {
    id: "gid://shopify/Order/9016",
    name: "#1020",
    createdAt: daysAgo(12),
    cancelledAt: daysAgo(11),
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: { shopMoney: { amount: "79.00", currencyCode: "GBP" } },
    totalRefundedSet: { shopMoney: { amount: "79.00" } },
    orderStatus: "Cancelled",
    deliveredCount: 0, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 1,
    totalUnits: 1,
    earliestDelivery: null, latestDelivery: null,
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/25", title: "ClearView 1080p Webcam", quantity: 1, eligibleQuantity: 0, unitPrice: 79, returnStatus: "Cancelled", lineDeliveredAt: null, productHandle: "clearview-1080p-webcam", image: IMG.webcam, variant: { title: "Black" } },
    ],
    shipments: [],
  },
  // ── Delivered, part of it eligible ────────────────────────────────────────
  {
    id: "gid://shopify/Order/9017",
    name: "#1019",
    createdAt: daysAgo(8),
    cancelledAt: null,
    displayFulfillmentStatus: "FULFILLED",
    totalPriceSet: { shopMoney: { amount: "228.00", currencyCode: "GBP" } },
    totalRefundedSet: null,
    orderStatus: "Delivered",
    deliveredCount: 2, dispatchedCount: 0, outForDeliveryCount: 0,
    attemptedDeliveryCount: 0, confirmedCount: 0, notDispatchedCount: 0,
    totalUnits: 2,
    earliestDelivery: daysAgo(3), latestDelivery: daysAgo(3),
    eligibilitySource: "shopify",
    processedItems: [
      { ...baseItem, id: "gid://shopify/LineItem/26", title: "GlideX Wireless Mouse", quantity: 1, eligibleQuantity: 1, unitPrice: 39, returnStatus: "Eligible", lineDeliveredAt: daysAgo(3), productHandle: "glidex-wireless-mouse", image: IMG.mouse, variant: { title: "Graphite" } },
      { ...baseItem, id: "gid://shopify/LineItem/27", title: "27\" QuantumView Monitor", quantity: 1, eligibleQuantity: 1, unitPrice: 189, returnStatus: "Eligible", lineDeliveredAt: daysAgo(3), productHandle: "quantumview-monitor-27", image: IMG.monitor, variant: { title: "FHD · 165Hz" } },
    ],
    shipments: [
      { id: "gid://shopify/Fulfillment/15", displayStatus: "DELIVERED", shippedAt: daysAgo(6), deliveredAt: daysAgo(3), trackingInfo: [{ company: "Evri", number: "H0077889900", url: "https://www.evri.com/track" }], items: [{ id: "gid://shopify/LineItem/26", quantity: 1 }, { id: "gid://shopify/LineItem/27", quantity: 1 }] },
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
