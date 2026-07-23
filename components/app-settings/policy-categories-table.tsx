"use client"

import { useMemo, type CSSProperties, type ReactNode } from "react"
import {
  DndContext as DndContextPrimitive,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext as SortableContextPrimitive,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { PolicyCategoryInput } from "@/lib/branding-validation"

// React 19 + @dnd-kit JSX typing mismatch — cast keeps runtime behaviour.
const DndContext = DndContextPrimitive as unknown as (props: {
  sensors?: ReturnType<typeof useSensors>
  collisionDetection?: typeof closestCenter
  onDragEnd?: (event: DragEndEvent) => void
  children?: ReactNode
}) => ReactNode

const SortableContext = SortableContextPrimitive as unknown as (props: {
  items: string[]
  strategy?: typeof verticalListSortingStrategy
  children?: ReactNode
}) => ReactNode

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid var(--p-color-border, #c9cccf)",
  borderRadius: 8,
  fontSize: 13,
  background: "var(--p-color-bg-surface, #fff)",
}

const rowBorder = "1px solid var(--p-color-border, #e3e3e3)"

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="5" cy="3.5" r="1.25" />
      <circle cx="11" cy="3.5" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12.5" r="1.25" />
      <circle cx="11" cy="12.5" r="1.25" />
    </svg>
  )
}

function SortableCategoryRow({
  id,
  index,
  cat,
  dragEnabled,
  onUpdate,
  onRemove,
}: {
  id: string
  index: number
  cat: PolicyCategoryInput
  dragEnabled: boolean
  onUpdate: (index: number, patch: Partial<PolicyCategoryInput>) => void
  onRemove: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !dragEnabled,
  })

  const style: CSSProperties = {
    borderTop: rowBorder,
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "var(--p-color-bg-surface-selected, #f1f1f1)" : undefined,
    opacity: isDragging ? 0.92 : 1,
    position: "relative",
    zIndex: isDragging ? 2 : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ padding: "8px 4px 8px 8px", verticalAlign: "middle", width: 36 }}>
        {dragEnabled ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder category ${index + 1}`}
            title="Drag to reorder"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              border: "none",
              borderRadius: 6,
              background: "transparent",
              color: "var(--p-color-text-secondary, #616161)",
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <GripIcon />
          </button>
        ) : (
          <span style={{ display: "inline-block", width: 28 }} />
        )}
      </td>
      <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
        <input
          aria-label={`Category ${index + 1} title`}
          value={cat.title}
          placeholder="e.g. Vape Kits"
          onChange={(e) => onUpdate(index, { title: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
        <input
          aria-label={`Category ${index + 1} description`}
          value={cat.desc}
          placeholder="Short policy for this category"
          onChange={(e) => onUpdate(index, { desc: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: "8px 12px", verticalAlign: "middle", whiteSpace: "nowrap", width: 88 }}>
        <s-button
          variant="tertiary"
          tone="critical"
          onClick={() => onRemove(index)}
          accessibilityLabel={`Remove category ${index + 1}`}
        >
          Remove
        </s-button>
      </td>
    </tr>
  )
}

export function PolicyCategoriesTable({
  categories,
  categoryIds,
  filter,
  onFilterChange,
  onUpdate,
  onAdd,
  onRemove,
  onReorder,
  error,
}: {
  categories: PolicyCategoryInput[]
  categoryIds: string[]
  filter: string
  onFilterChange: (value: string) => void
  onUpdate: (index: number, patch: Partial<PolicyCategoryInput>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  error?: string
}) {
  const filterActive = filter.trim().length > 0
  const dragEnabled = !filterActive

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return categories
      .map((cat, index) => ({ cat, index, id: categoryIds[index] }))
      .filter(({ cat }) => {
        if (!q) return true
        return (
          (cat.title || "").toLowerCase().includes(q) ||
          (cat.desc || "").toLowerCase().includes(q)
        )
      })
  }, [categories, categoryIds, filter])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = categoryIds.indexOf(String(active.id))
    const to = categoryIds.indexOf(String(over.id))
    if (from < 0 || to < 0 || from === to) return
    onReorder(from, to)
  }

  const table = (
    <div style={{ overflowX: "auto", border: "1px solid var(--p-color-border, #e3e3e3)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "var(--p-color-bg-surface-secondary, #f7f7f7)", textAlign: "left" }}>
            <th style={{ padding: "10px 8px", fontSize: 12, fontWeight: 650, width: 36 }} aria-label="Reorder" />
            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "28%" }}>Title</th>
            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650 }}>Description</th>
            <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: 88 }} />
          </tr>
        </thead>
        <tbody>
          {visible.map(({ cat, index, id }) => (
            <SortableCategoryRow
              key={id}
              id={id}
              index={index}
              cat={cat}
              dragEnabled={dragEnabled}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <s-stack direction="block" gap="base">
      <s-paragraph color="subdued">
        {categories.length} categor{categories.length === 1 ? "y" : "ies"} — drag the handle to reorder.
        {categories.length > 4 ? " Filter when the list gets long." : ""}
      </s-paragraph>
      {categories.length > 4 ? (
        <s-text-field
          label="Filter categories"
          value={filter}
          placeholder="Search by title…"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value)}
        ></s-text-field>
      ) : null}
      {filterActive ? (
        <s-paragraph tone="subdued">Clear the filter to drag rows into a new order.</s-paragraph>
      ) : null}

      {dragEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {table}
          </SortableContext>
        </DndContext>
      ) : (
        table
      )}

      {filterActive && visible.length === 0 ? (
        <s-paragraph tone="subdued">No categories match that filter.</s-paragraph>
      ) : null}
      <s-button onClick={onAdd}>Add category</s-button>
      {error ? <s-paragraph tone="critical">{error}</s-paragraph> : null}
    </s-stack>
  )
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  return arrayMove(list, fromIndex, toIndex)
}

export function newCategoryRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
