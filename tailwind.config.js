/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      // Tailwind v4 computes spacing/size utilities dynamically (any
      // numeric value works via a CSS multiplier), so `size-4.5` "just
      // works" there. Tailwind v3 (this project) uses a fixed spacing
      // map with a gap between 4 and 5 -- `size-4.5` silently produced no
      // CSS at all here, so icons using it (copied verbatim from a v4
      // source) rendered unstyled at their raw SVG size instead of the
      // intended 1.125rem/18px.
      spacing: {
        "4.5": "1.125rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        surface: { DEFAULT: "hsl(var(--surface))", foreground: "hsl(var(--surface-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        iblaze: { red: "#E5403B" },
      },
      borderRadius: {
        lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-conic": "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
      },
      fontFamily: {
        heading: ["var(--font-aeonik)"],
        default: ["var(--font-inter)"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "image-glow": {
          "0%": { opacity: "0", "animation-timing-function": "cubic-bezier(.74, .25, .76, 1)" },
          "10%": { opacity: "0.5", "animation-timing-function": "cubic-bezier(.12, .01, .08, .99)" },
          "100%": { opacity: "0.7" },
        },
        "border-beam": { "100%": { "offset-distance": "100%" } },
        "flip": { to: { transform: "rotate(360deg)" } },
        "rotate": { to: { transform: "rotate(90deg)" } },
        "grid": {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "image-glow": "image-glow 4s ease-out 0.6s forwards",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "flip": "flip 6s infinite steps(2, end)",
        "rotate": "rotate 3s linear infinite both",
        "grid": "grid 15s linear infinite",
        "marquee": "marquee var(--duration) linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
