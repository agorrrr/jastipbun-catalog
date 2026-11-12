/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FBF9F7',
          100: '#F6F3EF',
          200: '#EEE9E2',
          300: '#E2DBD2',
        },
        rosebrand: {
          50: '#F9F1F3',
          100: '#F2E2E5',
          200: '#E5C5CB',
          500: '#B8727E',
          600: '#A4606C',
          700: '#8E4E59',
        },
        espresso: {
          100: '#EAE6E4',
          200: '#D5CDC9',
          700: '#534542',
          800: '#3A2E2C',
          900: '#2A201E',
        },
      }
    },
  },
  plugins: [],
}
