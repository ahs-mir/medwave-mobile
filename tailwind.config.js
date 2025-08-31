/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#2E86AB',
          'blue-light': '#48A3C7',
          'blue-dark': '#1B5A7A',
          green: '#00B894',
          purple: '#6C5CE7',
          red: '#E17055',
          yellow: '#FDCB6E',
        },
        medwave: {
          primary: '#2E86AB',
          secondary: '#00B894',
          accent: '#6C5CE7',
          danger: '#E17055',
          warning: '#FDCB6E',
          background: '#F8FAFB',
          surface: '#FFFFFF',
        },
        uber: {
          primary: '#000000',
          secondary: '#1F1F1F',
          accent: '#276EF1',
          success: '#00B894',
          warning: '#FDCB6E',
          danger: '#E17055',
          gray: {
            50: '#F8FAFB',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      fontFamily: {
        'medical': ['System'],
        'uber': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}