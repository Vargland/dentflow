'use client'

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

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusConfig {
  dot: string
  card: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  scheduled: {
    dot: 'bg-blue-500',
    card: 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40',
  },
  completed: {
    dot: 'bg-green-500',
    card: 'border-gray-200 opacity-60 hover:opacity-80',
  },
  cancelled: {
    dot: 'bg-gray-400',
    card: 'border-gray-200 opacity-50 hover:opacity-70',
  },
}

const getStatusConfig = (status: string): StatusConfig =>
  STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for AgendaPanel. */
export interface AgendaPanelProps {
  /** Today's appointments sorted by start_time. */
  appointments: Appointment[]
  /** Currently selected appointment ID. */
  selectedId: string | null
  /** Called when the user clicks an appointment card. */
  onSelect: (appointment: Appointment) => void
  /** Called when the user clicks "+ Nuevo Turno". */
  onNewAppointment: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Left panel of the dashboard: today's appointment agenda.
 * Clicking a card loads the patient file in the right panel.
 *
 * @param appointments     - Today's appointments.
 * @param selectedId       - ID of the currently active appointment.
 * @param onSelect         - Callback when an appointment card is clicked.
 * @param onNewAppointment - Callback for the "+ Nuevo Turno" button.
 */
const AgendaPanel = ({
  appointments,
  selectedId,
  onSelect,
  onNewAppointment,
}: AgendaPanelProps) => {
  const { t, i18n } = useTranslation()

  const today = new Date().toLocaleDateString(i18n.language === 'es' ? 'es-AR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.title')}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-gray-500">
            {t('dashboard.noAppointmentsToday')}
          </div>
        ) : (
          appointments.map(appt => {
            const cfg = getStatusConfig(appt.status)

            const isSelected = appt.id === selectedId

            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => onSelect(appt)}
                className={cn(
                  'w-full text-left rounded-xl border px-3 py-3 transition-all',
                  cfg.card,
                  isSelected &&
                    'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-500 opacity-100 shadow-sm'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Status dot */}
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full shrink-0',
                      isSelected ? 'bg-blue-500' : cfg.dot
                    )}
                  />

                  <div className="min-w-0">
                    {/* Time */}
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                      {toLocalTime(appt.start_time)}
                    </p>

                    {/* Patient name or title */}
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mt-0.5">
                      {appt.patient_name ?? appt.title}
                    </p>

                    {/* Title (procedure) if patient name differs */}
                    {appt.patient_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {appt.title}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer action */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onNewAppointment}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {t('appointments.newAppointment')}
        </button>
      </div>
    </aside>
  )
}

export default AgendaPanel
