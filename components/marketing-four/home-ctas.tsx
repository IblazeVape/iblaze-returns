"use client"

import Link from "next/link"
import { useCallback, useRef } from "react"

import { ArrowRightIcon } from "@/components/animated-icons/arrow-right"
import type { ArrowRightIconHandle } from "@/components/animated-icons/arrow-right"
import { ComponentIcon } from "@/components/animated-icons/component"
import type { ComponentIconHandle } from "@/components/animated-icons/component"
import { Button } from "@/components/marketing-four/ui/button"
import { cn } from "@/lib/utils"

// Ported from shadcn-labs/startercn's HomeCtas (MIT — see NOTICE.md): same
// two-button treatment (hover-triggered animated icon on each), adapted to
// Reflow's own routes and labels ("Try the demo" -> /demo, "Read the docs"
// -> /docs) instead of their Get Started/Browse Components routes.
const TryDemoButton = () => {
  const arrowRightRef = useRef<ArrowRightIconHandle>(null)

  const handleMouseEnter = useCallback(() => {
    arrowRightRef.current?.startAnimation()
  }, [])

  const handleMouseLeave = useCallback(() => {
    arrowRightRef.current?.stopAnimation()
  }, [])

  return (
    <Button
      asChild
      sound="click"
      className="px-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href="/demo">
        Try the demo
        <ArrowRightIcon className="hidden sm:inline" ref={arrowRightRef} />
      </Link>
    </Button>
  )
}

const ReadDocsButton = () => {
  const componentIconRef = useRef<ComponentIconHandle>(null)

  const handleMouseEnter = useCallback(() => {
    componentIconRef.current?.startAnimation()
  }, [])

  const handleMouseLeave = useCallback(() => {
    componentIconRef.current?.stopAnimation()
  }, [])

  return (
    <Button
      asChild
      variant="outline"
      sound="click"
      className="px-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href="/docs">
        <ComponentIcon className="hidden sm:inline" ref={componentIconRef} size={22} />
        Read the docs
      </Link>
    </Button>
  )
}

export const HomeCtas = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
    <TryDemoButton />
    <ReadDocsButton />
  </div>
)
