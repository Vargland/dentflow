/**
 * Patient service interfaces — shapes exchanged with the Go API.
 * All field names match the Go API JSON response exactly.
 */

/** Full patient record returned by the Go API. */
export interface Patient {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  fechaNacimiento: string | null
  sexo: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  alergias: string | null
  medicamentos: string | null
  antecedentes: string | null
  obraSocial: string | null
  nroAfiliado: string | null
  notas: string | null
  odontograma: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Patient list item (lighter shape returned by GET /patients). */
export interface PatientListItem {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  obraSocial: string | null
  createdAt: string
  evolutionCount: number
}

/** Request body for POST /patients. */
export interface CreatePatientInput {
  nombre: string
  apellido: string
  dni?: string
  fechaNacimiento?: string
  sexo?: string
  telefono?: string
  email?: string
  direccion?: string
  alergias?: string
  medicamentos?: string
  antecedentes?: string
  obraSocial?: string
  nroAfiliado?: string
  notas?: string
}

/** Request body for PUT /patients/:id (all fields optional). */
export type UpdatePatientInput = Partial<CreatePatientInput>
