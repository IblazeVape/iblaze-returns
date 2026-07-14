import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Renders merchant-authored policy/note text (returns policy body, sidebar
 * note) as Markdown — bold, headings, bullet lists, links, horizontal rules.
 * Manually styled per-element instead of a `prose` typography plugin, to
 * match this app's existing hand-styled Tailwind conventions. */
export function PolicyMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-sm font-semibold mt-3 first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-semibold mt-3 first:mt-0">{children}</h3>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="text-sm mt-2 first:mt-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 text-sm mt-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 text-sm mt-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          hr: () => <hr className="my-3 border-border" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
