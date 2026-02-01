import plugin from 'tailwindcss/plugin';
import { addIconSelectors } from '@iconify/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '390px',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },

      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0.2',
          },
          '100%': {
            opacity: '1',
          },
        },
        'fade-out': {
          '0%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-in-out',
        'fade-out': 'fade-out 0.15s ease-out',
      },
      colors: {
        slight: {
          DEFAULT: "#dedede"
        },
        dim: {
          DEFAULT: "#646464"
        },
        border: {
          DEFAULT: "#252525"
        },
        // Redesign
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cad5e2',
          400: '#90a1b9',
          500: '#67778e',
          600: '#495668',
          700: '#314158',
          750: '#253446',
          800: '#212a36',
          850: '#19242e',
          900: '#151e28',
          925: '#111922',
          950: '#0b0e13',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c6',
          200: '#fee685',
          300: '#ffd230',
          400: '#ffb900',
          DEFAULT: '#ffb900',
          500: '#fe9a00',
          600: '#e17100',
          700: '#bb4d00',
          800: '#973c00',
          900: '#7b3306',
          950: '#461901',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d0fae5',
          200: '#a4f4cf',
          300: '#5ee9b5',
          400: '#3ce3ab',
          DEFAULT: '#2cff7a',
          500: '#02c78c',
          600: '#00a272',
          700: '#00815f',
          800: '#00664c',
          900: '#005440',
          950: '#002f25',
        },
        rose: {
          50: '#fff1f4',
          100: '#ffe4ea',
          200: '#fecddb',
          300: '#fca5bd',
          400: '#f23674',
          DEFAULT: '#ff5050',
          500: '#eb2d6f',
          600: '#e01e68',
          700: '#bd1358',
          800: '#9e134f',
          900: '#871449',
          950: '#4b0624',
        },
        primary: {
          DEFAULT: '#FDE047',
          800: '#292919',
        },
      },
      boxShadow: {
        'custom': '0px 4px 10px 0px hsl(0 0% 0% / 0.10), 0px 1px 2px -1px hsl(0 0% 0% / 0.10)',
      },
    },
  },
  plugins: [
    // Iconify plugin for clean selectors, requires writing a list of icon sets to load
    // Icons usage in HTML:
    //  <span class="iconify [icon-set]--[icon]"></span>
    //  <span class="iconify ph--airplane-tilt-fill"></span>
    addIconSelectors({
      // List of icon sets
      prefixes: ['ph'],
    }),
  ],
};
