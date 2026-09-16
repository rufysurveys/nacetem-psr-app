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
          green: "#059669",
          darkgreen: "#047857",
          lightgreen: "#ecfdf5",
          gold: "#d97706",
          blue: "#2563eb",
          lightbg: "#f8fafc"
        }
      }
    },
  },
  plugins: [],
}
