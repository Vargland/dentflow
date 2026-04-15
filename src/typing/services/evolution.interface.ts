/**
 * Evolution (clinical record) service interfaces — shapes exchanged with the Go API.
 */

/** Single clinical evolution record returned by the Go API. */
export interface Evolution {
  id: string
  patientId: string
  descripcion: string
  dientes: number[]
  importe: number | null
  pagado: boolean
  fecha: string
  createdAt: string
}

/** Request body for POST /patients/:id/evolutions. */
export interface CreateEvolutionInput {
  descripcion: string
  dientes?: number[]
  importe?: number
  pagado?: boolean
}

/** Request body for PUT /patients/:id/evolutions/:eid. */
export type UpdateEvolutionInput = Partial<CreateEvolutionInput>
