import type {
  CreateEvolutionInput,
  Evolution,
  UpdateEvolutionInput,
} from '@/typing/services/evolution.interface'
import { apiClient } from '@/services/api-client'

/**
 * Fetches all evolutions (clinical records) for a patient.
 *
 * @param token     - JWT Bearer token.
 * @param patientId - Patient UUID.
 * @returns Array of evolution records, newest first.
 */
export const getEvolutions = (token: string, patientId: string): Promise<Evolution[]> =>
  apiClient.get<Evolution[]>(`/patients/${patientId}/evolutions`, token)

/**
 * Creates a new evolution record for a patient.
 *
 * @param token     - JWT Bearer token.
 * @param patientId - Patient UUID.
 * @param input     - Evolution data to create.
 * @returns The newly created evolution record.
 */
export const createEvolution = (
  token: string,
  patientId: string,
  input: CreateEvolutionInput
): Promise<Evolution> => apiClient.post<Evolution>(`/patients/${patientId}/evolutions`, token, input)

/** Parameters for {@link updateEvolution}. */
export interface UpdateEvolutionParams {
  token: string
  patientId: string
  evolutionId: string
  input: UpdateEvolutionInput
}

/**
 * Updates an existing evolution record.
 *
 * @param params - Token, patient ID, evolution ID and partial update data.
 * @returns The updated evolution record.
 */
export const updateEvolution = ({
  token,
  patientId,
  evolutionId,
  input,
}: UpdateEvolutionParams): Promise<Evolution> =>
  apiClient.put<Evolution>(`/patients/${patientId}/evolutions/${evolutionId}`, token, input)

/**
 * Deletes an evolution record.
 *
 * @param token       - JWT Bearer token.
 * @param patientId   - Patient UUID.
 * @param evolutionId - Evolution UUID.
 */
export const deleteEvolution = (
  token: string,
  patientId: string,
  evolutionId: string
): Promise<void> =>
  apiClient.delete<void>(`/patients/${patientId}/evolutions/${evolutionId}`, token)
