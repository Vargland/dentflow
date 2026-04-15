import type { CreatePatientInput,Patient } from '@/typing/services/patient.interface'

/**
 * Props for the PatientForm component.
 * Supports both create (no patient) and edit (with patient) modes.
 * `onSubmit` always receives a `CreatePatientInput`; the caller decides
 * whether to treat it as a create or partial update.
 */
export type PatientFormProps = {
  /** Patient to pre-fill the form with (edit mode). Omit for create mode. */
  patient?: Patient
  /** Called on successful form submission with the collected input data. */
  onSubmit: (data: CreatePatientInput) => Promise<void>
  /** Whether the form submission is in flight. */
  pending?: boolean
}

/**
 * Props for the PatientListItem component.
 */
export type PatientCardProps = {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  obraSocial: string | null
  evolutionCount: number
}
