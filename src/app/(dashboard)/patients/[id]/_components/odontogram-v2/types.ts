/**
 * Local types for OdontogramV2.
 * These are distinct from the API-level types in @/typing/services/odontogram.interface
 * to allow richer per-surface and whole-tooth marks.
 */

/** Five clickable surfaces on each tooth (FDI convention). */
export type Surface = 'V' | 'P' | 'M' | 'D' | 'O'

/**
 * Clinical mark types supported by the v2 odontogram.
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
export type OdontogramV2State = Record<number, ToothState>

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

/** Colour config entry for a single tool. */
export interface ToolConfig {
  tool: MarkType
  color: string
  labelKey: string
}
