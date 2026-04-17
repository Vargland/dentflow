'use client'

import { Fragment, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  ScanLine,
  Search,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import type { Appointment } from '@/typing/services/appointment.interface'
import type { Evolution } from '@/typing/services/evolution.interface'
import type { Patient } from '@/typing/services/patient.interface'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateAppointment } from '@/services/appointments.service'
import { getEvolutions } from '@/services/evolution.service'
import { getPatient } from '@/services/patients.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the two-letter initials from a full name.
 *
 * @param nombre   - First name.
 * @param apellido - Last name.
 * @returns Up to 2 uppercase characters.
 */
const initials = (nombre: string, apellido: string): string =>
  `${apellido.charAt(0)}${nombre.charAt(0)}`.toUpperCase()

/**
 * Calculates age in years from an ISO date string.
 *
 * @param dob - ISO date string (YYYY-MM-DD).
 * @returns Age in full years.
 */
const calcAge = (dob: string): number => {
  const today = new Date()

  const birth = new Date(dob)

  let age = today.getFullYear() - birth.getFullYear()

  const m = today.getMonth() - birth.getMonth()

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--

  return age
}

/**
 * Formats an ISO date string to a short localised date.
 *
 * @param iso  - ISO date string.
 * @param lang - Locale code ("es" | "en").
 * @returns Formatted date string.
 */
const formatDate = (iso: string, lang: string): string =>
  new Date(iso).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ── Sub-components ────────────────────────────────────────────────────────────

/** Avatar circle with patient initials. */
const Avatar = ({ nombre, apellido }: { nombre: string; apellido: string }) => (
  <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
    <span className="text-white font-bold text-lg">{initials(nombre, apellido)}</span>
  </div>
)

