/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7F72E6',
        ink: '#2B2850',
        muted: '#8A87A6',
        lavender: '#ECE4FF',
        blush: '#FFE3EA',
        mint: '#DDF6EA',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
      boxShadow: {
        soft: '0 16px 40px rgba(88, 69, 145, 0.12)',
      },
    },
  },
  plugins: [],
}