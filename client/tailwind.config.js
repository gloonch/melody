/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        alabaster: "rgb(var(--color-alabaster) / <alpha-value>)",
        greige: "rgb(var(--color-greige) / <alpha-value>)",
        rosewood: "rgb(var(--color-rosewood) / <alpha-value>)",
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 18px 48px rgb(var(--color-charcoal) / 0.08)",
        accent: "0 14px 32px rgb(var(--color-rosewood) / 0.22)",
        elevated: "0 24px 70px rgb(var(--color-charcoal) / 0.14)"
      },
      dropShadow: {
        ink: "0 2px 3px rgb(var(--color-charcoal) / 0.45)"
      },
      backgroundImage: {
        "surface-gradient": "linear-gradient(145deg, rgb(var(--color-alabaster)) 0%, rgb(var(--color-greige)) 100%)",
        "surface-fade": "linear-gradient(90deg, rgb(var(--color-alabaster)) 0%, rgb(var(--color-alabaster) / 0.78) 52%, rgb(var(--color-alabaster) / 0) 100%)",
        "ink-fade": "linear-gradient(90deg, rgb(var(--color-charcoal) / 0.92) 0%, rgb(var(--color-charcoal) / 0.48) 55%, rgb(var(--color-charcoal) / 0.12) 100%)",
        "vertical-surface-fade": "linear-gradient(180deg, rgb(var(--color-alabaster) / 0) 0%, rgb(var(--color-alabaster) / 0.72) 56%, rgb(var(--color-alabaster)) 100%)",
        "vertical-ink-fade": "linear-gradient(180deg, rgb(var(--color-charcoal) / 0.76) 0%, rgb(var(--color-charcoal) / 0.2) 52%, rgb(var(--color-charcoal) / 0.82) 100%)"
      }
    }
  },
  plugins: []
};
