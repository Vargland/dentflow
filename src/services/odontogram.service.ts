import type { OdontogramResponse, SaveOdontogramInput } from '@/typing/services/odontogram.interface'
import { apiClient } from '@/services/api-client'

/**
 * Fetches the current odontogram for a patient.
 *
 * @param token     - JWT Bearer token.
 * @param patientId - Patient UUID.
 * @returns Odontogram response with current state.
 */
export const getOdontogram = (token: string, patientId: string): Promise<OdontogramResponse> =>
  apiClient.get<OdontogramResponse>(`/patients/${patientId}/odontogram`, token)

/**
 * Saves the adult odontogram for a patient (full replace).
 *
 * @param token     - JWT Bearer token.
 * @param patientId - Patient UUID.
 * @param input     - Odontogram data to persist.
 * @returns Updated odontogram response.
 */
export const saveOdontogram = (
  token: string,
  patientId: string,
  input: SaveOdontogramInput
): Promise<OdontogramResponse> =>
  apiClient.put<OdontogramResponse>(`/patients/${patientId}/odontogram`, token, input)
