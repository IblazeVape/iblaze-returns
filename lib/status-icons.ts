// lib/status-icons.ts
import {
  Eye, RotateCcw, CheckCircle2, XCircle, CircleX, BadgeCheck, Truck, Package,
  Lock, Clock, HelpCircle, AlertCircle, Ban, PackageX, PackageCheck, Timer,
  MapPin, ThumbsDown, RefreshCw, CircleAlert, type LucideIcon,
} from "lucide-react";

/** A curated set of Lucide icons for the ineligible-status icon picker (see
 * Settings > Returns > Statuses) — same tree-shaking rationale as
 * lib/sidebar-icons.ts: this renders in the customer-facing portal, not just
 * admin Settings, so importing the full ~1500-icon library isn't worth it. */
export const STATUS_ICONS: Record<string, LucideIcon> = {
  Eye, RotateCcw, CheckCircle2, XCircle, CircleX, BadgeCheck, Truck, Package,
  Lock, Clock, HelpCircle, AlertCircle, Ban, PackageX, PackageCheck, Timer,
  MapPin, ThumbsDown, RefreshCw, CircleAlert,
};

export const STATUS_ICON_NAMES = Object.keys(STATUS_ICONS).sort();

export function getStatusIcon(name: string | undefined): LucideIcon {
  return (name && STATUS_ICONS[name]) || HelpCircle;
}
