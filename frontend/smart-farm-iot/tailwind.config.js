/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  safelist: [
    {
      pattern: /(bg|text|from|to|border)-(red|blue|emerald|yellow|indigo|violet|orange|teal|slate)-(50|100|200|300|400|500|600|700)/,
    }
  ],
  plugins: [],
}