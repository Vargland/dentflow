import type { OdontogramState } from '@/typing/services/odontogram.interface'

/**
 * Props for the Odontogram component.
 */
export type OdontogramProps = {
  patientId: string
  initialData: OdontogramState | null
  /** JWT Bearer token forwarded from the session. */
  token: string
}
