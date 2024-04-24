/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    minHeight: {
      704: "44rem",
      512: "25rem",
    },
    maxHeight: {
      704: "40rem",
    },
    extend: {
      screens: {
        phone: { max: "48rem" },
        small: { min: "48rem" },
        normal: { min: "80rem" },
      },
      height: {
        85: "85vh",
      },
    },
  },
  plugins: [],
};
