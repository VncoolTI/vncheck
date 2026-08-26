/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "vn-primary": "#478ffc",
        "vn-secondary": "#83e2f7",
        "vn-navy-100": "#001b48",
        "vn-navy-200": "#0c2e66",
        "vn-navy-300": "#184284",
        "vn-grey-bg": "#949597",
      },
    },
  },
  plugins: [],
};
