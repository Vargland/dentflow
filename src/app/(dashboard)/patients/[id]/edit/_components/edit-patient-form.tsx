'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { Patient } from '@/typing/services/patient.interface'
import type { CreatePatientInput } from '@/typing/services/patient.interface'
import { useTranslation } from '@/lib/i18n/client'
import { updatePatient } from '@/services/patients.service'

import PatientForm from '../../../_components/patient-form'

/**
 * Client-side wrapper that calls the patients service to update a patient.
 *
 * @param patient - Current patient data to pre-fill the form.
 * @param token   - JWT Bearer token forwarded from the server session.
 */
const EditPatientForm = ({ patient, token }: { patient: Patient; token: string }) => {
  const router = useRouter()

  const { t } = useTranslation()

  const [pending, setPending] = useState(false)

  const handleSubmit = async (data: CreatePatientInput) => {
    setPending(true)

    try {
      await updatePatient(token, patient.id, data)

      router.refresh()

      toast.success(t('patientForm.actions.saved'))
    } catch {
      toast.error('Failed to update patient. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return <PatientForm patient={patient} onSubmit={handleSubmit} pending={pending} />
}

export default EditPatientForm
