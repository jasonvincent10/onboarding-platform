import { deliverables } from '@/content/site'

/**
 * Illustrative Opportunity Matrix — value against effort, shaded by risk.
 *
 * Hand-built SVG rather than a charting library: it is eight fixed, fictional
 * points that never change, so a dependency would buy nothing and cost the
 * bundle. Drawn in the brand palette.
 *
 * Risk is encoded twice over, never by colour alone — the shade deepens AND
 * the ring changes (none / solid / dashed), so the legend still works in
 * greyscale or for a colour-blind reader. The full data is repeated as a
 * screen-reader list, since a scatter plot is not readable by ear.
 *
 * The numbers here are invented and generic by design. They must never be
 * replaced with real client data — this is a public marketing page.
 */

const { matrix } = deliverables

// Plot geometry, in viewBox units.
const VIEW = { w: 600, h: 440 }
const PLOT = { left: 64, top: 28, right: 570, bottom: 356 }
const PLOT_W = PLOT.right - PLOT.left
const PLOT_H = PLOT.bottom - PLOT.top

/** Effort 0–100 → x. */
const toX = (effort: number) => PLOT.left + (effort / 100) * PLOT_W
/** Value 0–100 → y (inverted: higher value sits higher up). */
const toY = (value: number) => PLOT.top + (1 - value / 100) * PLOT_H

/**
 * Risk styling. `ring` is the second, non-colour channel:
 * none for low, solid for medium, dashed for high.
 */
const RISK_STYLE = {
  low: { fill: '#6D5B9E', ring: 'none' },
  medium: { fill: '#A78BFA', ring: 'solid' },
  high: { fill: '#E9E2FF', ring: 'dashed' },
} as const

type Risk = keyof typeof RISK_STYLE

export function OpportunityMatrix() {
  return (
    <figure className="flex flex-col gap-4 rounded-3xl border border-line bg-canvas-raised p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-extrabold tracking-tight text-ink">{matrix.title}</h3>
        <span className="rounded-full bg-accent-veil px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">
          {matrix.label}
        </span>
      </div>

      {/* Wide content scrolls inside its own container rather than forcing the
          page to scroll sideways on a narrow phone. The chart needs roughly
          30rem before the dot labels start colliding, so below that it
          scrolls — and says so, since a clipped edge alone is easy to miss. */}
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted sm:hidden">
        {matrix.scrollHint}
        <HintArrow />
      </p>

      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className="h-auto w-full min-w-[30rem]"
          aria-hidden="true"
          focusable="false"
        >
          <Quadrants />
          <Axes />
          {matrix.points.map((point) => (
            <Point key={point.label} point={point} />
          ))}
          <Legend />
        </svg>
      </div>

      {/* The accessible equivalent of the plot above. */}
      <ul className="sr-only">
        {matrix.points.map((point) => (
          <li key={point.label}>
            {point.label}: value {point.value} out of 100, effort {point.effort} out of 100,{' '}
            {point.risk} risk.
          </li>
        ))}
      </ul>

      <figcaption className="text-sm leading-relaxed text-ink-muted">{matrix.caption}</figcaption>
    </figure>
  )
}

function HintArrow() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8h10" />
      <path d="M9 4l4 4-4 4" />
    </svg>
  )
}

/** Quadrant guides. The top-left — high value, low effort — is where work starts. */
function Quadrants() {
  const midX = toX(50)
  const midY = toY(50)

  return (
    <g>
      <rect
        x={PLOT.left}
        y={PLOT.top}
        width={midX - PLOT.left}
        height={midY - PLOT.top}
        fill="#2E2154"
      />
      {/* Light lavender, not the deep brand purple, which is nearly
          invisible against the dark quadrant tile. Contrast in SVG comes from
          `fill`, which colour checkers reading CSS `color` will not catch, so
          every label here is verified by hand. */}
      <text
        x={PLOT.left + 14}
        y={PLOT.top + 26}
        fill="#C4B5FD"
        fontSize="13"
        fontWeight="700"
        letterSpacing="0.06em"
      >
        START HERE
      </text>
      <line x1={midX} y1={PLOT.top} x2={midX} y2={PLOT.bottom} stroke="#3A2A5C" strokeWidth="1.5" />
      <line x1={PLOT.left} y1={midY} x2={PLOT.right} y2={midY} stroke="#3A2A5C" strokeWidth="1.5" />
    </g>
  )
}

function Axes() {
  return (
    <g>
      {/* Axis lines with arrowheads pointing toward "more". */}
      <line
        x1={PLOT.left}
        y1={PLOT.bottom}
        x2={PLOT.left}
        y2={PLOT.top - 6}
        stroke="#4E3B73"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1={PLOT.left}
        y1={PLOT.bottom}
        x2={PLOT.right + 6}
        y2={PLOT.bottom}
        stroke="#4E3B73"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Vertical axis label, reading bottom-to-top alongside the axis. */}
      <text
        transform={`translate(26 ${PLOT.top + PLOT_H / 2}) rotate(-90)`}
        textAnchor="middle"
        fill="#F7F5FF"
        fontSize="15"
        fontWeight="800"
      >
        {matrix.axes.value} →
      </text>

      <text
        x={PLOT.left + PLOT_W / 2}
        y={PLOT.bottom + 34}
        textAnchor="middle"
        fill="#F7F5FF"
        fontSize="15"
        fontWeight="800"
      >
        {matrix.axes.effort} →
      </text>
    </g>
  )
}

function Point({ point }: { point: (typeof matrix.points)[number] }) {
  const style = RISK_STYLE[point.risk as Risk]
  const x = toX(point.effort)
  const y = toY(point.value)

  // Points on the right half label leftwards so text never runs off the plot.
  const labelsLeft = point.effort >= 55
  const labelX = labelsLeft ? x - 13 : x + 13

  return (
    <g>
      {style.ring !== 'none' ? (
        <circle
          cx={x}
          cy={y}
          r="12"
          fill="none"
          stroke={style.fill}
          strokeWidth="1.5"
          strokeOpacity="0.55"
          strokeDasharray={style.ring === 'dashed' ? '3 3' : undefined}
        />
      ) : null}
      <circle cx={x} cy={y} r="7" fill={style.fill} stroke="#221741" strokeWidth="2" />
      <text
        x={labelX}
        y={y + 4}
        textAnchor={labelsLeft ? 'end' : 'start'}
        fill="#CFC7E8"
        fontSize="13"
        fontWeight="600"
      >
        {point.label}
      </text>
    </g>
  )
}

function Legend() {
  return (
    <g transform={`translate(${PLOT.left} ${PLOT.bottom + 58})`}>
      {matrix.riskLegend.map((entry, index) => {
        const style = RISK_STYLE[entry.level as Risk]
        const x = index * 150

        return (
          <g key={entry.level} transform={`translate(${x} 0)`}>
            {style.ring !== 'none' ? (
              <circle
                cx="9"
                cy="0"
                r="10"
                fill="none"
                stroke={style.fill}
                strokeWidth="1.5"
                strokeOpacity="0.55"
                strokeDasharray={style.ring === 'dashed' ? '3 3' : undefined}
              />
            ) : null}
            <circle cx="9" cy="0" r="6" fill={style.fill} stroke="#221741" strokeWidth="1.5" />
            <text x="26" y="4" fill="#ABA1C9" fontSize="13" fontWeight="600">
              {entry.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
