import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'

import NewPatientForm from './_components/new-patient-form'

/** Page for creating a new patient. */
export default async function NewPatientPage() {
  const session = await auth()

  const token = session?.accessToken ?? ''

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('patientForm.newTitle')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('patientForm.newSubtitle')}</p>
      </div>
      <NewPatientForm token={token} />
    </div>
  )
}
