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
        poppins: ['var(--font-poppins)', 'sans-serif'],
        lora: ['var(--font-lora)', 'serif'],
        rozha: ['var(--font-rozha)', 'serif'],
        sans: ['var(--font-poppins)', 'var(--font-lora)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#0f1c1c',
          dark: '#1a2828',
          darker: '#2a3838',
          primary: '#FFA9FC',
          'primary-hover': '#FFC4FD',
          accent: '#00ffaa',
        },
      },
    },
  },
  plugins: [],
};
export default config;
