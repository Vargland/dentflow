'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle, ExternalLink, Loader2, Unlink } from 'lucide-react'

import type { UserSettings } from '@/typing/services/appointment.interface'
import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { disconnectCalendar, updateSettings } from '@/services/appointments.service'

/** Common IANA timezones displayed in the selector. */
const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Mendoza',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
]

interface SettingsFormProps {
  /** Initial settings loaded server-side. */
  initialSettings: UserSettings
  /** Doctor ID for the Google Calendar OAuth redirect. */
  doctorId: string
  /** API base URL for the Google Calendar OAuth redirect. */
  apiBase: string
}

/**
 * Settings form — timezone selector + Google Calendar connection.
 */
export const SettingsForm = ({ initialSettings, doctorId, apiBase }: SettingsFormProps) => {
  const { data: session } = useSession()

  const { t } = useTranslation()

  const [timezone, setTimezone] = useState(initialSettings.timezone)

  const [calendarConnected, setCalendarConnected] = useState(initialSettings.calendarConnected)

  const [calendarEmail, setCalendarEmail] = useState(initialSettings.calendarEmail ?? '')

  const [saved, setSaved] = useState(false)

  const [isPending, startTransition] = useTransition()

  const [isDisconnecting, startDisconnecting] = useTransition()

  const handleSave = () => {
    if (!session?.accessToken) return

    startTransition(async () => {
      await updateSettings(session.accessToken as string, { timezone })

      setSaved(true)

      setTimeout(() => setSaved(false), 3000)
    })
  }

  const handleDisconnect = () => {
    if (!session?.accessToken) return

    startDisconnecting(async () => {
      await disconnectCalendar(session.accessToken as string)

      setCalendarConnected(false)

      setCalendarEmail('')
    })
  }

  const calendarOAuthUrl = `${apiBase.replace('/api/v1', '')}/auth/google/calendar?doctor_id=${doctorId}`

  return (
    <div className="space-y-8 max-w-lg">
      {/* Timezone */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">{t('settings.timezone')}</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">{t('settings.timezone')}</Label>
          <Select value={timezone} onValueChange={v => setTimezone(v ?? timezone)}>
            <SelectTrigger id="timezone" className="w-full">
              <SelectValue placeholder={t('settings.timezonePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              t('settings.save')
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {t('settings.saved')}
            </span>
          )}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">{t('settings.calendar.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.calendar.description')}</p>
        </div>

        {calendarConnected ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="h-4 w-4" />
              {t('settings.calendar.connected', { email: calendarEmail })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {t('settings.calendar.disconnecting')}
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-3 w-3" />
                  {t('settings.calendar.disconnect')}
                </>
              )}
            </Button>
          </div>
        ) : (
          <a href={calendarOAuthUrl} target="_self">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t('settings.calendar.connect')}
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}
