import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      fontFamily: {
        sans: ['Poppins', 'Lora', 'ui-sans-serif', 'system-ui', 'sans-serif', "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
        rozha: ['Rozha One', 'Poppins', 'Lora', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#0f1c1c',
          dark: '#1a2828',
          darker: '#2a3838',
          primary: '#d97ac8',
          secondary: '#c84a8a',
          accent: '#00ffaa',
        },
      },
    },
  },
  plugins: [],
};
export default config;