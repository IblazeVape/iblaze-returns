// app/api/app/media-library/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";

export const dynamic = "force-dynamic";

/** Cap pages so a huge Content library can't stall the picker indefinitely. */
const PAGE_SIZE = 50;
const MAX_PAGES = 10; // up to 500 images

type LibraryFile = {
  id: string;
  url: string;
  alt: string | null;
  width: number;
  height: number;
};

/**
 * Lists IMAGE files from the shop's Content → Files library for the settings
 * image picker. Product-only images that were never added to Files won't appear
 * here — that's Shopify's Files API scope, not a bug in the picker.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const files: LibraryFile[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    let pages = 0;

    while (hasNextPage && pages < MAX_PAGES) {
      pages += 1;
      const data = await shopifyAdmin(
        claims.shop,
        `query MediaLibraryImages($query: String!, $cursor: String) {
          files(first: ${PAGE_SIZE}, after: $cursor, query: $query, sortKey: CREATED_AT, reverse: true) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                ... on MediaImage {
                  id
                  alt
                  image { url width height }
                }
              }
            }
          }
        }`,
        { query: "media_type:IMAGE", cursor },
        "MediaLibraryImages"
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const edges = (data?.files?.edges ?? []) as any[];
      for (const edge of edges) {
        const node = edge?.node;
        if (!node?.image?.url) continue;
        files.push({
          id: node.id as string,
          url: node.image.url as string,
          alt: (node.alt as string | null) ?? null,
          width: node.image.width as number,
          height: node.image.height as number,
        });
      }

      hasNextPage = Boolean(data?.files?.pageInfo?.hasNextPage);
      cursor = (data?.files?.pageInfo?.endCursor as string | null) ?? null;
      if (!cursor) hasNextPage = false;
    }

    return NextResponse.json({
      files,
      truncated: hasNextPage,
      totalReturned: files.length,
    });
  } catch (err) {
    console.error("media-library error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load media library" }, { status: 500 });
  }
}
