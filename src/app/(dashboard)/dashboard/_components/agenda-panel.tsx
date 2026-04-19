'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import type { Appointment } from '@/typing/services/appointment.interface'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format an ISO UTC time string to local HH:mm using the browser's timezone.
 *
 * @param iso - ISO 8601 UTC string.
 * @returns Local time as "HH:mm".
 */
const toLocalTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

/** Returns true if two Date objects represent the same calendar day. */
const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for AgendaPanel. */
export interface AgendaPanelProps {
  /** Appointments for the current view date, sorted by start_time. */
  appointments: Appointment[]
  /** Currently selected appointment ID. */
  selectedId: string | null
  /** The date currently being viewed. */
  viewDate: Date
  /** Called when the user clicks an appointment card. */
  onSelect: (appointment: Appointment) => void
  /** Called when the user clicks "+ Nuevo Turno". */
  onNewAppointment: () => void
  /** Navigate to the previous day. */
  onPrevDay: () => void
  /** Navigate to the next day. */
  onNextDay: () => void
  /** Jump back to today. */
  onToday: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Left panel of the dashboard: daily appointment agenda with date navigation.
 * The active (selected) patient is visually dominant; others are muted.
 */
const AgendaPanel = ({
  appointments,
  selectedId,
  viewDate,
  onSelect,
  onNewAppointment,
  onPrevDay,
  onNextDay,
  onToday,
}: AgendaPanelProps) => {
  const { t, i18n } = useTranslation()

  const locale = i18n.language === 'es' ? 'es-AR' : 'en-US'

  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const isToday = isSameDay(viewDate, today)

  const dateLabel = viewDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 overflow-hidden rounded-xl">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        {/* Date navigation */}
        <div className="flex items-center gap-1 mb-2">
          <button
            type="button"
            onClick={onPrevDay}
            aria-label="Previous day"
            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
              {dateLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onNextDay}
            aria-label="Next day"
            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* "Hoy" pill */}
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="w-full text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg py-1.5 transition-colors"
          >
            {t('appointments.today')}
          </button>
        )}
      </div>

      {/* ── Appointment list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
            {t('dashboard.noAppointmentsToday')}
          </div>
        ) : (
          appointments.map(appt => {
            const isSelected = appt.id === selectedId

            const isCompleted = appt.status === 'completed'

            const isCancelled = appt.status === 'cancelled'

            const isDone = isCompleted || isCancelled

            const isActive = isSelected && appt.status === 'scheduled'

            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => onSelect(appt)}
                className={cn(
                  'w-full text-left rounded-xl px-3 py-3 transition-all duration-150 border cursor-pointer',
                  // Active (scheduled + selected) — strong blue, dominant
                  isActive &&
                    'border-blue-300 bg-blue-50 dark:bg-blue-950/60 dark:border-blue-700 shadow-sm',
                  // Completed unselected — tenue green
                  isCompleted &&
                    !isSelected &&
                    'border-green-100 bg-green-50/60 dark:bg-green-950/20 dark:border-green-900/40',
                  // Completed selected — slightly more intense green
                  isCompleted &&
                    isSelected &&
                    'border-green-300 bg-green-100/80 dark:bg-green-900/30 dark:border-green-700/60 shadow-sm',
                  // Cancelled unselected — barely-there red
                  isCancelled &&
                    !isSelected &&
                    'border-red-100 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50',
                  // Cancelled selected — slightly more visible red
                  isCancelled &&
                    isSelected &&
                    'border-red-200 bg-red-100/70 dark:bg-red-950/40 dark:border-red-800/60 shadow-sm',
                  // Not selected, not done
                  !isSelected &&
                    !isDone &&
                    'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Time */}
                    <p
                      className={cn(
                        'text-xs font-bold tabular-nums mb-0.5',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : isCompleted
                            ? 'text-green-500/70 dark:text-green-600/60'
                            : isCancelled
                              ? 'text-red-300 dark:text-red-800'
                              : 'text-gray-400 dark:text-gray-500'
                      )}
                    >
                      {toLocalTime(appt.start_time)}
                    </p>

                    {/* Patient name */}
                    <p
                      className={cn(
                        'text-sm font-semibold truncate leading-snug',
                        isActive
                          ? 'text-blue-900 dark:text-blue-100'
                          : isCompleted
                            ? 'text-green-800/50 dark:text-green-300/40'
                            : isCancelled
                              ? 'text-gray-400 dark:text-gray-600 line-through'
                              : 'text-gray-800 dark:text-gray-200'
                      )}
                    >
                      {appt.patient_name ?? appt.title}
                    </p>

                    {/* Procedure / title */}
                    {appt.patient_name && (
                      <p
                        className={cn(
                          'text-xs truncate mt-0.5',
                          isActive
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        )}
                      >
                        {appt.title}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0 mt-0.5">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        {t('dashboard.inProgress')}
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] font-medium text-green-600/60 dark:text-green-500/50 bg-green-100/60 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        ✓
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-[10px] font-medium text-red-300 dark:text-red-700 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                        ✕
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ── Footer: new appointment ──────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onNewAppointment}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold py-2.5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('appointments.newAppointment')}
        </button>
      </div>
    </aside>
  )
}

export default AgendaPanel
