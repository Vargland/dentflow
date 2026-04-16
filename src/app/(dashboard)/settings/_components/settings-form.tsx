'use client'

import { useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { CheckCircle, ExternalLink, Loader2, Unlink } from 'lucide-react'

import type { UserSettings } from '@/typing/services/appointment.interface'
import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
 * Settings form — clinic profile, timezone selector, and Google Calendar connection.
 * All fields are saved together with a single Save button.
 */
export const SettingsForm = ({ initialSettings, doctorId, apiBase }: SettingsFormProps) => {
  const { data: session } = useSession()

  const { t } = useTranslation()

  const [timezone, setTimezone] = useState(initialSettings.timezone)

  const [doctorName, setDoctorName] = useState(initialSettings.doctorName ?? '')

  const [clinicAddress, setClinicAddress] = useState(initialSettings.clinicAddress ?? '')

  const [clinicPhone, setClinicPhone] = useState(initialSettings.clinicPhone ?? '')

  const [emailLanguage, setEmailLanguage] = useState(initialSettings.emailLanguage || 'es')

  const [calendarConnected, setCalendarConnected] = useState(initialSettings.calendarConnected)

  const [calendarEmail, setCalendarEmail] = useState(initialSettings.calendarEmail ?? '')

  const [saved, setSaved] = useState(false)

  const [isPending, startTransition] = useTransition()

  const [isDisconnecting, startDisconnecting] = useTransition()

  const handleSave = () => {
    if (!session?.accessToken) return

    startTransition(async () => {
      await updateSettings(session.accessToken as string, {
        timezone,
        doctorName,
        clinicAddress,
        clinicPhone,
        emailLanguage,
      })

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

  const emailLanguageLabel =
    emailLanguage === 'en' ? t('settings.emailLanguageEn') : t('settings.emailLanguageEs')

  return (
    <div className="space-y-8 max-w-lg">
      {/* Clinic profile + Timezone — one card, one Save button */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Clinic profile section */}
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">{t('settings.clinicProfile')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('settings.clinicProfileDescription')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor-name">{t('settings.doctorName')}</Label>
            <Input
              id="doctor-name"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
              placeholder="Dr. Nombre Apellido"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic-address">{t('settings.clinicAddress')}</Label>
            <Input
              id="clinic-address"
              value={clinicAddress}
              onChange={e => setClinicAddress(e.target.value)}
              placeholder="Av. Corrientes 1234, CABA"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic-phone">{t('settings.clinicPhone')}</Label>
            <Input
              id="clinic-phone"
              value={clinicPhone}
              onChange={e => setClinicPhone(e.target.value)}
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-language">{t('settings.emailLanguage')}</Label>
            <Select value={emailLanguage} onValueChange={v => setEmailLanguage(v ?? emailLanguage)}>
              <SelectTrigger id="email-language" className="w-full">
                <SelectValue>{emailLanguageLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">{t('settings.emailLanguageEs')}</SelectItem>
                <SelectItem value="en">{t('settings.emailLanguageEn')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Timezone section */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">{t('settings.timezone')}</h2>

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
        </div>

        {/* Single Save button for all fields */}
        <div className="flex items-center gap-3 pt-2">
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

      {/* Google Calendar — separate card */}
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
