import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef0f6',
          100: '#d4d8e8',
          200: '#a9b1d1',
          300: '#7e8aba',
          400: '#5363a3',
          500: '#2d3d7a',
          600: '#1A254E',
          700: '#151e3f',
          800: '#101730',
          900: '#0b1021',
        },
        gold: {
          50: '#fffbeb',
          100: '#fff3c4',
          200: '#ffe588',
          300: '#FFC857',
          400: '#f5b83c',
          500: '#e5a520',
          600: '#c98a10',
        },
        soft: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
