import DocsShell from "@/components/docs/docs-shell";
import { flattenDocs, getDocsConfig } from "@/lib/docs";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

// Docs are owner-editable at runtime (stored in Redis), so always render fresh.
export const dynamic = "force-dynamic";

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = await getDocsConfig();
  const page = slug?.length ? config.pages[slug[0]] : null;
  return {
    title: page ? `${page.title} — Help Center` : "Help Center",
    description: page?.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const config = await getDocsConfig();
  const flat = flattenDocs(config);

  if (flat.length === 0) notFound();

  // /docs → first page in the sidebar
  if (!slug?.length) redirect(`/docs/${flat[0].slug}`);

  const current = slug[0];
  const page = config.pages[current];
  const index = flat.findIndex((p) => p.slug === current);
  if (!page || index === -1) notFound();

  return (
    <DocsShell
      sections={config.sections}
      slug={current}
      page={page}
      prev={index > 0 ? flat[index - 1] : null}
      next={index < flat.length - 1 ? flat[index + 1] : null}
    />
  );
}
