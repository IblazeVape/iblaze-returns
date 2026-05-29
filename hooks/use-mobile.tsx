import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const widthMql  = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const orientMql = window.matchMedia("(orientation: landscape)")

    const update = () => {
      // In landscape, use the desktop icon-rail sidebar regardless of width
      setIsMobile(!orientMql.matches && window.innerWidth < MOBILE_BREAKPOINT)
    }

    widthMql.addEventListener("change", update)
    orientMql.addEventListener("change", update)
    update()

    return () => {
      widthMql.removeEventListener("change", update)
      orientMql.removeEventListener("change", update)
    }
  }, [])

  return !!isMobile
}
