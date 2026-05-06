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
  /** Set by the API when the record has been edited after creation. */
  updatedAt?: string
}

/** Request body for POST /patients/:id/evolutions. */
export interface CreateEvolutionInput {
  descripcion: string
  dientes?: number[]
  importe?: number
  pagado?: boolean
  /** Optional ISO date string (YYYY-MM-DD). Defaults to today server-side. */
  fecha?: string
}

/** Request body for PUT /patients/:id/evolutions/:eid. */
export interface UpdateEvolutionInput {
  descripcion?: string
  dientes?: number[]
  importe?: number
  pagado?: boolean
  /** Optional ISO date string (YYYY-MM-DD). */
  fecha?: string
}