/** A coloured alert chip (allergy or condition). */
const AlertChip = ({ text, variant }: { text: string; variant: 'allergy' | 'condition' }) => (
  <div
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
      variant === 'allergy'
        ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
    )}
  >
    {variant === 'allergy' ? (
      <AlertCircle className="h-4 w-4 shrink-0" />
    ) : (
      <AlertTriangle className="h-4 w-4 shrink-0" />
    )}
    <span>{text}</span>
  </div>
)

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for PatientPanel. */
export interface PatientPanelProps {
  /** The selected appointment. */
  appointment: Appointment | null
  /** Called after appointment status mutation so the parent can refresh. */
  onAppointmentUpdated: (id: string, status: string) => void
  /** Called when the user wants to schedule a new appointment for this patient. */
  onScheduleAppointment: (patientId: string, patientName: string) => void
  /** Called when the user clicks "Abrir Odontograma". */
  onOpenOdontogram: (patientId: string) => void
  /** Called when the user wants to edit the appointment (e.g. assign an existing patient). */
  onEditAppointment: (appointment: Appointment) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Right panel of the dashboard: active patient file.
 * Loads patient data and evolutions when a new appointment is selected.
 *
 * @param appointment           - Currently selected appointment (null = nothing selected).
 * @param onAppointmentUpdated  - Callback after finish/no-show mutation.
 * @param onScheduleAppointment - Callback to open the appointment form for this patient.
 * @param onOpenOdontogram      - Callback to open the odontogram modal for this patient.
 */
const PatientPanel = ({
  appointment,
  onAppointmentUpdated,
  onScheduleAppointment,
  onOpenOdontogram,
  onEditAppointment,
}: PatientPanelProps) => {
  const { t, i18n } = useTranslation()

  const { data: session } = useSession()

  const router = useRouter()

  const token = (session?.accessToken as string) ?? ''

  const [patient, setPatient] = useState<Patient | null>(null)

  const [evolutions, setEvolutions] = useState<Evolution[]>([])

  const [loading, setLoading] = useState(false)

  const [showAllNotes, setShowAllNotes] = useState(false)

  const [isUpdating, startUpdate] = useTransition()

  // Load patient + evolutions whenever the selected appointment changes
  useEffect(() => {
    const patientId = appointment?.patient_id

    let cancelled = false

    setShowAllNotes(false)

    const load = async () => {
      if (!patientId || !token) {
        setPatient(null)

        setEvolutions([])

        return
      }

      setLoading(true)

      try {
        const [p, evs] = await Promise.all([
          getPatient(token, patientId),
          getEvolutions(token, patientId),
        ])

        if (cancelled) return

        setPatient(p)

        setEvolutions(evs)
      } catch {
        if (cancelled) return

        setPatient(null)

        setEvolutions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [appointment?.patient_id, token])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusUpdate = (newStatus: 'completed' | 'cancelled') => {
    if (!appointment) return

    startUpdate(async () => {
      try {
        await updateAppointment(token, appointment.id, {
          patient_id: appointment.patient_id,
          title: appointment.title,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          duration_minutes: appointment.duration_minutes,
          status: newStatus,
          notes: appointment.notes ?? null,
        })

        onAppointmentUpdated(appointment.id, newStatus)

        toast.success(
          newStatus === 'completed'
            ? t('appointmentDetail.markedCompleted')
            : t('appointments.form.statuses.cancelled')
        )
      } catch {
        toast.error(t('appointmentDetail.updateError'))
      }
    })
  }

  // ── Empty states ─────────────────────────────────────────────────────────────

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center px-8">
        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Stethoscope className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.selectAppointment')}
        </p>
      </div>
    )
  }

  if (!appointment.patient_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-center px-8 gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <UserPlus className="h-8 w-8 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {appointment.title}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.noPatient')}</p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button
            type="button"
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push(`/patients/new?appointmentId=${appointment.id}`)}
          >
            <UserPlus className="h-4 w-4" />
            {t('patients.newPatient')}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="w-full gap-2"
            onClick={() => onEditAppointment(appointment)}
          >
            <Search className="h-4 w-4" />
            {t('dashboard.assignExistingPatient')}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
            disabled={isUpdating}
            onClick={() => handleStatusUpdate('cancelled')}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            {t('appointments.form.statuses.cancelled')}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!patient) return null

  // ── Derived data ─────────────────────────────────────────────────────────────

  const age = patient.fechaNacimiento ? calcAge(patient.fechaNacimiento) : null

  const visitCount = evolutions.length

  const recentEvolutions = evolutions.slice(0, 2)

  const patientSinceDate = formatDate(patient.createdAt, i18n.language)

  const hasAlergias = Boolean(patient.alergias?.trim())

  const hasAntecedentes = Boolean(patient.antecedentes?.trim())

  const hasAlerts = hasAlergias || hasAntecedentes

  const isAlreadyDone = appointment.status === 'completed' || appointment.status === 'cancelled'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ── Header label ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('dashboard.activePatient')}
        </p>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* 1. Patient header */}
        <div className="flex items-center gap-4">
          <Avatar nombre={patient.nombre} apellido={patient.apellido} />

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {patient.apellido}, {patient.nombre}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {age !== null && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('patientDetail.yearsOld', { age })}
                </span>
              )}
              {patient.obraSocial && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {patient.obraSocial}
                </span>
              )}
            </div>
          </div>

          <Link
            href={`/patients/${patient.id}`}
            className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            {t('dashboard.viewFullRecord')}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 2. Medical alerts */}
        {hasAlerts && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('dashboard.alerts')}
            </p>
            {hasAlergias && <AlertChip text={patient.alergias as string} variant="allergy" />}
            {hasAntecedentes && (
              <AlertChip text={patient.antecedentes as string} variant="condition" />
            )}
          </div>
        )}

        {/* 3. Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
            <Stethoscope className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {t('dashboard.visitsLabel')}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t('dashboard.visitsCount', { count: visitCount })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
            <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {t('dashboard.patientSince')}
              </p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {patientSinceDate}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Last 2 treatments + "see all" link */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('dashboard.lastTreatments')}
            </p>
            {evolutions.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllNotes(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('dashboard.allNotes')}
              </button>
            )}
          </div>

          {recentEvolutions.length > 0 ? (
            <div className="space-y-2">
              {recentEvolutions.map(ev => (
                <div
                  key={ev.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(ev.fecha, i18n.language)}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    {ev.descripcion}
                  </p>
                  {ev.dientes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {ev.dientes.map(d => (
                        <span
                          key={d}
                          className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              {t('dashboard.noTreatments')}
            </p>
          )}
        </div>

        {/* 5. Quick contact */}
        <div className="flex gap-2">
          {patient.telefono && (
            <a
              href={`tel:${patient.telefono}`}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Phone className="h-4 w-4" />
              {patient.telefono}
            </a>
          )}
          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Mail className="h-4 w-4" />
              {patient.email}
            </a>
          )}
        </div>
      </div>

      {/* ── Actions footer ────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {/* Row 1: Odontogram + Schedule */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            type="button"
            onClick={() => onOpenOdontogram(patient.id)}
          >
            <ScanLine className="h-4 w-4" />
            {t('dashboard.openOdontogram')}
          </Button>

          <Button
            variant="outline"
            className="flex-1 gap-2"
            type="button"
            onClick={() =>
              onScheduleAppointment(patient.id, `${patient.apellido}, ${patient.nombre}`)
            }
          >
            <Calendar className="h-4 w-4" />
            {t('dashboard.scheduleAppointment')}
          </Button>
        </div>

        {/* Row 2: Finish / No-show (only for scheduled appointments) */}
        {!isAlreadyDone && (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('completed')}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('dashboard.finishAppointment')
              )}
            </Button>

            <Button
              variant="outline"
              className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('cancelled')}
            >
              {t('dashboard.noShow')}
            </Button>
          </div>
        )}

        {/* Already done badge */}
        {isAlreadyDone && (
          <div
            className={cn(
              'text-center text-sm font-medium py-2 rounded-lg',
              appointment.status === 'completed'
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            )}
          >
            {appointment.status === 'completed'
              ? t('appointments.form.statuses.completed')
              : t('dashboard.noShow')}
          </div>
        )}
      </div>

      {/* ── All notes modal ───────────────────────────────────────────────────── */}
      <Dialog open={showAllNotes} onOpenChange={open => setShowAllNotes(open)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('dashboard.allNotesTitle')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {evolutions.map((ev, idx) => (
              <Fragment key={ev.id}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(ev.fecha, i18n.language)}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    {ev.descripcion}
                  </p>
                  {ev.dientes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ev.dientes.map(d => (
                        <span
                          key={d}
                          className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {idx < evolutions.length - 1 && (
                  <hr className="border-gray-100 dark:border-gray-700" />
                )}
              </Fragment>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PatientPanel
