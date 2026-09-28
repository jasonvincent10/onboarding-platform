import { ImageResponse } from 'next/og'

/**
 * Social share card, generated at build time.
 *
 * Replaces the old static /public/og-image.png, which still advertised the
 * previous employee-onboarding product. Generating it here means the card
 * follows the brand tokens instead of needing a designer round-trip.
 *
 * Note: ImageResponse renders with Satori, which supports a subset of CSS —
 * every element needs an explicit `display`, and flex is the only layout mode.
 */

export const alt = 'Vopria — AI that fits how your business actually works'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #3B1578 0%, #5B21B6 52%, #7C3AED 100%)',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: 7,
              width: 68,
              height: 68,
              borderRadius: 19,
              background: '#8B5CF6',
              padding: '0 14px',
            }}
          >
            <div style={{ width: 40, height: 17, borderRadius: 9, background: '#fff' }} />
            <div style={{ width: 25, height: 12, borderRadius: 6, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#fff' }}>
            Vopria
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 600,
              color: '#C4B5FD',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            AI consultancy
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 74,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              maxWidth: 940,
            }}
          >
            AI that fits how your business actually works.
          </div>
        </div>

        {/* Four-stage ladder, echoing the site's signature graphic */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 76 }}>
          {[
            { h: 26, o: 0.4 },
            { h: 42, o: 0.6 },
            { h: 58, o: 0.8 },
            { h: 76, o: 1 },
          ].map((bar, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                width: 78,
                height: bar.h,
                borderRadius: 10,
                background: '#fff',
                opacity: bar.o,
              }}
            />
          ))}
          <div
            style={{
              display: 'flex',
              marginLeft: 26,
              fontSize: 26,
              color: '#DDD6FE',
              alignSelf: 'flex-end',
            }}
          >
            Assist → Accelerate → Automate → Agentic
          </div>
        </div>
      </div>
    ),
    size,
  )
}
