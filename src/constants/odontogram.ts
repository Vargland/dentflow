/**
 * Odontogram domain constants.
 * Centralised location for dental-jargon terms, colour palette and FDI tooth
 * layouts shared across the odontogram feature.
 *
 * Term mapping (English ↔ dental jargon in Spanish):
 *  - cavity               → caries
 *  - filled               → restauración
 *  - crown                → corona
 *  - extraction           → extracción indicada
 *  - rootcanal            → endodoncia
 *  - extracted            → ausente / extraído
 *  - fixed_prosthesis     → prótesis fija
 *  - removable_prosthesis → prótesis removible
 *
 * These values match the API contract in
 * `@/typing/services/odontogram.interface` — do NOT translate to Spanish.
 */

import type { AnnotationScheme, MarkType } from '@/typing/components/odontogram.types'

// ── Clinical marks ────────────────────────────────────────────────────────────

/**
 * Canonical clinical mark identifiers (dental jargon → API contract).
 * Use `MARK.CAVITY` instead of the bare string `'cavity'` anywhere in the app
 * so typos become compile-time errors and there is a single source of truth.
 */
export const MARK = {
  CAVITY: 'cavity',
  FILLED: 'filled',
  CROWN: 'crown',
  EXTRACTION: 'extraction',
  ROOTCANAL: 'rootcanal',
  EXTRACTED: 'extracted',
  FIXED_PROSTHESIS: 'fixed_prosthesis',
  REMOVABLE_PROSTHESIS: 'removable_prosthesis',
} as const satisfies Record<string, MarkType>

/** Annotation scheme identifiers. */
export const ANNOTATION_SCHEME = {
  INTERNATIONAL: 'international',
  ARGENTINA: 'argentina',
} as const satisfies Record<string, AnnotationScheme>

// ── Per-scheme configuration ──────────────────────────────────────────────────

/** Mark tools available in each scheme, in toolbar order. */
export const SCHEME_MARK_TYPES: Record<AnnotationScheme, readonly MarkType[]> = {
  international: [
    MARK.CAVITY,
    MARK.FILLED,
    MARK.CROWN,
    MARK.EXTRACTION,
    MARK.ROOTCANAL,
    MARK.EXTRACTED,
  ],
  argentina: [
    MARK.CAVITY,
    MARK.FILLED,
    MARK.CROWN,
    MARK.EXTRACTION,
    MARK.ROOTCANAL,
    MARK.EXTRACTED,
    MARK.FIXED_PROSTHESIS,
    MARK.REMOVABLE_PROSTHESIS,
  ],
}

/** Marks that annotate the entire tooth rather than a single surface (all schemes). */
export const WHOLE_TOOTH_MARKS: readonly MarkType[] = [
  MARK.CROWN,
  MARK.EXTRACTION,
  MARK.ROOTCANAL,
  MARK.EXTRACTED,
  MARK.FIXED_PROSTHESIS,
  MARK.REMOVABLE_PROSTHESIS,
] as const

/** Marks that require selecting 2+ teeth before applying. */
export const MULTI_TOOTH_MARKS: readonly MarkType[] = [
  MARK.FIXED_PROSTHESIS,
  MARK.REMOVABLE_PROSTHESIS,
] as const

/** Colour assigned to each clinical mark tool per scheme (hex, used for SVG fills). */
export const SCHEME_TOOL_COLORS: Record<AnnotationScheme, Record<MarkType, string>> = {
  international: {
    [MARK.CAVITY]: '#E24B4A',
    [MARK.FILLED]: '#185FA5',
    [MARK.CROWN]: '#BA7517',
    [MARK.EXTRACTION]: '#5F5E5A',
    [MARK.ROOTCANAL]: '#639922',
    [MARK.EXTRACTED]: '#B4B2A9',
    [MARK.FIXED_PROSTHESIS]: '#E24B4A',
    [MARK.REMOVABLE_PROSTHESIS]: '#E24B4A',
  },
  argentina: {
    [MARK.CAVITY]: '#185FA5',
    [MARK.FILLED]: '#E24B4A',
    [MARK.CROWN]: '#E24B4A',
    [MARK.EXTRACTION]: '#185FA5',
    [MARK.ROOTCANAL]: '#E24B4A',
    [MARK.EXTRACTED]: '#E24B4A',
    [MARK.FIXED_PROSTHESIS]: '#E24B4A',
    [MARK.REMOVABLE_PROSTHESIS]: '#E24B4A',
  },
}

/**
 * Convenience accessor — returns the tool colors for the active scheme.
 * Kept for backwards-compat with code that previously used `TOOL_COLORS` directly.
 */
export const TOOL_COLORS = SCHEME_TOOL_COLORS.international

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
