'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import type { Appointment, UserSettings } from '@/typing/services/appointment.interface'
import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { listAppointments } from '@/services/appointments.service'

import { AppointmentDetailModal } from './appointment-detail-modal'
import { AppointmentForm } from './appointment-form'

type View = 'day' | 'week' | 'month'

/** Status → background/text colour mapping. */
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

// ---------- Helpers ----------

const getRange = (view: View, current: Date): { start: Date; end: Date } => {
  if (view === 'day') {
    const start = new Date(current)

    start.setHours(0, 0, 0, 0)

    const end = new Date(current)

    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  if (view === 'week') {
    const start = startOfWeek(current, { weekStartsOn: 1 })

    const end = endOfWeek(current, { weekStartsOn: 1 })

    return { start, end }
  }

  const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 })

  const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 })

  return { start, end }
}

// ---------- View components ----------

interface ViewProps {
  current: Date
  timezone: string
  appointments: Appointment[]
  onSlotClick: (start: Date) => void
  onApptClick: (appt: Appointment) => void
}

const ApptChip = ({
  appt,
  timezone,
  onClick,
}: {
  appt: Appointment
  timezone: string
  onClick: () => void
}) => {
  const local = toZonedTime(parseISO(appt.start_time), timezone)

  const color = STATUS_COLORS[appt.status] ?? STATUS_COLORS.scheduled

  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-xs px-2 py-1 rounded border truncate ${color} hover:opacity-80 transition-opacity`}
    >
      {format(local, 'HH:mm')} {appt.title}
    </button>
  )
}

const MonthView = ({ current, timezone, appointments, onSlotClick, onApptClick }: ViewProps) => {
  const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 })

  const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 })

  const days: Date[] = []

  let d = start

  while (d <= end) {
    days.push(d)

    d = addDays(d, 1)
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map(name => (
          <div key={name} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {name}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayAppts = appointments.filter(a =>
            isSameDay(toZonedTime(parseISO(a.start_time), timezone), day)
          )

          const isToday = isSameDay(day, new Date())

          const isCurrentMonth = isSameMonth(day, current)

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              }`}
              onClick={() => onSlotClick(day)}
            >
              <div
                className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-blue-600 text-white'
                    : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(a => (
                  <ApptChip
                    key={a.id}
                    appt={a}
                    timezone={timezone}
                    onClick={() => onApptClick(a)}
                  />
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-xs text-gray-500 pl-1">+{dayAppts.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const TimeGrid = ({
  days,
  timezone,
  appointments,
  onSlotClick,
  onApptClick,
}: {
  days: Date[]
  timezone: string
  appointments: Appointment[]
  onSlotClick: (start: Date) => void
  onApptClick: (appt: Appointment) => void
}) => (
  <div className="overflow-auto max-h-[600px]">
    <div className="flex">
      {/* Hour labels */}
      <div className="w-14 shrink-0 border-r border-gray-200">
        <div className="h-10 border-b border-gray-100" />
        {HOURS.map(h => (
          <div
            key={h}
            className="h-14 border-b border-gray-100 pr-2 flex items-start justify-end pt-0.5"
          >
            <span className="text-xs text-gray-400">{h.toString().padStart(2, '0')}:00</span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((day, di) => {
        const dayAppts = appointments.filter(a =>
          isSameDay(toZonedTime(parseISO(a.start_time), timezone), day)
        )

        const isToday = isSameDay(day, new Date())

        return (
          <div
            key={di}
            className="flex-1 min-w-0 border-r border-gray-200 last:border-r-0 relative"
          >
            {/* Day header */}
            <div
              className={`h-10 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center sticky top-0 bg-white dark:bg-gray-900 z-10 ${
                isToday ? 'text-blue-600 font-semibold' : 'text-gray-600'
              }`}
            >
              <span className="text-xs">{format(day, 'EEE d')}</span>
            </div>

            {/* Hour cells */}
            {HOURS.map(h => (
              <div
                key={h}
                className="h-14 border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                onClick={() => {
                  const start = new Date(day)

                  start.setHours(h, 0, 0, 0)

                  onSlotClick(start)
                }}
              />
            ))}

            {/* Appointment overlays */}
            {dayAppts.map(appt => {
              const local = toZonedTime(parseISO(appt.start_time), timezone)

              const localEnd = toZonedTime(parseISO(appt.end_time), timezone)

              const topPct = ((local.getHours() * 60 + local.getMinutes()) / (24 * 60)) * 100

              const heightPct = (appt.duration_minutes / (24 * 60)) * 100

              const color = STATUS_COLORS[appt.status] ?? STATUS_COLORS.scheduled

              return (
                <button
                  key={appt.id}
                  onClick={() => onApptClick(appt)}
                  className={`absolute left-0.5 right-0.5 rounded border text-xs px-1.5 py-0.5 text-left overflow-hidden ${color} hover:opacity-80 transition-opacity z-20`}
                  style={{
                    top: `calc(${topPct}% + 40px)`,
                    height: `${Math.max(heightPct, 2)}%`,
                  }}
                  title={`${format(local, 'HH:mm')}–${format(localEnd, 'HH:mm')} ${appt.title}`}
                >
                  <span className="font-medium block truncate">{appt.title}</span>
                  <span className="text-[10px] opacity-80">{format(local, 'HH:mm')}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  </div>
)

const WeekView = ({ current, timezone, appointments, onSlotClick, onApptClick }: ViewProps) => {
  const start = startOfWeek(current, { weekStartsOn: 1 })

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <TimeGrid
      days={days}
      timezone={timezone}
      appointments={appointments}
      onSlotClick={onSlotClick}
      onApptClick={onApptClick}
    />
  )
}

const DayView = ({ current, timezone, appointments, onSlotClick, onApptClick }: ViewProps) => (
  <TimeGrid
    days={[current]}
    timezone={timezone}
    appointments={appointments}
    onSlotClick={onSlotClick}
    onApptClick={onApptClick}
  />
)

// ---------- Main component ----------

interface CalendarViewProps {
  /** Initial user settings (timezone + calendar connection). */
  settings: UserSettings
}

/**
 * Full calendar UI — day, week, month views with appointment management.
 */
export const CalendarView = ({ settings }: CalendarViewProps) => {
  const { data: session } = useSession()

  const { t } = useTranslation()

  const timezone = settings.timezone

  const [view, setView] = useState<View>('week')

  const [current, setCurrent] = useState(new Date())

  const [appointments, setAppointments] = useState<Appointment[]>([])

  const [loading, setLoading] = useState(false)

  /** Appointment currently shown in the detail modal (click on existing). */
  const [detailing, setDetailing] = useState<Appointment | undefined>(undefined)

  /** Selected appointment for editing via form, or null for creating a new one. */
  const [editing, setEditing] = useState<Appointment | null | undefined>(undefined)

  /** Pre-filled start datetime when clicking on an empty slot. */
  const [defaultStart, setDefaultStart] = useState<Date | undefined>(undefined)

  const fetchAppointments = useCallback(async () => {
    if (!session?.accessToken) return

    setLoading(true)

    const { start, end } = getRange(view, current)

    try {
      const data = await listAppointments(
        session.accessToken as string,
        start.toISOString(),
        end.toISOString()
      )

      setAppointments(data)
    } catch {
      // silent fail — keep previous data
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, view, current])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const navigate = (direction: 1 | -1) => {
    setCurrent(prev => {
      if (view === 'day') return direction === 1 ? addDays(prev, 1) : subDays(prev, 1)

      if (view === 'week') return direction === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1)

      return direction === 1 ? addMonths(prev, 1) : subMonths(prev, 1)
    })
  }

  const openCreate = (start?: Date) => {
    setDefaultStart(start)

    setEditing(null)
  }

  const openEdit = (appt: Appointment) => {
    setDetailing(appt)
  }

  const closeDetail = () => setDetailing(undefined)

  const closeForm = () => setEditing(undefined)

  const handleSuccess = () => {
    closeForm()

    fetchAppointments()
  }

  const headerLabel = (() => {
    if (view === 'day') return format(current, 'EEEE, MMMM d, yyyy')

    if (view === 'week') {
      const start = startOfWeek(current, { weekStartsOn: 1 })

      const end = endOfWeek(current, { weekStartsOn: 1 })

      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }

    return format(current, 'MMMM yyyy')
  })()

  return (
    <div className="space-y-4">
      {/* Google Calendar banner */}
      {!settings.calendarConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-medium text-amber-800 text-sm">
              {t('appointments.calendarBanner.title')}
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              {t('appointments.calendarBanner.description')}
            </p>
          </div>
          <a href="/settings" className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-800 hover:bg-amber-100"
            >
              {t('appointments.calendarBanner.connect')}
            </Button>
          </a>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['day', 'week', 'month'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t(`appointments.views.${v}`)}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[160px] text-center">{headerLabel}</span>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrent(new Date())}
            className="ml-1"
          >
            {t('appointments.today')}
          </Button>
        </div>

        <Button className="sm:ml-auto gap-2" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          {t('appointments.newAppointment')}
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading && (
          <div className="h-1 bg-blue-100">
            <div className="h-1 bg-blue-500 animate-pulse w-1/2 mx-auto rounded-full" />
          </div>
        )}
        {view === 'month' && (
          <MonthView
            current={current}
            timezone={timezone}
            appointments={appointments}
            onSlotClick={openCreate}
            onApptClick={openEdit}
          />
        )}
        {view === 'week' && (
          <WeekView
            current={current}
            timezone={timezone}
            appointments={appointments}
            onSlotClick={openCreate}
            onApptClick={openEdit}
          />
        )}
        {view === 'day' && (
          <DayView
            current={current}
            timezone={timezone}
            appointments={appointments}
            onSlotClick={openCreate}
            onApptClick={openEdit}
          />
        )}
      </div>

      {/* Detail modal — shown when clicking an existing appointment */}
      {detailing !== undefined && (
        <AppointmentDetailModal
          appointment={detailing}
          timezone={timezone}
          onClose={closeDetail}
          onUpdated={() => {
            closeDetail()

            fetchAppointments()
          }}
        />
      )}

      {/* Form dialog — only for creating new appointments */}
      {editing !== undefined && (
        <AppointmentForm
          appointment={editing}
          defaultStart={defaultStart}
          timezone={timezone}
          onSuccess={handleSuccess}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
