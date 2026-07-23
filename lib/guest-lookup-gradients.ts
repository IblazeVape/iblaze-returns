/**
 * Preset two-stop gradients for the guest lookup split side panel.
 * Selecting a preset writes into guestLookupGradientFrom / guestLookupGradientTo.
 */
export type GuestLookupGradientPreset = {
  id: string;
  label: string;
  from: string;
  to: string;
};

export const GUEST_LOOKUP_GRADIENT_PRESETS: GuestLookupGradientPreset[] = [
  { id: "slate", label: "Slate", from: "#0f172a", to: "#334155" },
  { id: "ink", label: "Ink", from: "#09090b", to: "#3f3f46" },
  { id: "charcoal", label: "Charcoal", from: "#1c1917", to: "#57534e" },
  { id: "midnight", label: "Midnight", from: "#020617", to: "#1e3a8a" },
  { id: "ocean", label: "Ocean", from: "#0c4a6e", to: "#06b6d4" },
  { id: "teal", label: "Teal", from: "#134e4a", to: "#2dd4bf" },
  { id: "forest", label: "Forest", from: "#14532d", to: "#4ade80" },
  { id: "moss", label: "Moss", from: "#365314", to: "#a3e635" },
  { id: "ember", label: "Ember", from: "#7c2d12", to: "#fb923c" },
  { id: "sunset", label: "Sunset", from: "#9a3412", to: "#fbbf24" },
  { id: "rose", label: "Rose", from: "#881337", to: "#fb7185" },
  { id: "berry", label: "Berry", from: "#4c0519", to: "#e11d48" },
  { id: "violet", label: "Violet", from: "#4c1d95", to: "#a78bfa" },
  { id: "grape", label: "Grape", from: "#3b0764", to: "#d946ef" },
  { id: "indigo", label: "Indigo", from: "#312e81", to: "#818cf8" },
  { id: "sky", label: "Sky", from: "#0e7490", to: "#7dd3fc" },
  { id: "ice", label: "Ice", from: "#164e63", to: "#e0f2fe" },
  { id: "sand", label: "Sand", from: "#78350f", to: "#fde68a" },
  { id: "copper", label: "Copper", from: "#7c2d12", to: "#fdba74" },
  { id: "wine", label: "Wine", from: "#450a0a", to: "#f87171" },
  { id: "plum", label: "Plum", from: "#500724", to: "#f0abfc" },
  { id: "navy", label: "Navy", from: "#172554", to: "#60a5fa" },
  { id: "steel", label: "Steel", from: "#1e293b", to: "#94a3b8" },
  { id: "smoke", label: "Smoke", from: "#18181b", to: "#a1a1aa" },
  { id: "mint", label: "Mint", from: "#064e3b", to: "#6ee7b7" },
  { id: "lime", label: "Lime", from: "#3f6212", to: "#bef264" },
  { id: "gold", label: "Gold", from: "#713f12", to: "#facc15" },
  { id: "crimson", label: "Crimson", from: "#7f1d1d", to: "#f43f5e" },
  { id: "aurora", label: "Aurora", from: "#1e1b4b", to: "#22d3ee" },
  { id: "dusk", label: "Dusk", from: "#1e1b4b", to: "#f472b6" },
];

export function matchGuestLookupGradientPreset(
  from: string,
  to: string,
): GuestLookupGradientPreset | undefined {
  const a = from.toLowerCase();
  const b = to.toLowerCase();
  return GUEST_LOOKUP_GRADIENT_PRESETS.find(
    (p) => p.from.toLowerCase() === a && p.to.toLowerCase() === b,
  );
}
