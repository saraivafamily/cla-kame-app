/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /(bg|text|border|from|to|shadow)-(emerald|amber|purple|blue|red|sky|slate|gray)/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}