/**
 * Pure geometric utilities and colour constants for the odontogram canvas.
 * Kept in a separate module so that tooth-canvas.tsx only exports a component
 * (required for React Fast Refresh).
 */

import type { MarkType, Surface } from './types'

// ── Colour constants ──────────────────────────────────────────────────────────

/** Colour assigned to each clinical mark tool. */
export const TOOL_COLORS: Record<MarkType, string> = {
  caries: '#E24B4A',
  restauracion: '#185FA5',
  corona: '#BA7517',
  extraccion: '#5F5E5A',
  endodoncia: '#639922',
  ausente: '#B4B2A9',
}

// ── Geometry ──────────────────────────────────────────────────────────────────

/** A 2-D point. */
export interface Pt {
  x: number
  y: number
}

/** Three vertices that define a triangle. */
interface Triangle {
  a: Pt
  b: Pt
  c: Pt
}

/** Cross-product sign used in triangle winding tests. */
const crossSign = (p1: Pt, p2: Pt, p3: Pt): number =>
  (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y)

/**
 * Returns true when point p lies inside (or on the edge of) the given triangle.
 *
 * @param p   - The point to test.
 * @param tri - Triangle vertices.
 */
export const pointInTriangle = (p: Pt, tri: Triangle): boolean => {
  const d1 = crossSign(p, tri.a, tri.b)

  const d2 = crossSign(p, tri.b, tri.c)

  const d3 = crossSign(p, tri.c, tri.a)

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0

  const hasPos = d1 > 0 || d2 > 0 || d3 > 0

  return !(hasNeg && hasPos)
}

/**
 * Returns true when point p lies inside (or on the edge of) an axis-aligned rectangle.
 *
 * @param p    - The point to test.
 * @param rect - Rectangle as { x, y, w, h }.
 */
export const pointInRect = (p: Pt, rect: { x: number; y: number; w: number; h: number }): boolean =>
  p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h

/** A quadrilateral defined by four vertices in order. */
type Quad = [Pt, Pt, Pt, Pt]

/**
 * Returns true when point p lies inside the given quadrilateral.
 * The quad is split into two triangles for the test.
 *
 * @param p - The point to test.
 * @param q - Four vertices of the quadrilateral.
 */
export const pointInQuad = (p: Pt, q: Quad): boolean =>
  pointInTriangle(p, { a: q[0], b: q[1], c: q[2] }) ||
  pointInTriangle(p, { a: q[0], b: q[2], c: q[3] })

// ── Canvas layout (30×30 logical pixels) ─────────────────────────────────────

/** Logical canvas size in CSS pixels. */
export const CANVAS_SIZE = 30

const S = CANVAS_SIZE

/** Inner offset from the canvas edge to the center square. */
const CX = 9

const CY = 9

/** Center square side length. */
export const CENTER_SQUARE = { x: CX, y: CY, w: S - 2 * CX, h: S - 2 * CY }

// Surface quadrilateral vertices
const V_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: S, y: 0 },
  { x: S - CX, y: CY },
  { x: CX, y: CY },
]

const P_QUAD: Quad = [
  { x: CX, y: S - CY },
  { x: S - CX, y: S - CY },
  { x: S, y: S },
  { x: 0, y: S },
]

const M_QUAD: Quad = [
  { x: 0, y: 0 },
  { x: CX, y: CY },
  { x: CX, y: S - CY },
  { x: 0, y: S },
]

const D_QUAD: Quad = [
  { x: S, y: 0 },
  { x: S, y: S },
  { x: S - CX, y: S - CY },
  { x: S - CX, y: CY },
]

/**
 * Given a click position in logical canvas coordinates, returns the hit surface or null.
 *
 * @param x - Click x in logical pixels.
 * @param y - Click y in logical pixels.
 * @returns The hit surface identifier, or null if no surface was hit.
 */
export const hitTestSurface = (x: number, y: number): Surface | null => {
  const p: Pt = { x, y }

  if (pointInRect(p, CENTER_SQUARE)) return 'O'

  if (pointInQuad(p, V_QUAD)) return 'V'

  if (pointInQuad(p, P_QUAD)) return 'P'

  if (pointInQuad(p, M_QUAD)) return 'M'

  if (pointInQuad(p, D_QUAD)) return 'D'

  return null
}

/** The four outer surfaces that map to quadrilateral geometry (excludes O). */
export type OuterSurface = 'V' | 'P' | 'M' | 'D'

/** Exported quad geometry for the drawing layer (tooth-canvas.tsx). */
export const SURFACE_QUADS: Record<OuterSurface, Quad> = {
  V: V_QUAD,
  P: P_QUAD,
  M: M_QUAD,
  D: D_QUAD,
}
