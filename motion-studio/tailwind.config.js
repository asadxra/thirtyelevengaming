/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#05060a', 900: '#0a0b12', 850: '#0e1019', 800: '#121521', 750: '#171a29', 700: '#1d2133', 600: '#272c42', 500: '#363c58' },
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { glow: '0 0 24px rgb(var(--accent) / calc(var(--glow) * 0.45))' },
    },
  },
  plugins: [],
};
