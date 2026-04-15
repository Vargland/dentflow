import { notFound } from 'next/navigation'

import type { PatientPageParams } from '@/typing/pages/patients.types'
import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'
import { ApiError } from '@/services/api-client'
import { getPatient } from '@/services/patients.service'

import EditPatientForm from './_components/edit-patient-form'

/** Page for editing an existing patient. */
export default async function EditPatientPage({ params }: PatientPageParams) {
  const { id } = await params

  const session = await auth()

  const token = session?.accessToken ?? ''

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  let patient

  try {
    patient = await getPatient(token, id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()

    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('patientForm.editTitle')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {patient.apellido}, {patient.nombre}
        </p>
      </div>
      <EditPatientForm patient={patient} token={token} />
    </div>
  )
}
