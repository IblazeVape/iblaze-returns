"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Interactive hero backdrop: a grid of bordered cells that briefly illuminate
// when the pointer passes over them, fading back out via CSS transition.
// Masked radially so it concentrates at the top of the hero.
const CELL = 56
const ROWS = 8

export function HoverGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(27)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setCols(Math.ceil(el.offsetWidth / CELL) + 1)
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const light = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const cell = e.target as HTMLElement
    if (!cell.dataset.cell) return
    cell.style.backgroundColor = "hsl(var(--foreground) / 0.08)"
    cell.style.borderColor = "hsl(var(--foreground) / 0.16)"
    window.setTimeout(() => {
      cell.style.backgroundColor = "transparent"
      cell.style.borderColor = "hsl(var(--border) / 0.6)"
    }, 400)
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden
      onPointerOver={light}
      className="absolute inset-x-0 top-0 z-0 overflow-hidden mask-[radial-gradient(ellipse_75%_90%_at_50%_0%,#000_55%,transparent_100%)]"
      style={{ height: ROWS * CELL }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        }}
      >
        {Array.from({ length: cols * ROWS }, (_, i) => (
          <div
            key={i}
            data-cell
            className="border-[0.5px] transition-all duration-500"
            style={{ borderColor: "hsl(var(--border) / 0.6)" }}
          />
        ))}
      </div>
    </div>
  )
}
