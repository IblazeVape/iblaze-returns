import { describe, it, expect } from "vitest";
import { getStatusIcon, STATUS_ICON_NAMES, STATUS_ICONS } from "@/lib/status-icons";

describe("getStatusIcon", () => {
  it("returns the matching icon for a known name", () => {
    expect(getStatusIcon("Truck")).toBe(STATUS_ICONS.Truck);
  });

  it("falls back to HelpCircle for an unknown name", () => {
    expect(getStatusIcon("NotARealIcon")).toBe(STATUS_ICONS.HelpCircle);
  });

  it("falls back to HelpCircle for an empty/undefined name", () => {
    expect(getStatusIcon(undefined)).toBe(STATUS_ICONS.HelpCircle);
    expect(getStatusIcon("")).toBe(STATUS_ICONS.HelpCircle);
  });

  it("lists names sorted alphabetically", () => {
    expect(STATUS_ICON_NAMES).toEqual([...STATUS_ICON_NAMES].sort());
  });
});
