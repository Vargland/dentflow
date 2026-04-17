'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import type { CreatePatientInput } from '@/typing/services/patient.interface'
import { getAppointment, updateAppointment } from '@/services/appointments.service'
import { createPatient } from '@/services/patients.service'

import PatientForm from '../../_components/patient-form'

interface NewPatientFormProps {
  /** JWT Bearer token forwarded from the server session. */
  token: string
  /**
   * When set, the newly created patient is automatically assigned to this
   * appointment and the user is redirected back to the dashboard.
   */
  appointmentId: string | null
}

/**
 * Client-side wrapper that calls the patients service to create a patient.
 * If appointmentId is provided, also patches the appointment with the new
 * patient_id and redirects to /dashboard instead of the patient detail page.
 *
 * @param token         - JWT Bearer token.
 * @param appointmentId - Optional appointment to assign the new patient to.
 */
const NewPatientForm = ({ token, appointmentId }: NewPatientFormProps) => {
  const router = useRouter()

  const { data: session } = useSession()

  const [pending, setPending] = useState(false)

  const handleSubmit = async (data: CreatePatientInput) => {
    setPending(true)

    const jwt = (session?.accessToken as string) || token

    try {
      const patient = await createPatient(jwt, data)

      if (appointmentId) {
        try {
          const appt = await getAppointment(jwt, appointmentId)

          await updateAppointment(jwt, appointmentId, {
            patient_id: patient.id,
            title: appt.title,
            start_time: appt.start_time,
            end_time: appt.end_time,
            duration_minutes: appt.duration_minutes,
            status: appt.status,
            notes: appt.notes ?? null,
            allow_overlap: true,
          })

          toast.success('Paciente asignado al turno.')
        } catch {
          toast.error('Paciente creado pero no se pudo asignar al turno.')
        }

        router.push('/dashboard')

        return
      }

      router.push(`/patients/${patient.id}`)
    } catch {
      toast.error('Failed to create patient. Please try again.')

      setPending(false)
    }
  }

  return <PatientForm onSubmit={handleSubmit} pending={pending} />
}

export default NewPatientForm
