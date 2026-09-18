/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3daec',
          500: '#1d5b90',
          600: '#144673',
          700: '#0e3456',
          800: '#0a233b',
          900: '#061625',
        },
        sih: {
          saffron: '#FF9933',
          navy: '#000080',
          green: '#138808',
        }
      }
    },
  },
  plugins: [],
}
