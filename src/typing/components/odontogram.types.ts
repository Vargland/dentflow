import type { OdontogramState } from '@/typing/services/odontogram.interface'

/**
 * Props for the Odontogram component.
 */
export type OdontogramProps = {
  patientId: string
  initialData: OdontogramState | null
  /** JWT Bearer token forwarded from the session. */
  token: string
  /** Annotation scheme from the doctor's settings (defaults to international). */
  initialScheme?: AnnotationScheme
}

// ── Odontogram local types ────────────────────────────────────────────────────

/** Five clickable surfaces on each tooth (FDI convention, V/P/M/D/O). */
export type Surface = 'V' | 'P' | 'M' | 'D' | 'O'

/**
 * Clinical mark types supported by the odontogram UI.
 * Values match the API contract in `@/typing/services/odontogram.interface`.
 *
 * Surface-level marks: `cavity` | `filled`
 * Whole-tooth marks:   `crown` | `extraction` | `rootcanal` | `extracted`
 * Multi-tooth marks (argentina scheme only): `fixed_prosthesis` | `removable_prosthesis`
 */
export type MarkType =
  | 'cavity'
  | 'filled'
  | 'crown'
  | 'extraction'
  | 'rootcanal'
  | 'extracted'
  | 'fixed_prosthesis'
  | 'removable_prosthesis'

/** Annotation scheme selected by the dentist. */
export type AnnotationScheme = 'international' | 'argentina'

/** Per-tooth state stored in the odontogram. */
export type ToothState = {
  /** Whole-tooth annotation drawn over the tooth outline. */
  mark: MarkType | null
  /** Per-surface colour fill. */
  surfaces: Record<Surface, MarkType | null>
}

/** Full odontogram state: FDI number → per-tooth state. */
export type OdontogramData = Record<number, ToothState>

/** Active tool the user is painting with. */
export type ActiveTool = MarkType

/** Which dentition is being shown. */
export type DentitionType = 'permanent' | 'temporary'

/** Aggregated counters shown in the metrics row. */
export type OdontogramMetrics = {
  cavities: number
  fillings: number
  missing: number
  healthy: number
}
