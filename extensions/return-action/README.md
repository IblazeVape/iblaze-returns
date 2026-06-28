# iBlaze Return Action — Customer Account UI Extension

Adds a **"Start a Return"** button next to "Buy again" and "Track order" on the
native Shopify Customer Account order page.

## How it works

| Extension target | What it does |
|---|---|
| `customer-account.order.action.menu-item.render` | Renders the "Start a Return" menu item in the order action row |
| `customer-account.order.action.render` | Renders a single-step modal with a deep-link CTA into the custom portal |

Shopify's order action modal is **single-step only**, so the extension acts as a
lightweight handoff screen — it explains what will happen, shows the vape-specific
policy notes, then opens the full multi-step wizard in the portal with the order
pre-loaded.

## Setup

1. This project must be registered as a Shopify app (Partner Dashboard → Apps → Create app).
2. Copy the app's `client_id` into a root-level `shopify.app.toml`.
3. Add `NEXT_PUBLIC_APP_URL` to your `.env` with the portal's production URL.
4. Run `shopify app dev` to test in development, `shopify app deploy` to push.

## Deep-link URL format

```
https://your-portal.vercel.app/wizard?order=<numeric-order-id>
```

The wizard page reads `?order=` from the URL and pre-selects that order,
skipping Step 1 (order selection).

## Files

```
extensions/return-action/
├── shopify.extension.toml       # Extension manifest
└── src/
    ├── OrderActionExtension.tsx # Menu item label
    └── OrderActionModal.tsx     # Single-step modal + deep-link CTA
```
