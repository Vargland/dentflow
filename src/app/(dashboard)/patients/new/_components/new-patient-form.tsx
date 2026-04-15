'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { CreatePatientInput } from '@/typing/services/patient.interface'
import { createPatient } from '@/services/patients.service'

import PatientForm from '../../_components/patient-form'

/**
 * Client-side wrapper that calls the patients service to create a patient.
 *
 * @param token - JWT Bearer token forwarded from the server session.
 */
const NewPatientForm = ({ token }: { token: string }) => {
  const router = useRouter()

  const [pending, setPending] = useState(false)

  const handleSubmit = async (data: CreatePatientInput) => {
    setPending(true)

    try {
      const patient = await createPatient(token, data)

      router.push(`/patients/${patient.id}`)
    } catch {
      toast.error('Failed to create patient. Please try again.')

      setPending(false)
    }
  }

  return <PatientForm onSubmit={handleSubmit} pending={pending} />
}

export default NewPatientForm
