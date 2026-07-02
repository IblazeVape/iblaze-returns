// Store-owner-managed help docs, rendered Nextra-style at /docs and edited
// at /admin/docs. The whole docs site (sidebar navigation + page content) is
// one JSON document in Redis so the owner can add, remove, and reorder
// entries freely. Falls back to the seeded defaults until they save changes.

export interface DocPageMeta {
  slug: string;
  title: string;
}

export interface DocsSection {
  id: string;
  title: string;
  pages: DocPageMeta[];
}

export interface DocPageContent {
  title: string;
  description?: string;
  content: string; // markdown
}

export interface DocsConfig {
  sections: DocsSection[];
  pages: Record<string, DocPageContent>;
}

const DOCS_KEY = "docs:config";

export const DEFAULT_DOCS: DocsConfig = {
  sections: [
    {
      id: "getting-started",
      title: "Getting Started",
      pages: [
        { slug: "welcome", title: "Welcome" },
        { slug: "how-returns-work", title: "How returns work" },
      ],
    },
    {
      id: "making-a-return",
      title: "Making a Return",
      pages: [
        { slug: "start-a-return", title: "Start a return" },
        { slug: "return-windows", title: "Return windows" },
        { slug: "refunds-and-exchanges", title: "Refunds & exchanges" },
      ],
    },
    {
      id: "help",
      title: "Help",
      pages: [
        { slug: "faq", title: "FAQ" },
        { slug: "contact-us", title: "Contact us" },
      ],
    },
  ],
  pages: {
    "welcome": {
      title: "Welcome",
      description: "Everything you need to know about returning an order.",
      content: `# Welcome

This is our help centre — everything you need to know about returning an order, in one place.

## What you can do here

- **Find your order** using the search bar in the portal navigation
- **Start a return** for delivered items that are still inside the return window
- **Track a return** you have already submitted
- **Read our policies** on refunds, exchanges, and return windows

## Need to make a return?

Head to [Start a return](/docs/start-a-return) for a step-by-step guide, or open the [returns portal](/) and sign in with the email you used at checkout.
`,
    },
    "how-returns-work": {
      title: "How returns work",
      description: "The journey of a return, from request to refund.",
      content: `# How returns work

Returning an item takes just a few minutes. Here is the full journey of a return, from request to refund.

## 1. Sign in to the portal

Sign in with the email address you used when placing your order. We will send you a secure code — no password needed.

## 2. Pick your order

Your recent orders appear as soon as you sign in. Use the search bar in the navigation to find an older order quickly.

## 3. Choose the items

Select which items you want to return and tell us why. Some items may not be eligible if they are outside the return window or excluded by our policy.

## 4. Send it back

Once your return is approved you will receive instructions for sending your items back to us.

## 5. Get your refund

When the returned items arrive and pass a quick check, we issue your refund to the original payment method.

> **Tip:** you can check the status of any return at any time from the portal.
`,
    },
    "start-a-return": {
      title: "Start a return",
      description: "A step-by-step guide to submitting a return.",
      content: `# Start a return

A step-by-step guide to submitting a return through the portal.

## Before you begin

Make sure you have:

- The **email address** you used at checkout
- Your items in an **unused, resellable condition** where possible

## Steps

1. Open the returns portal and **sign in** with your order email
2. **Find your order** — recent orders are listed, or use the search bar in the navigation
3. Press **Start a Return** on the order
4. **Select the items** you are returning and choose a reason for each
5. Review the summary and **submit your return**

You will get a confirmation on screen and by email once your return has been received.

## What happens next?

We review your request, usually within one business day. You can follow the progress from the portal at any time.
`,
    },
    "return-windows": {
      title: "Return windows",
      description: "How long you have to return an item.",
      content: `# Return windows

A return window is the period after delivery during which an item can be returned.

## Standard window

Most items can be returned within **30 days of delivery**. The portal checks this automatically for every item in your order — if an item is still in its window, you can select it when starting a return.

## Why an item might not be returnable

| Reason | What it means |
| --- | --- |
| Outside the window | The item was delivered too long ago |
| Not yet delivered | Returns start from the delivery date |
| Excluded item | Some product types cannot be returned for hygiene or safety reasons |

If you believe an item has been marked ineligible by mistake, [contact us](/docs/contact-us) and we will take a look.
`,
    },
    "refunds-and-exchanges": {
      title: "Refunds & exchanges",
      description: "When and how you get your money back.",
      content: `# Refunds & exchanges

## Refunds

Once your return arrives back with us and passes a quick check, we issue your refund.

- Refunds go to the **original payment method**
- Most refunds appear within **3–5 business days** of being issued
- You will receive an email confirmation when the refund is on its way

## Exchanges

If you would like a different size, colour, or product, the fastest option is to return the original item for a refund and place a new order.

## Partial refunds

If only some items from an order are returned, the refund covers those items only. Shipping costs are refunded when the whole order is returned due to our error.
`,
    },
    "faq": {
      title: "FAQ",
      description: "Answers to common questions.",
      content: `# Frequently asked questions

## Do I need an account?

No. Sign in with the email you used at checkout and we will send you a secure code.

## I can't find my order

Use the search bar in the portal navigation. If it still doesn't appear, double-check you signed in with the same email address used for the order.

## Can I cancel a return?

Yes — as long as the return has not been processed yet, get in touch and we will cancel it for you.

## My refund hasn't arrived

Refunds usually appear within 3–5 business days of being issued. If it has been longer, check with your bank first, then [contact us](/docs/contact-us).

## Do I pay for return shipping?

That depends on the reason for the return — full details are provided with your return instructions.
`,
    },
    "contact-us": {
      title: "Contact us",
      description: "Get help from a real person.",
      content: `# Contact us

Can't find the answer you need? We're happy to help.

- **Email:** [info@iblazevape.co.uk](mailto:info@iblazevape.co.uk)
- **Hours:** Monday–Friday, 9am–5pm

When you get in touch about an order, include the **order number** and the **email address** used at checkout so we can help you faster.
`,
    },
  },
};

function isValidConfig(cfg: unknown): cfg is DocsConfig {
  if (!cfg || typeof cfg !== "object") return false;
  const c = cfg as DocsConfig;
  return Array.isArray(c.sections) && !!c.pages && typeof c.pages === "object";
}

export async function getDocsConfig(): Promise<DocsConfig> {
  try {
    const { redis } = await import("@/lib/redis");
    const cfg = await redis.get<DocsConfig>(DOCS_KEY);
    if (isValidConfig(cfg)) return cfg;
  } catch {
    // No Redis configured (e.g. local dev) — serve the defaults.
  }
  return DEFAULT_DOCS;
}

export async function saveDocsConfig(cfg: DocsConfig): Promise<void> {
  const { redis } = await import("@/lib/redis");
  await redis.set(DOCS_KEY, cfg);
}

export async function resetDocsConfig(): Promise<void> {
  const { redis } = await import("@/lib/redis");
  await redis.del(DOCS_KEY);
}

/** Flattened page order, used for prev/next navigation and default page. */
export function flattenDocs(cfg: DocsConfig): (DocPageMeta & { section: string })[] {
  return cfg.sections.flatMap((s) =>
    s.pages.map((p) => ({ ...p, section: s.title })),
  );
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64) || "page";
}
