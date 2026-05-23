# iBlaze Returns Portal — Next.js + shadcn/ui

A full-stack returns management system built with **Next.js 15** (App Router), **Tailwind CSS**, and **shadcn/ui** design principles.

## What's included

| Route | Description |
|---|---|
| `/` | Customer login (Shopify OAuth) |
| `/dashboard` | Customer's orders + return flow |
| `/admin/login` | Admin password login |
| `/admin/dashboard` | Returns overview stats |
| `/admin/returns` | Full returns table with detail drawer |

## Architecture

```
app/
├── page.tsx                    ← Customer login
├── dashboard/page.tsx          ← Customer orders & returns
├── admin/
│   ├── layout.tsx              ← Admin sidebar layout
│   ├── login/page.tsx          ← Admin login
│   ├── dashboard/page.tsx      ← Stats overview
│   └── returns/page.tsx        ← Returns table + detail drawer
├── api/
│   ├── login/route.ts          ← Shopify OAuth redirect
│   ├── callback/route.ts       ← OAuth callback → sets portal_session cookie
│   ├── logout/route.ts         ← Clears customer session
│   ├── get-orders/route.ts     ← Fetches customer orders
│   ├── submit-return/route.ts  ← Submits return to Shopify
│   ├── submit-claim/route.ts   ← Submits logistics claim to Gleap
│   └── admin/
│       ├── login/route.ts      ← Admin password auth
│       ├── logout/route.ts     ← Clears admin session
│       └── returns/route.ts    ← Fetches all Shopify returns
lib/
├── auth.ts                     ← Session validation utilities
├── shopify.ts                  ← Shopify Admin GraphQL client
├── mailjet.ts                  ← Email sending
└── templates.js                ← Email HTML templates
middleware.ts                   ← Route protection
```

## Setup & Deployment

### 1. Clone and install

```bash
git clone https://github.com/your-org/iblaze-returns-dashboard
cd iblaze-returns-dashboard
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in **all** values in `.env.local`. The critical ones:

| Variable | Where to find it |
|---|---|
| `SHOPIFY_ACCESS_TOKEN` | Shopify Partner Dashboard → Your App → API credentials |
| `SHOPIFY_STORE_URL` | `yourstore.myshopify.com` (no https://) |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | App credentials in Partner Dashboard |
| `CUSTOMER_API_CLIENT_ID` / `CUSTOMER_API_CLIENT_SECRET` | Headless channel in your store |
| `PORTAL_SECRET` | Run: `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Any strong password you choose |
| `ADMIN_SECRET` | Run: `openssl rand -hex 32` |

### 3. Update Shopify OAuth redirect URI

In your Shopify Partner Dashboard → Your App → Configuration, add this redirect URI:

```
https://your-vercel-domain.vercel.app/api/callback
```

Also add your local dev URL for testing:
```
https://localhost:3000/api/callback
```

### 4. Local development

```bash
npm run dev
```

Visit `http://localhost:3000`

> **Note:** Shopify OAuth requires HTTPS. For local testing, either use ngrok or test on Vercel preview deployments.

### 5. Deploy to Vercel

```bash
# Push to GitHub first, then:
vercel --prod
```

Or connect the repo in the Vercel dashboard and it deploys automatically on every push to `main`.

**Add all env vars in:** Vercel Dashboard → Project Settings → Environment Variables

Match each variable from your `.env.example` — they're already set in your Vercel project (as seen in the screenshot).

## Session Security

- **Customer sessions:** HMAC-SHA256 signed cookie (`portal_session`) containing email + Shopify access token + expiry. Verified against Shopify on every protected API call.
- **Admin sessions:** HMAC-SHA256 signed cookie (`admin_session`) valid for 8 hours. Password set via `ADMIN_PASSWORD` env var.
- **Middleware** enforces auth on `/dashboard/*` and `/admin/*` routes.

## Adding shadcn/ui components

This project is pre-configured for shadcn. Install any component with:

```bash
npx shadcn@latest add button
npx shadcn@latest add table
npx shadcn@latest add dialog
# etc.
```

## Notes

- The `generate-link.js` API (used by your Gleap chatbot widget) is **not** migrated here — it runs as a Vercel serverless function and can stay in a separate `/api` folder or be ported to `app/api/generate-link/route.ts` if needed.
- Gleap JWT tokens in `submit-claim.ts` should be moved to the `GLEAP_TOKEN` env variable (already done in the new code).
