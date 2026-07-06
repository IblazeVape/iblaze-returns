import Link from "next/link"

// Structural pattern adapted from shadcn-labs/startercn's SiteFooter (MIT) —
// same centered single-row footer layout. Content is entirely our own: their
// version credits their own author and links to their own GitHub repo, which
// doesn't apply to Reflow.
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-center px-4 sm:px-6">
        <p className="w-full px-1 text-center text-xs leading-loose text-muted-foreground sm:text-sm">
          &copy;{new Date().getFullYear()} Reflow. Built for Shopify merchants.{" "}
          <Link href="/docs" className="font-medium underline underline-offset-4">
            Read the docs
          </Link>
          .
        </p>
      </div>
    </footer>
  )
}
