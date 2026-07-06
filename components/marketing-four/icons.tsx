import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn components/icons.tsx (MIT — see NOTICE.md).
// Only ThemeIcon is carried over; the rest of their icon set serves their
// registry/AI-tool pages, which we don't have.
export const ThemeIcon = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    className={cn("size-4", className)}
    {...props}
  >
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M12 3l0 18" />
    <path d="M12 9l4.65 -4.65" />
    <path d="M12 14.3l7.37 -7.37" />
    <path d="M12 19.6l8.85 -8.85" />
  </svg>
)
