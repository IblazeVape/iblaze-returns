// app/api/app/media-library/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMerchantSessionToken } from "@/lib/merchant-session-token";
import { shopifyAdmin } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const sessionToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const claims = sessionToken ? verifyMerchantSessionToken(sessionToken) : null;
  if (!claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await shopifyAdmin(
      claims.shop,
      `query MediaLibraryImages($query: String!) {
        files(first: 50, query: $query) {
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
      { query: "media_type:IMAGE" },
      "MediaLibraryImages"
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = (data?.files?.edges ?? [])
      .map((edge: any) => edge.node)
      .filter((node: any) => node?.image?.url)
      .map((node: any) => ({
        id: node.id as string,
        url: node.image.url as string,
        alt: (node.alt as string | null) ?? null,
        width: node.image.width as number,
        height: node.image.height as number,
      }));

    return NextResponse.json({ files });
  } catch (err) {
    console.error("media-library error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "failed to load media library" }, { status: 500 });
  }
}
