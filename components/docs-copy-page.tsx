"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useCallback, useState } from "react"

import {
  ChatGptIcon,
  ClaudeIcon,
  CursorIcon,
  GeminiIcon,
  GrokIcon,
  PerplexityIcon,
  SciraIcon,
  V0Icon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

// Ported from shadcn-labs/startercn's DocsCopyPage (MIT — see
// components/marketing-four/NOTICE.md): same split-button (Copy Page +
// chevron dropdown of "open in <AI tool>" links). Their "View as Markdown"
// menu item isn't ported — it links to a `.md`-suffixed route this project
// doesn't have. `trackEvent`/`@vercel/analytics` and `sound`/`sounds` props
// aren't ported either (no analytics, and this uses the shared, non-sound
// components/ui/* primitives, not marketing-four's local sound-aware ones).
// `markdown` is pre-fetched server-side by the page and passed in directly,
// rather than re-fetched client-side via a markdownUrl.
const getPromptUrl = (baseURL: string, absoluteUrl: string, param = "q") =>
  `${baseURL}?${param}=${encodeURIComponent(
    `I'm looking at this Reflow documentation: ${absoluteUrl}.
Help me understand how to use it. Be ready to explain concepts, give examples, or help debug based on it.
`
  )}`

const MENU_ITEMS: [string, (url: string) => React.ReactNode][] = [
  [
    "v0",
    (url) => (
      <a href={getPromptUrl("https://v0.dev", url)} rel="noopener noreferrer" target="_blank">
        <V0Icon />
        <span className="translate-x-[-2px]">Open in v0</span>
      </a>
    ),
  ],
  [
    "cursor",
    (url) => (
      <a href={getPromptUrl("https://cursor.com/link/prompt", url, "text")} rel="noopener noreferrer" target="_blank">
        <CursorIcon />
        Open in Cursor
      </a>
    ),
  ],
  [
    "chatgpt",
    (url) => (
      <a href={getPromptUrl("https://chatgpt.com", url)} rel="noopener noreferrer" target="_blank">
        <ChatGptIcon />
        Open in ChatGPT
      </a>
    ),
  ],
  [
    "claude",
    (url) => (
      <a href={getPromptUrl("https://claude.ai/new", url)} rel="noopener noreferrer" target="_blank">
        <ClaudeIcon />
        Open in Claude
      </a>
    ),
  ],
  [
    "perplexity",
    (url) => (
      <a href={getPromptUrl("https://perplexity.ai", url)} rel="noopener noreferrer" target="_blank">
        <PerplexityIcon />
        Open in Perplexity
      </a>
    ),
  ],
  [
    "gemini",
    (url) => (
      <a href={getPromptUrl("https://gemini.google.com/app", url)} rel="noopener noreferrer" target="_blank">
        <GeminiIcon />
        Open in Gemini
      </a>
    ),
  ],
  [
    "grok",
    (url) => (
      <a href={getPromptUrl("https://grok.com", url)} rel="noopener noreferrer" target="_blank">
        <GrokIcon />
        Open in Grok
      </a>
    ),
  ],
  [
    "scira",
    (url) => (
      <a className="m-0 p-0" href={getPromptUrl("https://scira.ai/", url)} rel="noopener noreferrer" target="_blank">
        <SciraIcon />
        Open in Scira AI
      </a>
    ),
  ],
]

export function DocsCopyPage({ markdown, url }: { markdown: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const { copyToClipboard } = useCopyToClipboard()

  const absoluteUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url

  const handleCopy = useCallback(async () => {
    const hasCopied = await copyToClipboard(markdown)
    if (hasCopied) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [copyToClipboard, markdown])

  const trigger = (
    <Button
      variant="secondary"
      size="sm"
      className="peer -ml-0.5 size-8 md:size-7 md:text-[0.8rem]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180 sm:rotate-0">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </Button>
  )

  return (
    <Popover>
      <div className="group/buttons relative flex rounded-lg bg-secondary focus-visible:data-[slot=button]:*:relative focus-visible:data-[slot=button]:*:z-10">
        <PopoverAnchor />
        <Button
          data-slot="button"
          variant="secondary"
          size="sm"
          className="md:h-7 md:text-[0.8rem]"
          onClick={handleCopy}
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy Page"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="hidden sm:flex">
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-lg shadow-none">
            {MENU_ITEMS.map(([key, render]) => (
              <DropdownMenuItem key={key} asChild>
                {render(absoluteUrl)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator
          orientation="vertical"
          className="absolute top-1 right-8 z-0 h-6! bg-foreground/5! peer-focus-visible:opacity-0 sm:right-7 sm:h-5!"
        />
        <PopoverTrigger asChild className="flex sm:hidden">
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-52 origin-center! rounded-lg bg-background/70 p-1 shadow-none backdrop-blur-xs dark:bg-background/60" align="start">
          {MENU_ITEMS.map(([key, render]) => (
            <Button
              variant="ghost"
              size="lg"
              asChild
              key={key}
              className="w-full justify-start text-base font-normal [svg]:*:text-muted-foreground"
            >
              {render(absoluteUrl)}
            </Button>
          ))}
        </PopoverContent>
      </div>
    </Popover>
  )
}
