import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          50: "#f6f8fb",
          100: "#eef1f6",
          200: "#dde3ee",
          300: "#c3cfe0",
          400: "#9fb1cb",
          500: "#7c93b4",
          600: "#5d7293"
        },
        graphite: {
          900: "#101522",
          800: "#161d2e",
          700: "#1d2639",
          600: "#27314a"
        },
        slateblue: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#6090fa",
          500: "#3b6df6",
          600: "#2453eb",
          700: "#1d42d8"
        },
        night: {
          950: "#0b0f18",
          900: "#0e1420",
          800: "#141b2c",
          700: "#1b2439"
        },
        accent: {
          green: "#34d399",
          red: "#fb7185",
          blue: "#60a5fa",
          gray: "#94a3b8",
          cyan: "#22d3ee"
        }
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Inter", "Helvetica Neue", "Arial", "sans-serif"]
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(16, 21, 34, 0.25)",
        glow: "0 0 0 6px rgba(96, 144, 250, 0.18)"
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out both",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-ring": "pulseRing 2s ease-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        scaleIn: {
          "0%": { transform: "scale(0.94)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        pulseRing: {
          "0%": { transform: "scale(0.95)", opacity: "0.6" },
          "70%": { transform: "scale(1.12)", opacity: "0" },
          "100%": { transform: "scale(0.95)", opacity: "0" }
        }
      }
    }
  },
  plugins: []
};

export default config;