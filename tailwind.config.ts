import type { Config } from 'tailwindcss'

/**
 * Vopria brand palette — purple on off-white.
 *
 * The four values fixed by the brand spec are:
 *   primary  #5B21B6   accent  #8B5CF6   ink  #1E1B2E   canvas  #FAF8FF
 *
 * Everything else here is a tint or shade derived from those, so the whole
 * site can be re-toned by moving the four anchors. These mirror the custom
 * properties in app/globals.css — change both together.
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
        // Deep purple — primary buttons, headings on light, the gradient's dark end.
        primary: {
          DEFAULT: '#5B21B6',
          hover: '#4C1D95',
          deep: '#3B1578',
          soft: '#7C3AED',
        },
        // Lighter purple — secondary accents, the gradient's light end, icon fills.
        accent: {
          DEFAULT: '#8B5CF6',
          hover: '#7C4DEF',
          soft: '#A78BFA',
          mist: '#C4B5FD',
          veil: '#EDE9FE',
        },
        // Near-black with a purple cast — body copy and headings.
        ink: {
          DEFAULT: '#1E1B2E',
          soft: '#453F5C',
          muted: '#6B6485',
          faint: '#706A88',
        },
        // Off-white canvas and the surfaces layered on it.
        canvas: {
          DEFAULT: '#FAF8FF',
          raised: '#FFFFFF',
          sunken: '#F3EFFE',
          tint: '#F6F2FF',
        },
        line: {
          DEFAULT: '#E6E0F7',
          strong: '#D3C9F0',
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
      boxShadow: {
        card: '0 1px 2px rgba(30, 27, 46, 0.04), 0 8px 24px -12px rgba(91, 33, 182, 0.16)',
        lifted: '0 2px 4px rgba(30, 27, 46, 0.05), 0 20px 48px -20px rgba(91, 33, 182, 0.28)',
        glow: '0 16px 48px -16px rgba(139, 92, 246, 0.55)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 55%, #8B5CF6 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #EDE9FE 0%, #FAF8FF 100%)',
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
