/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: {
          50: '#f7f8f9',
          100: '#eceef1',
          200: '#d5d9e0',
          300: '#b1b8c4',
          400: '#8791a3',
          500: '#69728a',
          600: '#535b70',
          700: '#444a5c',
          800: '#2c313e',
          900: '#191c24',
          950: '#0e1015'
        },
        accent: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bdd2ff',
          300: '#8fb3ff',
          400: '#5b8bff',
          500: '#3563e0',
          600: '#2748b8',
          700: '#213a91',
          800: '#1f3277',
          900: '#1e2d62'
        },
        signal: {
          present: '#1a7f5a',
          absent: '#c23b3b',
          warning: '#b8791a',
          pending: '#69728a'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 16, 21, 0.06), 0 1px 1px rgba(14, 16, 21, 0.04)'
      }
    }
  },
  plugins: []
}
