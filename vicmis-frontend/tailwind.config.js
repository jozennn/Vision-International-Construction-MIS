/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "**/*.{js,ts,jsx,tsx,html}",,// This scans EVERY file in your src folder
  ],
  theme: {
    extend: {
      colors: {
        vicmisRed: '#b31d33', // Optional: saves your brand color for easy use
      }
    },
  },
  plugins: [],
}