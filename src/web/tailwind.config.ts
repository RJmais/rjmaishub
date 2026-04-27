import type { Config } from "tailwindcss";

/**
 * Tailwind config para o RJ+ Hub.
 * Paleta oficial em BRAND.md (não alterar sem aprovação).
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
      },
    },
    extend: {
      colors: {
        rj: {
          green: {
            DEFAULT: "#3D4B2E",
            primary: "#3D4B2E",
            dark: "#2A3820",
            soft: "#5a6a47",
          },
          beige: {
            bg: "#EEE8DC",
            accent: "#CDB98B",
            cream: "#F8F4EC",
          },
          gold: {
            DEFAULT: "#B8923E",
            soft: "#D4AD5A",
            deep: "#A17E30",
          },
          black: "#1D1D1D",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ['"Fahwang"', '"Trajan Pro"', "Georgia", "serif"],
        body: ['"Verdana"', '"Geneva"', "Tahoma", "sans-serif"],
      },
      fontSize: {
        hero: ["3rem", { lineHeight: "1.1" }],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        pill: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(29,29,29,0.06)",
        md: "0 4px 12px rgba(29,29,29,0.08)",
        lg: "0 12px 40px rgba(29,29,29,0.16)",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
} satisfies Config;
