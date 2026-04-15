/**
 * Odontogram service interfaces — shapes exchanged with the Go API.
 */

/** Valid tooth surface identifiers (FDI standard). */
export type Surface = 'M' | 'D' | 'O' | 'V' | 'L'

/** Valid surface state values. */
export type SurfaceState =
  | 'healthy'
  | 'cavity'
  | 'filled'
  | 'extraction'
  | 'extracted'
  | 'crown'
  | 'implant'
  | 'rootcanal'
  | 'fracture'

/** Per-tooth surface data. Keys are surfaces, values are states. */
export type ToothData = Partial<Record<Surface, SurfaceState>>

/**
 * Full odontogram state.
 * Keys are FDI tooth numbers (11–48 for adult).
 */
export type OdontogramState = Record<number, ToothData>

/** Response from GET /patients/:id/odontogram. */
export interface OdontogramResponse {
  patientId: string
  data: Record<string, unknown> | null
  updatedAt: string | null
}

/** Request body for PUT /patients/:id/odontogram. */
export interface SaveOdontogramInput {
  data: Record<string, unknown>
}
