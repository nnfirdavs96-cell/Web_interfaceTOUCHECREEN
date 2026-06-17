import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // === Calendly-вдохновлённая палитра ===
        navy: {
          DEFAULT: "#0b3558", // Midnight Navy — заголовки, бренд-голос
          dark: "#072543",
        },
        signal: {
          DEFAULT: "#006bff", // Signal Blue — единственный функциональный акцент
          dark: "#0058d6",
          50: "#e6f0ff",
          100: "#cce0ff",
          200: "#99c2ff",
          300: "#66a3ff",
          400: "#3385ff",
          500: "#006bff",
          600: "#0058d6",
          700: "#0044a3",
          800: "#003070",
          900: "#001c40",
        },
        slate2: "#476788", // Slate Blue — secondary body text
        carbon: "#0a0a0a", // Primary body text
        paper: "#ffffff",
        mist: "#f8f9fb", // Canvas
        fog: "#e7edf6", // Soft fill
        "mist-border": "#d4e0ed", // Hairline borders
        silver: "#e6e6e6",
        steel: "#a6bbd1", // Muted placeholder
        info: "#004eba", // Info Blue
        // Декоративные (только для блобов, НЕ для UI)
        magenta: "#e55cff",
        ultraviolet: "#8247f5",
        amber: "#ffa600",
        cyan: "#0099ff",

        // === Совместимость со старым кодом ===
        brand: {
          50: "#e6f0ff",
          100: "#cce0ff",
          200: "#99c2ff",
          300: "#66a3ff",
          400: "#3385ff",
          500: "#006bff",
          DEFAULT: "#006bff",
          600: "#0058d6",
          700: "#0044a3",
          800: "#003070",
          900: "#001c40",
          dark: "#0058d6",
        },
        status: {
          online: "#10b981",
          offline: "#ef4444",
          warning: "#f59e0b",
          late: "#f97316",
        },
      },
      fontFamily: {
        sans: [
          "Manrope",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        micro: ["12px", { lineHeight: "1.5" }],
        caption: ["14px", { lineHeight: "1.5" }],
        "body-sm": ["16px", { lineHeight: "1.6" }],
        body: ["18px", { lineHeight: "1.64" }],
        "body-lg": ["20px", { lineHeight: "1.6" }],
        subheading: ["24px", { lineHeight: "1.4" }],
        "heading-sm": ["28px", { lineHeight: "1.4" }],
        heading: ["38px", { lineHeight: "1.21" }],
        "heading-lg": ["50px", { lineHeight: "1.2" }],
        display: ["68px", { lineHeight: "1.1" }],
      },
      borderRadius: {
        cards: "8px",
        inputs: "4px",
        buttons: "4px",
        mockups: "16px",
        badges: "50px",
      },
      boxShadow: {
        // Все тени голубоватые (rgba(71,103,136,...)) — фирменная подпись
        soft:
          "rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, " +
          "rgba(71, 103, 136, 0.03) 0px 4px 10px 0px, " +
          "rgba(71, 103, 136, 0.05) 0px 10px 20px 0px",
        card:
          "rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, " +
          "rgba(71, 103, 136, 0.03) 0px 4px 10px 0px, " +
          "rgba(71, 103, 136, 0.05) 0px 10px 20px 0px",
        elevated:
          "rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, " +
          "rgba(71, 103, 136, 0.03) 0px 8px 15px 0px, " +
          "rgba(71, 103, 136, 0.08) 0px 30px 50px 0px",
        button:
          "rgba(71, 103, 136, 0.04) 0px 4px 5px 0px, " +
          "rgba(71, 103, 136, 0.03) 0px 8px 15px 0px, " +
          "rgba(71, 103, 136, 0.06) 0px 15px 30px 0px",
        glow: "0 0 0 4px rgba(0, 107, 255, 0.15)",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slide-down 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-right": "slide-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        float: "float 8s ease-in-out infinite",
        "float-delayed": "float 8s ease-in-out 3s infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-soft": "pulse-soft 2.5s ease-in-out infinite",
        "bar-grow": "bar-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
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
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "33%": { transform: "translateY(-30px) translateX(15px)" },
          "66%": { transform: "translateY(15px) translateX(-20px)" },
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
      },
    },
  },
  plugins: [],
} satisfies Config;
