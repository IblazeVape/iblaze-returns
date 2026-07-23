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
import type { SidebarLinkInput, SidebarSubLinkInput } from "@/lib/branding-validation"

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
  disabled?: boolean
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

const selectStyle: CSSProperties = {
  ...inputStyle,
  paddingRight: 28,
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

function GripButton({ label, attributes, listeners }: {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: any
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={label}
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
  )
}

function SortableSubLinkRow({
  id,
  parentIndex,
  childIndex,
  child,
  onUpdate,
  onRemove,
}: {
  id: string
  parentIndex: number
  childIndex: number
  child: SidebarSubLinkInput
  onUpdate: (parentIndex: number, childIndex: number, patch: Partial<SidebarSubLinkInput>) => void
  onRemove: (parentIndex: number, childIndex: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
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
      <td style={{ padding: "6px 4px 6px 8px", verticalAlign: "middle", width: 36 }}>
        <GripButton
          label={`Drag to reorder sub-link ${childIndex + 1}`}
          attributes={attributes}
          listeners={listeners}
        />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
        <input
          aria-label={`Link ${parentIndex + 1} sub-link ${childIndex + 1} label`}
          value={child.label}
          placeholder="FAQ"
          onChange={(e) => onUpdate(parentIndex, childIndex, { label: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
        <input
          aria-label={`Link ${parentIndex + 1} sub-link ${childIndex + 1} URL`}
          value={child.url}
          placeholder="https://…"
          onChange={(e) => onUpdate(parentIndex, childIndex, { url: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: "6px 8px", verticalAlign: "middle", whiteSpace: "nowrap", width: 88 }}>
        <s-button
          variant="tertiary"
          tone="critical"
          onClick={() => onRemove(parentIndex, childIndex)}
          accessibilityLabel={`Remove sub-link ${childIndex + 1}`}
        >
          Remove
        </s-button>
      </td>
    </tr>
  )
}

function SortableLinkBlock({
  id,
  index,
  link,
  subIds,
  iconNames,
  dragEnabled,
  onUpdate,
  onRemove,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
  onReorderSub,
}: {
  id: string
  index: number
  link: SidebarLinkInput
  subIds: string[]
  iconNames: string[]
  dragEnabled: boolean
  onUpdate: (index: number, patch: Partial<SidebarLinkInput>) => void
  onRemove: (index: number) => void
  onAddSub: (parentIndex: number) => void
  onUpdateSub: (parentIndex: number, childIndex: number, patch: Partial<SidebarSubLinkInput>) => void
  onRemoveSub: (parentIndex: number, childIndex: number) => void
  onReorderSub: (parentIndex: number, fromIndex: number, toIndex: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !dragEnabled,
  })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "var(--p-color-bg-surface-selected, #f1f1f1)" : undefined,
    opacity: isDragging ? 0.92 : 1,
    position: "relative",
    zIndex: isDragging ? 2 : undefined,
  }

  const children = link.children ?? []

  function handleSubDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = subIds.indexOf(String(active.id))
    const to = subIds.indexOf(String(over.id))
    if (from < 0 || to < 0 || from === to) return
    onReorderSub(index, from, to)
  }

  return (
    <tbody ref={setNodeRef} style={style}>
      <tr style={{ borderTop: rowBorder }}>
        <td style={{ padding: "8px 4px 8px 8px", verticalAlign: "middle", width: 36 }}>
          {dragEnabled ? (
            <GripButton
              label={`Drag to reorder link ${index + 1}`}
              attributes={attributes}
              listeners={listeners}
            />
          ) : (
            <span style={{ display: "inline-block", width: 28 }} />
          )}
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top", width: "22%" }}>
          <input
            aria-label={`Link ${index + 1} label`}
            value={link.label}
            placeholder="FAQ"
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
          <input
            aria-label={`Link ${index + 1} URL`}
            value={link.url}
            placeholder="https://your-store.com/pages/faq"
            onChange={(e) => onUpdate(index, { url: e.target.value })}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top", width: "18%" }}>
          <select
            aria-label={`Link ${index + 1} icon`}
            value={link.icon ?? ""}
            onChange={(e) => onUpdate(index, { icon: e.target.value || undefined })}
            style={selectStyle}
          >
            <option value="">No icon</option>
            {iconNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "middle", whiteSpace: "nowrap", width: 88 }}>
          <s-button
            variant="tertiary"
            tone="critical"
            onClick={() => onRemove(index)}
            accessibilityLabel={`Remove link ${index + 1}`}
          >
            Remove
          </s-button>
        </td>
      </tr>
      <tr>
        <td colSpan={5} style={{ padding: "0 12px 12px 44px", borderTop: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {children.length > 0 && (
              <div style={{ overflowX: "auto", border: "1px solid var(--p-color-border, #e3e3e3)", borderRadius: 8 }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubDragEnd}>
                  <SortableContext items={subIds} strategy={verticalListSortingStrategy}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <thead>
                        <tr style={{ background: "var(--p-color-bg-surface-secondary, #f7f7f7)", textAlign: "left" }}>
                          <th style={{ padding: "8px", fontSize: 11, fontWeight: 650, width: 36 }} aria-label="Reorder" />
                          <th style={{ padding: "8px", fontSize: 11, fontWeight: 650, width: "30%" }}>Sub-link label</th>
                          <th style={{ padding: "8px", fontSize: 11, fontWeight: 650 }}>Sub-link URL</th>
                          <th style={{ padding: "8px", fontSize: 11, fontWeight: 650, width: 88 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {children.map((child, ci) => (
                          <SortableSubLinkRow
                            key={subIds[ci]}
                            id={subIds[ci]}
                            parentIndex={index}
                            childIndex={ci}
                            child={child}
                            onUpdate={onUpdateSub}
                            onRemove={onRemoveSub}
                          />
                        ))}
                      </tbody>
                    </table>
                  </SortableContext>
                </DndContext>
              </div>
            )}
            <div>
              <s-button variant="tertiary" onClick={() => onAddSub(index)}>
                Add sub-link
              </s-button>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  )
}

export function SidebarLinksTable({
  links,
  linkIds,
  subLinkIds,
  filter,
  onFilterChange,
  iconNames,
  onUpdate,
  onAdd,
  onRemove,
  onReorder,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
  onReorderSub,
  error,
}: {
  links: SidebarLinkInput[]
  linkIds: string[]
  subLinkIds: string[][]
  filter: string
  onFilterChange: (value: string) => void
  iconNames: string[]
  onUpdate: (index: number, patch: Partial<SidebarLinkInput>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onAddSub: (parentIndex: number) => void
  onUpdateSub: (parentIndex: number, childIndex: number, patch: Partial<SidebarSubLinkInput>) => void
  onRemoveSub: (parentIndex: number, childIndex: number) => void
  onReorderSub: (parentIndex: number, fromIndex: number, toIndex: number) => void
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
    return links
      .map((link, index) => ({ link, index, id: linkIds[index], subIds: subLinkIds[index] ?? [] }))
      .filter(({ link }) => {
        if (!q) return true
        const inParent =
          (link.label || "").toLowerCase().includes(q) ||
          (link.url || "").toLowerCase().includes(q)
        const inChild = (link.children ?? []).some(
          (c) =>
            (c.label || "").toLowerCase().includes(q) ||
            (c.url || "").toLowerCase().includes(q)
        )
        return inParent || inChild
      })
  }, [links, linkIds, subLinkIds, filter])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = linkIds.indexOf(String(active.id))
    const to = linkIds.indexOf(String(over.id))
    if (from < 0 || to < 0 || from === to) return
    onReorder(from, to)
  }

  const tableHead = (
    <thead>
      <tr style={{ background: "var(--p-color-bg-surface-secondary, #f7f7f7)", textAlign: "left" }}>
        <th style={{ padding: "10px 8px", fontSize: 12, fontWeight: 650, width: 36 }} aria-label="Reorder" />
        <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "22%" }}>Label</th>
        <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650 }}>URL</th>
        <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "18%" }}>Icon</th>
        <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: 88 }} />
      </tr>
    </thead>
  )

  const bodies = visible.map(({ link, index, id, subIds }) => (
    <SortableLinkBlock
      key={id}
      id={id}
      index={index}
      link={link}
      subIds={subIds}
      iconNames={iconNames}
      dragEnabled={dragEnabled}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onAddSub={onAddSub}
      onUpdateSub={onUpdateSub}
      onRemoveSub={onRemoveSub}
      onReorderSub={onReorderSub}
    />
  ))

  const table = (
    <div style={{ overflowX: "auto", border: "1px solid var(--p-color-border, #e3e3e3)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        {tableHead}
        {bodies}
      </table>
    </div>
  )

  return (
    <s-stack direction="block" gap="base">
      <s-paragraph tone="subdued">
        Extra links in the customer portal sidebar (alongside Home and Orders). Open in a new tab.
        Drag the handle to reorder. Each link can have optional sub-links.
        {links.length > 4 ? " Filter when the list gets long." : ""}
      </s-paragraph>
      {links.length > 4 ? (
        <s-text-field
          label="Filter links"
          value={filter}
          placeholder="Search by label or URL…"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value)}
        ></s-text-field>
      ) : null}
      {filterActive ? (
        <s-paragraph tone="subdued">Clear the filter to drag top-level links into a new order.</s-paragraph>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={linkIds} strategy={verticalListSortingStrategy} disabled={!dragEnabled}>
          {table}
        </SortableContext>
      </DndContext>

      {filterActive && visible.length === 0 ? (
        <s-paragraph tone="subdued">No links match that filter.</s-paragraph>
      ) : null}
      <s-button onClick={onAdd}>Add link</s-button>
      {error ? <s-paragraph tone="critical">{error}</s-paragraph> : null}
    </s-stack>
  )
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  return arrayMove(list, fromIndex, toIndex)
}

export function newSidebarLinkRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
