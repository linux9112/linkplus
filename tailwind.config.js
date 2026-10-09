/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: {
          light: '#F7F8FA',
          dark: '#171923',
        },
        card: {
          light: '#FFFFFF',
          dark: '#202430',
        },
        surface: {
          light: '#F1F3F7',
          dark: '#272D3A',
        },
        text: {
          primary: {
            light: '#171923',
            dark: '#F9FAFB',
          },
          body: {
            light: '#424B5A',
            dark: '#D1D5DB',
          },
          secondary: {
            light: '#626B7A',
            dark: '#A7AFBD',
          },
        },
        border: {
          light: '#E5E7EB',
          dark: '#343B4B',
        },
        brand: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
          dark: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        status: {
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'panel': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
