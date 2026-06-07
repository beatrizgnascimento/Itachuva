/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        river: "#1f6f8b",
        riverDark: "#17546a",
        riverLight: "#cfe7ee",
        sun: "#f59e0b",
        storm: "#1f2933",
        mist: "#f2efe6",
        alert: "#e53935",
        alertDark: "#c62828",
        safe: "#2e7d32",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.18)",
        float: "0 12px 24px rgba(15, 23, 42, 0.2)",
      },
    },
  },
  plugins: [],
};
