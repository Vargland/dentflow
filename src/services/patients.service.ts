import type {
  CreatePatientInput,
  Patient,
  PatientListItem,
  UpdatePatientInput,
} from '@/typing/services/patient.interface'
import { apiClient } from '@/services/api-client'

/**
 * Fetches the paginated list of patients for the authenticated doctor.
 *
 * @param token - JWT Bearer token.
 * @param query - Optional search query (name, last name, or DNI).
 * @returns Array of patient list items.
 */
export const getPatients = (token: string, query?: string): Promise<PatientListItem[]> => {
  const path = query ? `/patients?q=${encodeURIComponent(query)}` : '/patients'

  return apiClient.get<PatientListItem[]>(path, token)
}

/**
 * Fetches a single patient by ID, including their evolutions.
 *
 * @param token - JWT Bearer token.
 * @param id    - Patient UUID.
 * @returns Full patient record.
 */
export const getPatient = (token: string, id: string): Promise<Patient> =>
  apiClient.get<Patient>(`/patients/${id}`, token)

/**
 * Creates a new patient for the authenticated doctor.
 *
 * @param token - JWT Bearer token.
 * @param input - Patient data to create.
 * @returns The newly created patient record.
 */
export const createPatient = (token: string, input: CreatePatientInput): Promise<Patient> =>
  apiClient.post<Patient>('/patients', token, input)

/**
 * Updates an existing patient's data.
 *
 * @param token - JWT Bearer token.
 * @param id    - Patient UUID.
 * @param input - Partial patient data to update.
 * @returns The updated patient record.
 */
export const updatePatient = (
  token: string,
  id: string,
  input: UpdatePatientInput
): Promise<Patient> => apiClient.put<Patient>(`/patients/${id}`, token, input)

/**
 * Deletes a patient and all related records.
 *
 * @param token - JWT Bearer token.
 * @param id    - Patient UUID.
 */
export const deletePatient = (token: string, id: string): Promise<void> =>
  apiClient.delete<void>(`/patients/${id}`, token)
