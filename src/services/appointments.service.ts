import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  UpdateSettingsInput,
  UserSettings,
} from '@/typing/services/appointment.interface'
import { apiClient } from '@/services/api-client'

/**
 * Lists appointments for the authenticated doctor within a UTC time range.
 *
 * @param token - JWT Bearer token.
 * @param start - Range start as ISO 8601 UTC string.
 * @param end   - Range end as ISO 8601 UTC string.
 */
export const listAppointments = (
  token: string,
  start: string,
  end: string
): Promise<Appointment[]> =>
  apiClient.get<Appointment[]>(
    `/appointments?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    token
  )

/**
 * Creates a new appointment.
 *
 * @param token - JWT Bearer token.
 * @param input - Appointment data.
 */
export const createAppointment = (
  token: string,
  input: CreateAppointmentInput
): Promise<Appointment> => apiClient.post<Appointment>('/appointments', token, input)

/**
 * Updates an existing appointment.
 *
 * @param token - JWT Bearer token.
 * @param id    - Appointment UUID.
 * @param input - Updated appointment data.
 */
export const updateAppointment = (
  token: string,
  id: string,
  input: UpdateAppointmentInput
): Promise<Appointment> => apiClient.put<Appointment>(`/appointments/${id}`, token, input)

/**
 * Deletes an appointment.
 *
 * @param token - JWT Bearer token.
 * @param id    - Appointment UUID.
 */
export const deleteAppointment = (token: string, id: string): Promise<void> =>
  apiClient.delete<void>(`/appointments/${id}`, token)

/**
 * Fetches the current user settings (timezone + calendar connection).
 *
 * @param token - JWT Bearer token.
 */
export const getSettings = (token: string): Promise<UserSettings> =>
  apiClient.get<UserSettings>('/settings', token)

/**
 * Updates user settings (timezone).
 *
 * @param token - JWT Bearer token.
 * @param input - Settings to update.
 */
export const updateSettings = (token: string, input: UpdateSettingsInput): Promise<UserSettings> =>
  apiClient.put<UserSettings>('/settings', token, input)

/**
 * Disconnects the Google Calendar integration.
 *
 * @param token - JWT Bearer token.
 */
export const disconnectCalendar = (token: string): Promise<void> =>
  apiClient.delete<void>('/settings/calendar', token)

/**
 * Sends (or resends) the appointment invitation email to the linked patient.
 *
 * @param token - JWT Bearer token.
 * @param id    - Appointment UUID.
 */
export const sendAppointmentInvite = (token: string, id: string): Promise<{ sent_to: string }> =>
  apiClient.post<{ sent_to: string }>(`/appointments/${id}/send-invite`, token, {})
