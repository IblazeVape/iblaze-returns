import { toast as sonnerToast, type ExternalToast } from "sonner"

export type PortalToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

let position: PortalToastPosition = "top-right"

export function setPortalToastPosition(next: PortalToastPosition) {
  position = next
}

export function getPortalToastPosition(): PortalToastPosition {
  return position
}

function withPos(opts?: ExternalToast): ExternalToast {
  return { ...opts, position }
}

export const portalToast = {
  success: (message: string | import("react").ReactNode, opts?: ExternalToast) =>
    sonnerToast.success(message, withPos(opts)),
  error: (message: string | import("react").ReactNode, opts?: ExternalToast) =>
    sonnerToast.error(message, withPos(opts)),
  warning: (message: string | import("react").ReactNode, opts?: ExternalToast) =>
    sonnerToast.warning(message, withPos(opts)),
  message: (message: string | import("react").ReactNode, opts?: ExternalToast) =>
    sonnerToast(message, withPos(opts)),
}
