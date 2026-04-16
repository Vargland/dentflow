import type { OuterSurface } from './tooth-geometry'
import { CANVAS_SIZE, CENTER_SQUARE, SURFACE_QUADS, TOOL_COLORS } from './tooth-geometry'
import type { MarkType, OdontogramV2State, Surface, ToothState } from './types'
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
} from './use-odontogram-state'

// ── Internal drawing constants ────────────────────────────────────────────────

const S = CANVAS_SIZE

const STROKE = '#374151'

const SW = 0.8

interface Pt {
  x: number
  y: number
}

const markColor = (m: MarkType | null): string => (m ? TOOL_COLORS[m] : '#ffffff')

const drawQuadPath = (ctx: CanvasRenderingContext2D, q: readonly [Pt, Pt, Pt, Pt]) => {
  ctx.beginPath()

  ctx.moveTo(q[0].x, q[0].y)

  ctx.lineTo(q[1].x, q[1].y)

  ctx.lineTo(q[2].x, q[2].y)

  ctx.lineTo(q[3].x, q[3].y)

  ctx.closePath()
}

const drawSingleTooth = (ctx: CanvasRenderingContext2D, state: ToothState) => {
  const { x: cx, y: cy, w: cw, h: ch } = CENTER_SQUARE

  ctx.strokeStyle = STROKE

  ctx.lineWidth = SW

  const surfaceKeys: OuterSurface[] = ['V', 'P', 'M', 'D']

  surfaceKeys.forEach(key => {
    drawQuadPath(ctx, SURFACE_QUADS[key])

    ctx.fillStyle = markColor(state.surfaces[key])

    ctx.fill()

    ctx.stroke()
  })

  ctx.fillStyle = markColor(state.surfaces.O)

  ctx.fillRect(cx, cy, cw, ch)

  ctx.strokeRect(cx, cy, cw, ch)

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

// ── Layout constants ──────────────────────────────────────────────────────────

const GAP = 4

const ROW_LABEL_H = 14

const SECTION_GAP = 24

const PADDING = 16

/**
 * Exports the full odontogram as a PNG by rendering all teeth onto an
 * off-screen canvas and triggering a browser download.
 *
 * @param state     - Current full odontogram state.
 * @param patientId - Used in the downloaded filename.
 */
export const exportToPNG = (state: OdontogramV2State, patientId: string): void => {
  const rows: Array<{ label: string; teeth: number[] }> = [
    { label: 'Superior permanente', teeth: PERMANENT_UPPER },
    { label: 'Inferior permanente', teeth: PERMANENT_LOWER },
    { label: 'Superior temporal', teeth: TEMPORARY_UPPER },
    { label: 'Inferior temporal', teeth: TEMPORARY_LOWER },
  ]

  const maxTeethInRow = Math.max(...rows.map(r => r.teeth.length))

  const canvasW = PADDING * 2 + maxTeethInRow * (S + GAP)

  const canvasH =
    PADDING * 2 + rows.length * (ROW_LABEL_H + S) + (rows.length - 1) * GAP + SECTION_GAP

  const offscreen = document.createElement('canvas')

  offscreen.width = canvasW

  offscreen.height = canvasH

  const ctx = offscreen.getContext('2d')

  if (!ctx) return

  ctx.fillStyle = '#ffffff'

  ctx.fillRect(0, 0, canvasW, canvasH)

  ctx.font = '10px monospace'

  ctx.fillStyle = '#6b7280'

  ctx.textBaseline = 'middle'

  let y = PADDING

  rows.forEach((row, rowIdx) => {
    if (rowIdx === 2) y += SECTION_GAP

    ctx.fillStyle = '#6b7280'

    ctx.fillText(row.label, PADDING, y + ROW_LABEL_H / 2)

    y += ROW_LABEL_H

    let x = PADDING

    row.teeth.forEach(fdi => {
      const blankSurfaces: Record<Surface, MarkType | null> = {
        V: null,
        P: null,
        M: null,
        D: null,
        O: null,
      }

      const toothState: ToothState = state[fdi] ?? { mark: null, surfaces: blankSurfaces }

      ctx.save()

      ctx.translate(x, y)

      drawSingleTooth(ctx, toothState)

      ctx.fillStyle = '#9ca3af'

      ctx.font = '7px monospace'

      ctx.textAlign = 'center'

      ctx.fillText(String(fdi), S / 2, S + 6)

      ctx.restore()

      x += S + GAP
    })

    y += S + GAP
  })

  offscreen.toBlob(blob => {
    if (!blob) return

    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')

    a.href = url

    a.download = `odontogram_${patientId}.png`

    a.click()

    URL.revokeObjectURL(url)
  })
}
