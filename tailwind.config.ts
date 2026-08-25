import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vopria ink-navy palette. See CONTEXT.md / the rebrand spec for the
        // source table — keep these in sync with the CSS custom properties
        // in globals.css, both are driven by the same values.
        ink: {
          DEFAULT: '#0F1836',      // page background, hero, footer
          raised: '#1A2447',       // cards, panels, mockups
          'raised-hover': '#212D57',
          inset: '#0B1229',        // nested wells, table headers, feature strip
        },
        line: {
          DEFAULT: '#2C3862',
          strong: '#3B4977',
        },
        fg: {
          DEFAULT: '#F5F3FF',      // headings, primary text
          body: '#B6BDD4',         // paragraphs, descriptions
          muted: '#7E86A3',        // captions, fine print, pending states
          accent: '#A78BFA',       // eyebrow labels, inline links
        },
        // Primary violet accent — buttons, wordmark, focus rings
        brand: {
          DEFAULT: '#8B5CF6',
          hover: '#7C4DEF',
          deep: '#6D28D9',
        },
        // Status colours — used throughout traffic-light UI. `rejected` is
        // an addition beyond the original 3-token spec (approved/pending/
        // inactive) since the app has real overdue/rejected/expired states
        // the spec's marketing-copy palette didn't need to cover.
        status: {
          approved: '#5DCAA5',
          pending: '#FAC775',
          inactive: '#7E86A3',
          rejected: '#F0828E',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
  safelist: [
    'translate-x-0',
    '-translate-x-full',
  ],
}

export default config
