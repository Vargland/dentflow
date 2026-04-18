import { auth } from '@/lib/auth'
import { getSettings, listAppointments } from '@/services/appointments.service'

import DashboardShell from './_components/dashboard-shell'

/**
 * Dashboard home page — shown immediately after login.
 * Server-fetches today's appointments and the doctor's timezone,
 * then hands them to the client shell.
 */
export default async function DashboardPage() {
  const session = await auth()

  const token = (session?.accessToken as string) ?? ''

  // Fetch settings (timezone) and today's appointments in parallel
  const [settings, appointments] = await Promise.all([
    getSettings(token).catch(() => ({
      timezone: 'America/Argentina/Buenos_Aires',
      calendarConnected: false,
      doctorName: '',
      clinicAddress: '',
      clinicPhone: '',
      emailLanguage: 'es',
    })),
    (() => {
      // Build a UTC range for the entire local calendar day
      const now = new Date()

      // Start of today in UTC (midnight local ≈ today 00:00 in the server's TZ)
      const startOfDay = new Date(now)

      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(now)

      endOfDay.setHours(23, 59, 59, 999)

      return listAppointments(token, startOfDay.toISOString(), endOfDay.toISOString()).catch(
        () => []
      )
    })(),
  ])

  // Sort by start_time ascending
  const sorted = [...appointments].sort(
    (first, second) => new Date(first.start_time).getTime() - new Date(second.start_time).getTime()
  )

  return <DashboardShell initialAppointments={sorted} timezone={settings.timezone} />
}
