/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { evergreen: { 50: '#effcf8', 100: '#d3f7eb', 600: '#0f766e', 700: '#0e625e', 900: '#0b3737' } }
    }
  },
  plugins: []
}
