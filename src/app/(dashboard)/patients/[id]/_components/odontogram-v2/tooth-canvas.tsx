'use client'

import { useCallback, useEffect, useRef } from 'react'

import type { OuterSurface } from './tooth-geometry'
import {
  CANVAS_SIZE,
  CENTER_SQUARE,
  hitTestSurface,
  SURFACE_QUADS,
  TOOL_COLORS,
} from './tooth-geometry'
import type { MarkType, Surface, ToothState } from './types'

// ── Internal drawing constants ────────────────────────────────────────────────

const S = CANVAS_SIZE

/** Stroke colour for tooth outlines. */
const STROKE = '#374151'

/** Stroke width. */
const SW = 0.8

// ── Drawing helpers ───────────────────────────────────────────────────────────

interface Pt {
  x: number
  y: number
}

/** Draw a quadrilateral path on the canvas context. */
const drawQuad = (ctx: CanvasRenderingContext2D, q: readonly [Pt, Pt, Pt, Pt]) => {
  ctx.beginPath()

  ctx.moveTo(q[0].x, q[0].y)

  ctx.lineTo(q[1].x, q[1].y)

  ctx.lineTo(q[2].x, q[2].y)

  ctx.lineTo(q[3].x, q[3].y)

  ctx.closePath()
}

/** Resolve a mark to its paint colour, or a neutral fill when null. */
const markColor = (m: MarkType | null, isDark: boolean): string => {
  if (m) return TOOL_COLORS[m]

  return isDark ? '#1f2937' : '#ffffff'
}

interface DrawToothArgs {
  ctx: CanvasRenderingContext2D
  state: ToothState
  isDark: boolean
}

/**
 * Render a single tooth onto the given canvas context.
 *
 * @param args.ctx    - 2D rendering context (already scaled for DPR).
 * @param args.state  - Current tooth state.
 * @param args.isDark - Whether dark mode is active.
 */
const drawTooth = ({ ctx, state, isDark }: DrawToothArgs) => {
  const { x: cx, y: cy, w: cw, h: ch } = CENTER_SQUARE

  ctx.clearRect(0, 0, S, S)

  ctx.strokeStyle = STROKE

  ctx.lineWidth = SW

  // ── Surfaces ────────────────────────────────────────────────────────────────

  const surfaceKeys: OuterSurface[] = ['V', 'P', 'M', 'D']

  surfaceKeys.forEach(key => {
    drawQuad(ctx, SURFACE_QUADS[key])

    ctx.fillStyle = markColor(state.surfaces[key], isDark)

    ctx.fill()

    ctx.stroke()
  })

  // O (center square)
  ctx.fillStyle = markColor(state.surfaces.O, isDark)

  ctx.fillRect(cx, cy, cw, ch)

  ctx.strokeRect(cx, cy, cw, ch)

  // ── Whole-tooth marks ───────────────────────────────────────────────────────

  const { mark } = state

  if (!mark) return

  const color = TOOL_COLORS[mark]

  if (mark === 'corona') {
    ctx.beginPath()

    ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2)

    ctx.strokeStyle = color

    ctx.lineWidth = 2

    ctx.stroke()
  } else if (mark === 'extraccion') {
    ctx.beginPath()

    ctx.moveTo(3, 3)

    ctx.lineTo(S - 3, S - 3)

    ctx.moveTo(S - 3, 3)

    ctx.lineTo(3, S - 3)

    ctx.strokeStyle = color

    ctx.lineWidth = 2.5

    ctx.stroke()
  } else if (mark === 'endodoncia') {
    ctx.beginPath()

    ctx.moveTo(S / 2, 2)

    ctx.lineTo(S / 2, S - 2)

    ctx.strokeStyle = color

    ctx.lineWidth = 2

    ctx.stroke()
  } else if (mark === 'ausente') {
    ctx.beginPath()

    ctx.moveTo(4, 4)

    ctx.lineTo(S - 4, S - 4)

    ctx.moveTo(S - 4, 4)

    ctx.lineTo(4, S - 4)

    ctx.strokeStyle = color

    ctx.lineWidth = 1.5

    ctx.stroke()
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ToothCanvasProps {
  /** FDI tooth number. */
  fdi: number
  /** Current tooth state. */
  state: ToothState
  /** Whether dark mode is active. */
  isDark: boolean
  /** Called when the user clicks a surface. */
  onSurfaceClick: (surface: Surface) => void
}

/**
 * Single-tooth canvas component. Renders a 30×30 logical px canvas
 * (devicePixelRatio-aware) with 5 individually clickable surfaces.
 *
 * @param fdi            - FDI tooth number.
 * @param state          - Current tooth state.
 * @param isDark         - Dark mode flag.
 * @param onSurfaceClick - Called with the hit surface when the user clicks.
 */
const ToothCanvas = ({ fdi, state, isDark, onSurfaceClick }: ToothCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext('2d')

    if (!ctx) return

    ctx.save()

    ctx.scale(dpr, dpr)

    drawTooth({ ctx, state, isDark })

    ctx.restore()
  }, [state, isDark, dpr])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current

      if (!canvas) return

      const rect = canvas.getBoundingClientRect()

      const x = (e.clientX - rect.left) * (S / rect.width)

      const y = (e.clientY - rect.top) * (S / rect.height)

      const surface = hitTestSurface(x, y)

      if (surface) onSurfaceClick(surface)
    },
    [onSurfaceClick]
  )

  const describedState = (): string => {
    const parts: string[] = []

    if (state.mark) parts.push(state.mark)

    const surfaceMarks = (Object.entries(state.surfaces) as Array<[Surface, MarkType | null]>)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}:${v}`)

    parts.push(...surfaceMarks)

    return parts.length ? parts.join(', ') : 'sano'
  }

  return (
    <canvas
      ref={canvasRef}
      width={S * dpr}
      height={S * dpr}
      style={{ width: S, height: S }}
      role="img"
      aria-label={`Diente ${fdi} — ${describedState()}`}
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={handleClick}
    />
  )
}

export default ToothCanvas
