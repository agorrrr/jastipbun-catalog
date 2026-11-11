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
          50: '#FDFBF9',
          100: '#FAF2ED',
          200: '#F4E5DC',
          300: '#EAD1C2',
        },
        rosebrand: {
          50: '#FDF4F6',
          100: '#F9E8EB',
          200: '#F4CED5',
          500: '#E07A8B',
          600: '#D06375',
          700: '#B84B5D',
        },
        espresso: {
          100: '#ECE6E4',
          200: '#D6C8C5',
          700: '#5A3730',
          800: '#3D231E',
          900: '#2A1713',
        },
        goldbrand: {
          50: '#FEF8EB',
          100: '#FDF1D3',
          500: '#F5B838',
          600: '#DF9E20',
        }
      }
    },
  },
  plugins: [],
}
