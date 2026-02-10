/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b1a33",
          800: "#13264a",
          700: "#1d3461",
        },
        sky: {
          50: "#f2f7ff",
          100: "#e2eeff",
          200: "#c6dcff",
          300: "#9bc2ff",
          500: "#4b8dff",
          600: "#2e6cf2",
          700: "#2056d1",
        },
        mint: {
          100: "#e6f5ff",
        },
      },
      fontFamily: {
        display: ["Manrope", "ui-sans-serif", "system-ui"],
        body: ["IBM Plex Sans", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      boxShadow: {
        card: "0 18px 40px -22px rgba(14, 52, 120, 0.45)",
        glow: "0 0 0 1px rgba(72, 128, 255, 0.15), 0 30px 60px -40px rgba(32, 86, 209, 0.55)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease-out both",
        shimmer: "shimmer 9s ease infinite",
      },
    },
  },
  plugins: [],
};
