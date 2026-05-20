import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#081122",
        navy: "#0f172a",
        slateblue: "#2563eb",
        tealglow: "#22c55e"
      },
      fontFamily: {
        sans: ["var(--font-outfit)"],
        mono: ["var(--font-space-mono)"]
      },
      animation: {
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        slideIn: "slideIn 0.45s ease-out",
        shimmer: "shimmer 1.8s linear infinite"
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.3)", opacity: ".65" }
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      }
    }
  },
  plugins: []
}

export default config
