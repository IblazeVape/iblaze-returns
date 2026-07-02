"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import React from "react";

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** Pull ##/### headings out of markdown for the "On this page" outline. */
export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      const text = match[2].replace(/[*_`~]/g, "").trim();
      headings.push({ id: headingId(text), text, depth: match[1].length as 2 | 3 });
    }
  }
  return headings;
}

function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("");
}

// No @tailwindcss/typography plugin in this app, so markdown elements are
// styled individually to match the Nextra/Next.js docs look.
export function DocsMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2
            id={headingId(textOf(children))}
            className="text-xl md:text-2xl font-semibold tracking-tight mt-10 mb-3 pb-1.5 border-b border-border scroll-mt-20"
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            id={headingId(textOf(children))}
            className="text-lg font-semibold tracking-tight mt-8 mb-2 scroll-mt-20"
          >
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="leading-7 text-muted-foreground [h1+&]:text-lg [h1+&]:mt-0 my-4">{children}</p>
        ),
        a: ({ href, children }) => {
          const url = href ?? "#";
          const isInternal = url.startsWith("/") || url.startsWith("#");
          return isInternal ? (
            <Link href={url} className="font-medium text-foreground underline underline-offset-4 decoration-muted-foreground/50 hover:decoration-foreground">
              {children}
            </Link>
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4 decoration-muted-foreground/50 hover:decoration-foreground">
              {children}
            </a>
          );
        },
        ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-1.5 text-muted-foreground marker:text-muted-foreground/60">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-1.5 text-muted-foreground marker:text-muted-foreground/60">{children}</ol>,
        li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-border pl-4 italic [&_p]:my-2">{children}</blockquote>
        ),
        hr: () => <hr className="my-8 border-border" />,
        code: ({ className, children }) => {
          const isBlock = /language-/.test(className ?? "") || String(children).includes("\n");
          return isBlock ? (
            <code className="block text-sm leading-6">{children}</code>
          ) : (
            <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.85em] text-foreground">{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4">{children}</pre>
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-2 text-muted-foreground">{children}</td>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="my-4 rounded-lg border border-border max-w-full" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
