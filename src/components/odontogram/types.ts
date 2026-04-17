/**
 * Local types and colour constants for the Odontogram component.
 * Distinct from the API-level types in @/typing/services/odontogram.interface
 * to support richer per-surface and whole-tooth marks.
 */

/** Five clickable surfaces on each tooth (FDI convention). */
export type Surface = 'V' | 'P' | 'M' | 'D' | 'O'

/**
 * Clinical mark types supported by the odontogram.
 * Surface-level tools: caries | restauracion
 * Whole-tooth tools:   corona | extraccion | endodoncia | ausente
 */
export type MarkType =
  | 'caries'
  | 'restauracion'
  | 'corona'
  | 'extraccion'
  | 'endodoncia'
  | 'ausente'

/** Per-tooth state stored in the odontogram. */
export interface ToothState {
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
export interface OdontogramMetrics {
  caries: number
  restauraciones: number
  ausentes: number
  sanos: number
}

/** Colour assigned to each clinical mark tool. */
export const TOOL_COLORS: Record<MarkType, string> = {
  caries: '#E24B4A',
  restauracion: '#185FA5',
  corona: '#BA7517',
  extraccion: '#5F5E5A',
  endodoncia: '#639922',
  ausente: '#B4B2A9',
}
