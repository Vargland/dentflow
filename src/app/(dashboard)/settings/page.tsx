import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'
import { getSettings } from '@/services/appointments.service'

import { SettingsForm } from './_components/settings-form'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

/** Settings page — timezone and Google Calendar integration. */
export default async function SettingsPage() {
  const session = await auth()

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  const token = session?.accessToken as string

  const doctorId = session?.user?.id as string

  const settings = await getSettings(token).catch(() => ({
    timezone: 'America/Argentina/Buenos_Aires',
    calendarConnected: false,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <SettingsForm initialSettings={settings} doctorId={doctorId} apiBase={API_BASE} />
    </div>
  )
}
