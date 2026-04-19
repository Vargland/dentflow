'use client'

import type { MarkType, Surface, ToothState } from '@/typing/components/odontogram.types'
import { useTranslation } from '@/lib/i18n/client'
import { MARK, TOOL_COLORS } from '@/constants/odontogram'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stroke colour for tooth borders. */
const STROKE = '#9ca3af'

/** Stroke width for surface borders. */
const STROKE_WIDTH = 0.75

/** Fill when no mark is applied to a surface (white). */
const FILL_EMPTY = '#ffffff'

/**
 * Viewbox size for each tooth SVG.
 * Surfaces occupy the full box; the outer border rect sits on top.
 */
const SIZE = 40

/** Inner square inset — distance from outer edge to center square. */
const INSET = 10

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a surface mark to its CSS colour string. */
const surfaceFill = (mark: MarkType | null): string => (mark ? TOOL_COLORS[mark] : FILL_EMPTY)

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for the ToothSVG component. */
export interface ToothSVGProps {
  /** FDI tooth number. */
  fdi: number
  /** Current tooth state. */
  state: ToothState
  /** Called when the user clicks a surface. */
  onSurfaceClick: (surface: Surface) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Single-tooth SVG component with 5 individually clickable surfaces.
 * Uses a 40×40 viewBox; each surface is an SVG path with native onClick.
 * No canvas, no hit-testing math, no devicePixelRatio.
 *
 * Surface layout (40×40):
 *  - M (Mesial)      = top trapezoid:    (0,0)→(40,0)→(30,10)→(10,10)
 *  - D (Distal)      = bottom trapezoid: (0,40)→(40,40)→(30,30)→(10,30)
 *  - V (Vestibular)  = left trapezoid:   (0,0)→(10,10)→(10,30)→(0,40)
 *  - P (Palatino)    = right trapezoid:  (40,0)→(40,40)→(30,30)→(30,10)
 *  - O (Oclusal)     = center square:    (10,10) 20×20
 *
 * @param fdi            - FDI tooth number (used for aria-label).
 * @param state          - Current tooth state (surfaces + whole-tooth mark).
 * @param onSurfaceClick - Callback fired with the clicked surface identifier.
 */
const ToothSVG = ({ fdi, state, onSurfaceClick }: ToothSVGProps) => {
  const { t } = useTranslation()

  const { surfaces, mark } = state

  /** Describe the tooth state for screen readers. */
  const ariaDescription = (): string => {
    const parts: string[] = []

    if (mark) parts.push(t(`odontogram.tools.${mark}`))

    const surfaceMarks = (Object.entries(surfaces) as Array<[Surface, MarkType | null]>)
      .filter(([, surfaceMark]) => surfaceMark !== null)
      .map(
        ([surface, surfaceMark]) => `${surface}:${t(`odontogram.tools.${surfaceMark as MarkType}`)}`
      )

    parts.push(...surfaceMarks)

    return parts.length ? parts.join(', ') : t('odontogram.ariaHealthy')
  }

  const sharedPathProps = {
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    className: 'cursor-pointer hover:opacity-75 transition-opacity',
  }

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label={`${t('odontogram.tooth', { number: fdi })} — ${ariaDescription()}`}
      role="img"
    >
      {/* ── M (Mesial) — top trapezoid ───────────────────────────────────────── */}
      <polygon
        points={`0,0 ${SIZE},0 ${SIZE - INSET},${INSET} ${INSET},${INSET}`}
        fill={surfaceFill(surfaces.M)}
        onClick={() => onSurfaceClick('M')}
        aria-label="Mesial"
        {...sharedPathProps}
      />

      {/* ── D (Distal) — bottom trapezoid ────────────────────────────────────── */}
      <polygon
        points={`0,${SIZE} ${SIZE},${SIZE} ${SIZE - INSET},${SIZE - INSET} ${INSET},${SIZE - INSET}`}
        fill={surfaceFill(surfaces.D)}
        onClick={() => onSurfaceClick('D')}
        aria-label="Distal"
        {...sharedPathProps}
      />

      {/* ── V (Vestibular) — left trapezoid ──────────────────────────────────── */}
      <polygon
        points={`0,0 ${INSET},${INSET} ${INSET},${SIZE - INSET} 0,${SIZE}`}
        fill={surfaceFill(surfaces.V)}
        onClick={() => onSurfaceClick('V')}
        aria-label="Vestibular"
        {...sharedPathProps}
      />

      {/* ── P (Palatino) — right trapezoid ───────────────────────────────────── */}
      <polygon
        points={`${SIZE},0 ${SIZE},${SIZE} ${SIZE - INSET},${SIZE - INSET} ${SIZE - INSET},${INSET}`}
        fill={surfaceFill(surfaces.P)}
        onClick={() => onSurfaceClick('P')}
        aria-label="Palatino"
        {...sharedPathProps}
      />

      {/* ── O (Oclusal) — center square ──────────────────────────────────────── */}
      <rect
        x={INSET}
        y={INSET}
        width={SIZE - INSET * 2}
        height={SIZE - INSET * 2}
        fill={surfaceFill(surfaces.O)}
        onClick={() => onSurfaceClick('O')}
        aria-label="Oclusal"
        {...sharedPathProps}
      />

      {/* ── Outer border (non-interactive, drawn last) ────────────────────────── */}
      <rect
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        pointerEvents="none"
      />

      {/* ── Whole-tooth overlays ─────────────────────────────────────────────── */}
      {mark === MARK.CROWN && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 2}
          fill="none"
          stroke={TOOL_COLORS[MARK.CROWN]}
          strokeWidth="2.5"
          pointerEvents="none"
        />
      )}

      {mark === MARK.EXTRACTION && (
        <g stroke={TOOL_COLORS[MARK.EXTRACTION]} strokeWidth="2.5" pointerEvents="none">
          <line x1="4" y1="4" x2={SIZE - 4} y2={SIZE - 4} />
          <line x1={SIZE - 4} y1="4" x2="4" y2={SIZE - 4} />
        </g>
      )}

      {mark === MARK.ROOTCANAL && (
        <line
          x1={SIZE / 2}
          y1="2"
          x2={SIZE / 2}
          y2={SIZE - 2}
          stroke={TOOL_COLORS[MARK.ROOTCANAL]}
          strokeWidth="2.5"
          pointerEvents="none"
        />
      )}

      {mark === MARK.EXTRACTED && (
        <g stroke={TOOL_COLORS[MARK.EXTRACTED]} strokeWidth="1.5" pointerEvents="none">
          <line x1="4" y1="4" x2={SIZE - 4} y2={SIZE - 4} />
          <line x1={SIZE - 4} y1="4" x2="4" y2={SIZE - 4} />
        </g>
      )}
    </svg>
  )
}

export default ToothSVG
