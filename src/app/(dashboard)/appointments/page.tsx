import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'
import { getSettings } from '@/services/appointments.service'

import { CalendarView } from './_components/calendar-view'

/** Appointments page — full calendar with day/week/month views. */
export default async function AppointmentsPage() {
  const session = await auth()

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  const token = session?.accessToken as string

  const settings = await getSettings(token).catch(() => ({
    timezone: 'America/Argentina/Buenos_Aires',
    calendarConnected: false,
    doctorName: '',
    clinicAddress: '',
    clinicPhone: '',
    emailLanguage: 'es',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('appointments.subtitle')}</p>
      </div>

      <CalendarView settings={settings} />
    </div>
  )
}
