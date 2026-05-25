"use client"

import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchProps {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
}

export default function Search({ value, onChange, placeholder = "Search orders..." }: SearchProps) {
  return (
    <div className="relative max-w-sm flex-1">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-9 w-full pl-10 pr-4 text-sm bg-muted border-0"
        placeholder={placeholder}
        type="search"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}
