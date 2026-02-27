/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg':    '#1C1C1E',
        'app-card':  '#2C2C2E',
        'app-input': '#3A3A3C',
        'app-border':'#48484A',
        'app-muted': '#8E8E93',
        'app-accent':'#FFD700',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
