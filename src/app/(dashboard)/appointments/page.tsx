import { Calendar } from 'lucide-react'

import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'

/** Appointments page — coming soon placeholder. */
export default async function AppointmentsPage() {
  const lang = await getLang()

  const { t } = await getTranslation(lang)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('appointments.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center">
          <Calendar className="h-8 w-8 text-blue-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">{t('appointments.comingSoon')}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{t('appointments.comingSoonHint')}</p>
        </div>
      </div>
    </div>
  )
}
