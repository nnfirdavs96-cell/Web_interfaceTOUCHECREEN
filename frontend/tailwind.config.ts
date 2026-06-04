import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        status: {
          online: "#10b981",
          offline: "#ef4444",
          warning: "#f59e0b",
          late: "#f97316",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
