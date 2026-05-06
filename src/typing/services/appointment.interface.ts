/** API shape for an appointment returned by GET /appointments. */
export interface Appointment {
  id: string
  doctor_id: string
  patient_id: string | null
  patient_name?: string | null
  google_event_id?: string | null
  title: string
  start_time: string // ISO 8601 UTC
  end_time: string // ISO 8601 UTC
  duration_minutes: number
  status: string
  notes?: string | null
  created_at: string
  updated_at: string
}

/** Input for creating a new appointment. */
export interface CreateAppointmentInput {
  patient_id?: string | null
  title: string
  start_time: string // RFC3339 UTC
  end_time: string // RFC3339 UTC
  duration_minutes: number
  status: string
  notes?: string | null
  /** When true, skips the overlap check — used for emergency over-bookings. */
  allow_overlap?: boolean
}

/** Input for updating an existing appointment. */
export type UpdateAppointmentInput = CreateAppointmentInput

/** Settings returned by GET /settings. */
export interface UserSettings {
  timezone: string
  calendarConnected: boolean
  calendarEmail?: string
  doctorName: string
  clinicAddress: string
  clinicPhone: string
  emailLanguage: string
  annotationScheme: string
}

/** Input for PUT /settings. */
export interface UpdateSettingsInput {
  timezone: string
  doctorName: string
  clinicAddress: string
  clinicPhone: string
  emailLanguage: string
  annotationScheme: string
}
