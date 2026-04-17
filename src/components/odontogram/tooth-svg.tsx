'use client'

import type { MarkType, Surface, ToothState } from './types'
import { TOOL_COLORS } from './types'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stroke colour for tooth borders. */
const STROKE = '#9ca3af'

/** Stroke width for surface borders. */
const SW = 0.75

/** Fill when no mark is applied to a surface (white). */
const FILL_EMPTY = '#ffffff'

/**
 * Viewbox size for each tooth SVG.
 * Surfaces occupy the full box; the outer border rect sits on top.
 */
const SZ = 40

/** Inner square inset — distance from outer edge to center square. */
const IN = 10

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
  const { surfaces, mark } = state

  /** Describe the tooth state for screen readers. */
  const ariaDescription = (): string => {
    const parts: string[] = []

    if (mark) parts.push(mark)

    const surfaceMarks = (Object.entries(surfaces) as Array<[Surface, MarkType | null]>)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}:${v}`)

    parts.push(...surfaceMarks)

    return parts.length ? parts.join(', ') : 'sano'
  }

  const sharedPathProps = {
    stroke: STROKE,
    strokeWidth: SW,
    className: 'cursor-pointer hover:opacity-75 transition-opacity',
  }

  return (
    <svg
      width={SZ}
      height={SZ}
      viewBox={`0 0 ${SZ} ${SZ}`}
      aria-label={`Diente ${fdi} — ${ariaDescription()}`}
      role="img"
    >
      {/* ── M (Mesial) — top trapezoid ───────────────────────────────────────── */}
      <polygon
        points={`0,0 ${SZ},0 ${SZ - IN},${IN} ${IN},${IN}`}
        fill={surfaceFill(surfaces.M)}
        onClick={() => onSurfaceClick('M')}
        aria-label="Mesial"
        {...sharedPathProps}
      />

      {/* ── D (Distal) — bottom trapezoid ────────────────────────────────────── */}
      <polygon
        points={`0,${SZ} ${SZ},${SZ} ${SZ - IN},${SZ - IN} ${IN},${SZ - IN}`}
        fill={surfaceFill(surfaces.D)}
        onClick={() => onSurfaceClick('D')}
        aria-label="Distal"
        {...sharedPathProps}
      />

      {/* ── V (Vestibular) — left trapezoid ──────────────────────────────────── */}
      <polygon
        points={`0,0 ${IN},${IN} ${IN},${SZ - IN} 0,${SZ}`}
        fill={surfaceFill(surfaces.V)}
        onClick={() => onSurfaceClick('V')}
        aria-label="Vestibular"
        {...sharedPathProps}
      />

      {/* ── P (Palatino) — right trapezoid ───────────────────────────────────── */}
      <polygon
        points={`${SZ},0 ${SZ},${SZ} ${SZ - IN},${SZ - IN} ${SZ - IN},${IN}`}
        fill={surfaceFill(surfaces.P)}
        onClick={() => onSurfaceClick('P')}
        aria-label="Palatino"
        {...sharedPathProps}
      />

      {/* ── O (Oclusal) — center square ──────────────────────────────────────── */}
      <rect
        x={IN}
        y={IN}
        width={SZ - IN * 2}
        height={SZ - IN * 2}
        fill={surfaceFill(surfaces.O)}
        onClick={() => onSurfaceClick('O')}
        aria-label="Oclusal"
        {...sharedPathProps}
      />

      {/* ── Outer border (non-interactive, drawn last) ────────────────────────── */}
      <rect
        x={0}
        y={0}
        width={SZ}
        height={SZ}
        fill="none"
        stroke={STROKE}
        strokeWidth={SW}
        pointerEvents="none"
      />

      {/* ── Whole-tooth overlays ─────────────────────────────────────────────── */}
      {mark === 'corona' && (
        <circle
          cx={SZ / 2}
          cy={SZ / 2}
          r={SZ / 2 - 2}
          fill="none"
          stroke={TOOL_COLORS.corona}
          strokeWidth="2.5"
          pointerEvents="none"
        />
      )}

      {mark === 'extraccion' && (
        <g stroke={TOOL_COLORS.extraccion} strokeWidth="2.5" pointerEvents="none">
          <line x1="4" y1="4" x2={SZ - 4} y2={SZ - 4} />
          <line x1={SZ - 4} y1="4" x2="4" y2={SZ - 4} />
        </g>
      )}

      {mark === 'endodoncia' && (
        <line
          x1={SZ / 2}
          y1="2"
          x2={SZ / 2}
          y2={SZ - 2}
          stroke={TOOL_COLORS.endodoncia}
          strokeWidth="2.5"
          pointerEvents="none"
        />
      )}

      {mark === 'ausente' && (
        <g stroke={TOOL_COLORS.ausente} strokeWidth="1.5" pointerEvents="none">
          <line x1="4" y1="4" x2={SZ - 4} y2={SZ - 4} />
          <line x1={SZ - 4} y1="4" x2="4" y2={SZ - 4} />
        </g>
      )}
    </svg>
  )
}

export default ToothSVG
