/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/components/dumas/**/*.{js,ts,jsx,tsx}",
    "./src/components/dumas/sections/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#05070a',
          raised: '#07090e',
        },
        crimson: {
          DEFAULT: '#ef4444',
          deep: '#dc2626',
        },
      },
      animation: {
        radar: 'radar 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
        shimmer: 'shimmer 4s ease-in-out infinite',
        scan: 'scan 4s ease-in-out infinite',
        sweep: 'sweep 6s linear infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-140%) skewX(-20deg)' },
          '55%, 100%': { transform: 'translateX(360%) skewX(-20deg)' },
        },
        scan: {
          '0%, 100%': { top: '6%', opacity: '0' },
          '12%, 88%': { opacity: '1' },
          '50%': { top: '92%' },
        },
        sweep: {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
