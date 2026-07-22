"use client"

import type { CSSProperties } from "react"
import type {
  ReturnLifecycleMessagesInput,
  ReturnLifecycleStatusInput,
  ReturnLifecycleStyleInput,
} from "@/lib/branding-validation"
import { STATUS_ICON_NAMES } from "@/lib/status-icons"

export const RETURN_STATUS_ROWS: { key: ReturnLifecycleStatusInput; name: string }[] = [
  { key: "notReturnable", name: "Not returnable" },
  { key: "returnRequested", name: "Return requested" },
  { key: "returnInProgress", name: "Return in progress" },
  { key: "returnDeclined", name: "Return declined" },
  { key: "returnCanceled", name: "Return canceled" },
  { key: "returnCompleted", name: "Return completed" },
]

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
  appearance: "auto" as const,
}

const rowBorder = "1px solid var(--p-color-border, #e3e3e3)"

const SENTENCE_KEYS: Partial<Record<ReturnLifecycleStatusInput, keyof ReturnLifecycleMessagesInput>> = {
  returnRequested: "returnRequested",
  returnInProgress: "returnInProgress",
  returnCanceled: "returnCanceled",
  returnCompleted: "returnCompleted",
}

function StatusRow({
  statusKey,
  name,
  style,
  messages,
  onStyleChange,
  onMessageChange,
}: {
  statusKey: ReturnLifecycleStatusInput
  name: string
  style: ReturnLifecycleStyleInput
  messages: ReturnLifecycleMessagesInput
  onStyleChange: <K extends keyof ReturnLifecycleStyleInput>(field: K, value: ReturnLifecycleStyleInput[K]) => void
  onMessageChange: (key: keyof ReturnLifecycleMessagesInput, value: string) => void
}) {
  const sentenceKey = SENTENCE_KEYS[statusKey]

  return (
    <>
      <tr style={{ borderTop: rowBorder }}>
        <td style={{ padding: "10px 12px", verticalAlign: "middle", width: "18%" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top", width: "18%" }}>
          <input
            aria-label={`${name} badge label`}
            value={style.label}
            placeholder="Badge label"
            onChange={(e) => onStyleChange("label", e.target.value)}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top" }}>
          <input
            aria-label={`${name} mobile heading`}
            value={style.heading}
            placeholder="Mobile heading"
            onChange={(e) => onStyleChange("heading", e.target.value)}
            style={inputStyle}
          />
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top", width: "16%" }}>
          <select
            aria-label={`${name} icon`}
            value={style.icon}
            onChange={(e) => onStyleChange("icon", e.target.value)}
            style={selectStyle}
          >
            {STATUS_ICON_NAMES.map((iconName) => (
              <option key={iconName} value={iconName}>{iconName}</option>
            ))}
          </select>
        </td>
        <td style={{ padding: "8px 12px", verticalAlign: "top", width: "14%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                flexShrink: 0,
                border: "1px solid rgba(0,0,0,0.12)",
                background: style.color?.trim() || "transparent",
              }}
            />
            <input
              aria-label={`${name} colour`}
              value={style.color}
              placeholder="#4F46E5"
              onChange={(e) => onStyleChange("color", e.target.value)}
              style={inputStyle}
            />
          </div>
        </td>
      </tr>
      <tr>
        <td colSpan={5} style={{ padding: "0 12px 12px 12px", borderTop: "none" }}>
          {sentenceKey ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 550, color: "var(--p-color-text-secondary, #616161)" }}>
                Sentence customers see
              </span>
              <textarea
                aria-label={`${name} sentence`}
                value={messages[sentenceKey]}
                rows={2}
                placeholder="Customer-facing sentence"
                onChange={(e) => onMessageChange(sentenceKey, e.target.value)}
                style={{ ...inputStyle, resize: "vertical", minHeight: 56 }}
              />
            </div>
          ) : statusKey === "returnDeclined" ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--p-color-text-secondary, #616161)" }}>
              Shows the actual decline reason from Shopify — not a fixed sentence, so there’s nothing to edit here.
            </p>
          ) : statusKey === "notReturnable" ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--p-color-text-secondary, #616161)" }}>
              Covers several reasons (not shipped, final sale, outside window, etc.) — edit those sentences under Not returnable.
            </p>
          ) : null}
        </td>
      </tr>
    </>
  )
}

export function ReturnStatusTable({
  styles,
  messages,
  onStyleChange,
  onMessageChange,
  stylesError,
  messagesError,
}: {
  styles: Record<ReturnLifecycleStatusInput, ReturnLifecycleStyleInput>
  messages: ReturnLifecycleMessagesInput
  onStyleChange: <K extends keyof ReturnLifecycleStyleInput>(
    statusKey: ReturnLifecycleStatusInput,
    field: K,
    value: ReturnLifecycleStyleInput[K],
  ) => void
  onMessageChange: (key: keyof ReturnLifecycleMessagesInput, value: string) => void
  stylesError?: string
  messagesError?: string
}) {
  return (
    <s-stack direction="block" gap="base">
      <s-paragraph color="subdued">
        {RETURN_STATUS_ROWS.length} fixed return stages — edit how each looks and what customers read.
      </s-paragraph>
      <div style={{ overflowX: "auto", border: "1px solid var(--p-color-border, #e3e3e3)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "var(--p-color-bg-surface-secondary, #f7f7f7)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "18%" }}>Stage</th>
              <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "18%" }}>Badge label</th>
              <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650 }}>Mobile heading</th>
              <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "16%" }}>Icon</th>
              <th style={{ padding: "10px 12px", fontSize: 12, fontWeight: 650, width: "14%" }}>Colour</th>
            </tr>
          </thead>
          <tbody>
            {RETURN_STATUS_ROWS.map(({ key, name }) => (
              <StatusRow
                key={key}
                statusKey={key}
                name={name}
                style={styles[key]}
                messages={messages}
                onStyleChange={(field, value) => onStyleChange(key, field, value)}
                onMessageChange={onMessageChange}
              />
            ))}
          </tbody>
        </table>
      </div>
      {stylesError ? <s-paragraph tone="critical">{stylesError}</s-paragraph> : null}
      {messagesError ? <s-paragraph tone="critical">{messagesError}</s-paragraph> : null}
    </s-stack>
  )
}
