import type { Config } from "tailwindcss";

/**
 * Atlantic.vc — Midnight observatory wireframe.
 * Existing token names (navy/signal/mist/fog/paper/mist-border/slate2/steel/carbon)
 * are REMAPPED to the Atlantic dark palette so every page picks up the new theme
 * without rewriting class names. Semantic mapping:
 *   paper       → #0d0d0f  (carbon — card surface)
 *   mist        → #000000  (void — page canvas)
 *   fog         → #2b2f33  (slate — soft fill / hover)
 *   mist-border → #d8eaff20 (ice-white hairline at ~12% — used as border)
 *   navy        → #d8eaff  (ice-white — primary text / headings)
 *   signal      → #1f58f2  (electric cobalt — accent)
 *   slate2      → #6c757f  (fog — secondary text)
 *   steel       → #41464c  (iron — tertiary / muted)
 *   carbon      → #d8eaff  (body text)
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Atlantic native tokens
        "ice-white": "#d8eaff",
        "void-black": "#000000",
        graphite: "#232529",
        slate: "#2b2f33",
        iron: "#41464c",
        "iron-edge": "#565657",
        "electric-cobalt": "#1f58f2",
        "signal-orange": "#ff4105",

        // === Remapped legacy tokens — Atlantic values ===
        navy: {
          DEFAULT: "#d8eaff", // ice-white as primary text
          dark: "#ffffff",
        },
        signal: {
          DEFAULT: "#1f58f2", // electric cobalt
          dark: "#1847c4",
          50: "#e8efff",
          100: "#cfd9ff",
          200: "#9fb4ff",
          300: "#6e8eff",
          400: "#3e69ff",
          500: "#1f58f2",
          600: "#1847c4",
          700: "#103596",
          800: "#0a2369",
          900: "#04123d",
        },
        slate2: "#6c757f", // fog — secondary body text
        carbon: "#d8eaff", // body text (was #0a0a0a) → ice-white on dark
        paper: "#0d0d0f", // carbon surface
        mist: "#000000", // void canvas
        fog: "#2b2f33", // slate — soft fill / hover
        "mist-border": "rgba(216, 234, 255, 0.14)", // ice-white hairline
        silver: "#232529",
        steel: "#41464c", // iron — muted

        // Atlantic accents — used only as borders/decoration, never fill
        magenta: "#ff4105", // remapped → signal-orange so old blobs match thermal palette
        ultraviolet: "#1f58f2",
        amber: "#ff4105",
        cyan: "#1f58f2",

        // legacy compat
        brand: {
          50: "#e8efff",
          100: "#cfd9ff",
          200: "#9fb4ff",
          300: "#6e8eff",
          400: "#3e69ff",
          500: "#1f58f2",
          DEFAULT: "#1f58f2",
          600: "#1847c4",
          700: "#103596",
          800: "#0a2369",
          900: "#04123d",
          dark: "#1847c4",
        },
        status: {
          online: "#1f58f2",
          offline: "#ff4105",
          warning: "#ff4105",
          late: "#ff4105",
        },
      },
      fontFamily: {
        // Monument substitute: Space Grotesk (geometric sans, single-weight feel)
        sans: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        display: [
          "Space Grotesk",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        // Mono micro-labels — scientific instrument tracking
        micro: ["10px", { lineHeight: "1", letterSpacing: "0.16em" }],
        caption: ["12px", { lineHeight: "1.5", letterSpacing: "0.06em" }],
        // Body
        "body-sm": ["14px", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        body: ["16px", { lineHeight: "1.5" }],
        "body-lg": ["18px", { lineHeight: "1.5" }],
        // Display scale — Monument philosophy: command by size, never bold
        subheading: ["20px", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "heading-sm": ["24px", { lineHeight: "1.24", letterSpacing: "-0.01em" }],
        heading: ["48px", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
        "heading-lg": ["64px", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
        display: ["96px", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        // Atlantic radii: 8 tags/buttons, 16 cards, 24 large
        cards: "16px",
        inputs: "8px",
        buttons: "8px",
        mockups: "24px",
        badges: "8px",
        pills: "40.798px",
      },
      boxShadow: {
        // No shadows in Atlantic — depth from stepped surfaces. Keep tokens as
        // no-ops for backwards-compat with components that still reference them.
        soft: "none",
        card: "none",
        elevated: "none",
        button: "none",
        glow: "0 0 0 1px rgba(31, 88, 242, 0.4)",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slide-down 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-right": "slide-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        float: "float 14s ease-in-out infinite",
        "float-delayed": "float 14s ease-in-out 5s infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "bar-grow": "bar-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "33%": { transform: "translate3d(40px,-30px,0)" },
          "66%": { transform: "translate3d(-30px,20px,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "bar-grow": { "0%": { height: "0%" } },
        twinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.9) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(15deg)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
