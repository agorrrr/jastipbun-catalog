/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f5',
          100: '#fce7ea',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239'
        }
      }
    },
  },
  plugins: [],
}
