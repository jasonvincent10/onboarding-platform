import type { Config } from 'tailwindcss'

/**
 * Vopria brand palette: light text on deep purple.
 *
 * The token NAMES are light-theme in origin (canvas, ink, raised) and have
 * been kept so nothing had to be renamed across the site. Read them as roles,
 * not colours:
 *   canvas  = the page and the surfaces on it, darkest to lightest
 *   ink     = text, strongest to faintest
 *   line    = borders
 *
 * Anchors: background #17102D, headings #F7F5FF, accent #A78BFA, and a
 * brightened #7C3AED for buttons, since #5B21B6 is too close to the page
 * behind it to read as a control. Everything else is derived from those, so
 * the whole site can be re-toned by moving them. Mirrors the custom
 * properties in app/globals.css; change both together.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Buttons and other solid controls. Brighter than the brand's #5B21B6,
        // which disappears against a dark purple page.
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#8B5CF6',
          deep: '#5B21B6',
          soft: '#A78BFA',
        },
        // Accents: eyebrows, inline links, icon glyphs. `veil` is the chip and
        // badge background, now a dark tint rather than a light wash.
        accent: {
          DEFAULT: '#A78BFA',
          hover: '#C4B5FD',
          soft: '#8B5CF6',
          mist: '#4A3578',
          veil: '#271A4D',
        },
        // Text, strongest to faintest.
        ink: {
          DEFAULT: '#F7F5FF',
          soft: '#CFC7E8',
          muted: '#ABA1C9',
          faint: '#9289B0',
        },
        // The page and the surfaces layered on it.
        canvas: {
          DEFAULT: '#17102D',
          raised: '#221741',
          sunken: '#100A21',
          tint: '#1C1435',
        },
        line: {
          DEFAULT: '#33254F',
          strong: '#463467',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      maxWidth: {
        prose: '68ch',
      },
      // On a dark page a drop shadow does almost nothing, so depth comes from
      // the surface being lighter than the page plus a faint violet glow.
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px -12px rgba(0, 0, 0, 0.45)',
        lifted: '0 2px 6px rgba(0, 0, 0, 0.35), 0 24px 56px -24px rgba(124, 58, 237, 0.45)',
        glow: '0 16px 48px -16px rgba(167, 139, 250, 0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 55%, #A78BFA 100%)',
        // Was a light lavender wash; now a raised purple panel that still sits
        // apart from the cards around it.
        'brand-gradient-soft': 'linear-gradient(135deg, #2A1B52 0%, #1D1339 100%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
