/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // An elegant serif for headings and a warm humanist sans for prose.
        // Together they read as considered rather than as default UI tooling.
        display: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm, dusty neutrals: sun-bleached clay through to deep bark.
        // Every text tier below 500 clears WCAG AA on the `ink-50` page base.
        ink: {
          50: '#faf7f4',
          100: '#f2ece7',
          200: '#e6dcd4',
          300: '#c9b8a9',
          400: '#7b6c5e',
          500: '#6f6154',
          600: '#5b4f44',
          700: '#463d35',
          800: '#332d27',
          900: '#241f1b',
          950: '#16120f',
        },
        // Dusty rose, softened well away from the saturated blue it replaced.
        accent: {
          50: '#fbf4f2',
          100: '#f6e7e4',
          200: '#ecd0cc',
          300: '#ddb0aa',
          400: '#c98d86',
          500: '#b56f6a',
          600: '#9c5653',
          700: '#834845',
          800: '#6d3d3b',
          900: '#5d3634',
        },
        // Soft tints used for the frosted-glass fills and hairline borders.
        haze: {
          DEFAULT: '#fdf9f6',
          soft: '#f8f1ea',
          deep: '#efe1d6',
        },
        // Large, slow-moving shapes behind the content. Deliberately low
        // chroma so text layered on top keeps its contrast.
        aura: {
          rose: '#e8b4ae',
          sage: '#b3c4ae',
          lilac: '#c9b7d8',
          ochre: '#e3c9a0',
          sky: '#aec6d8',
        },
        signal: {
          present: '#4e6b52',
          absent: '#9c5653',
          warning: '#86601f',
          pending: '#6f6154',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(36, 31, 27, 0.04), 0 12px 32px -14px rgba(36, 31, 27, 0.12)',
        // Inset highlight reads as a lit glass edge; the outer blur keeps the
        // card floating rather than sitting flat on the page.
        glass:
          'inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 18px 40px -20px rgba(36, 31, 27, 0.22)',
        lift: '0 28px 56px -28px rgba(36, 31, 27, 0.26)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        drift: 'cubic-bezier(0.45, 0, 0.55, 1)',
      },
      keyframes: {
        // Each aura drifts on a different duration and axis so the background
        // never visibly loops.
        driftA: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -6%, 0) scale(1.12)' },
          '66%': { transform: 'translate3d(-5%, 4%, 0) scale(0.94)' },
        },
        driftB: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(-7%, 7%, 0) scale(0.9)' },
        },
        driftC: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(0.95)' },
          '40%': { transform: 'translate3d(6%, 5%, 0) scale(1.15)' },
          '80%': { transform: 'translate3d(-3%, -7%, 0) scale(1)' },
        },
        // Entrance for page content: a short settle with a touch of overshoot.
        // `backwards` rather than `both` so that if the animation never runs
        // (blocked, or interrupted) the element falls back to its natural
        // visible styles instead of being stuck at opacity 0.
        rise: {
          from: { opacity: '0', transform: 'translate3d(0, 12px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'drift-a': 'driftA 46s var(--ease-drift) infinite',
        'drift-b': 'driftB 62s var(--ease-drift) infinite',
        'drift-c': 'driftC 54s var(--ease-drift) infinite',
        breathe: 'breathe 9s ease-in-out infinite',
        rise: 'rise 0.7s var(--ease-spring) backwards',
      },
    },
  },
  plugins: [],
}