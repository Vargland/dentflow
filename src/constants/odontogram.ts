/**
 * Odontogram domain constants.
 * Centralised location for dental-jargon terms, colour palette and FDI tooth
 * layouts shared across the odontogram feature.
 *
 * Term mapping (English ↔ dental jargon in Spanish):
 *  - cavity       → caries
 *  - filled       → restauración
 *  - crown        → corona
 *  - extraction   → extracción indicada
 *  - rootcanal    → endodoncia
 *  - extracted    → ausente / extraído
 *
 * These values match the API contract in
 * `@/typing/services/odontogram.interface` — do NOT translate to Spanish.
 */

import type { MarkType } from '@/typing/components/odontogram.types'

// ── Clinical marks ────────────────────────────────────────────────────────────

/** All clinical mark tools available in the odontogram, in toolbar order. */
export const MARK_TYPES: readonly MarkType[] = [
  'cavity',
  'filled',
  'crown',
  'extraction',
  'rootcanal',
  'extracted',
] as const

/** Marks that annotate the entire tooth rather than a single surface. */
export const WHOLE_TOOTH_MARKS: readonly MarkType[] = [
  'crown',
  'extraction',
  'rootcanal',
  'extracted',
] as const

/** Colour assigned to each clinical mark tool (hex, used for SVG fills). */
export const TOOL_COLORS: Record<MarkType, string> = {
  cavity: '#E24B4A',
  filled: '#185FA5',
  crown: '#BA7517',
  extraction: '#5F5E5A',
  rootcanal: '#639922',
  extracted: '#B4B2A9',
}

// ── Metrics colours ───────────────────────────────────────────────────────────

/** Colour for the "healthy" metric counter (no clinical mark). */
export const HEALTHY_COLOR = '#16a34a'

// ── FDI tooth layouts ─────────────────────────────────────────────────────────

/** Upper permanent teeth (right → left, FDI). */
export const PERMANENT_UPPER = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const

/** Lower permanent teeth (right → left, FDI). */
export const PERMANENT_LOWER = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const

/** Upper temporary teeth (right → left, FDI). */
export const TEMPORARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const

/** Lower temporary teeth (right → left, FDI). */
export const TEMPORARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const

/** All FDI tooth numbers tracked by the odontogram. */
export const ALL_TEETH: readonly number[] = [
  ...PERMANENT_UPPER,
  ...PERMANENT_LOWER,
  ...TEMPORARY_UPPER,
  ...TEMPORARY_LOWER,
]
