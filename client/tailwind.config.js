/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#071422',
          900: '#0B1F3A',
          800: '#123056',
          700: '#1B4474',
          100: '#E7EEF6',
          50: '#F4F7FB',
        },
        ink: '#122033',
        muted: '#5C6B7A',
        line: '#E4E8EE',
        canvas: '#F3F5F8',
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
