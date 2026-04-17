'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import { createEvolution, getEvolutions, updateEvolution } from '@/services/evolution.service'
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
    month: 'short',
    year: 'numeric',
  })

// ── Sub-components ────────────────────────────────────────────────────────────

/** Square avatar with patient initials. */
const PatientAvatar = ({ nombre, apellido }: { nombre: string; apellido: string }) => (
  <div className="h-12 w-12 rounded-none bg-blue-600 flex items-center justify-center shrink-0">
    <span className="text-white font-bold text-sm tracking-wide">{initials(nombre, apellido)}</span>
  </div>
)

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for PatientPanel. */
export interface PatientPanelProps {
  /** The selected appointment. */
  appointment: Appointment | null
  /** All appointments for the day — used to compute the next patient. */
  appointments: Appointment[]
  /** Called after appointment status mutation so the parent can refresh. */
  onAppointmentUpdated: (id: string, status: string, nextId?: string | null) => void
  /** Called when the user wants to schedule a new appointment for this patient. */
  onScheduleAppointment: (patientId: string, patientName: string) => void
  /** Called when the user clicks "Abrir Odontograma". */
  onOpenOdontogram: (patientId: string) => void
  /** Called when the user wants to edit the appointment (e.g. assign an existing patient). */
  onEditAppointment: (appointment: Appointment) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Right panel of the dashboard: active patient consultation mode.
 * Loads patient data and evolutions when a new appointment is selected.
 * Priority: alerts → treatment form → collapsible history → secondary actions.
 */
const PatientPanel = ({
  appointment,
  appointments,
  onAppointmentUpdated,
  onScheduleAppointment,
  onOpenOdontogram,
  onEditAppointment,
}: PatientPanelProps) => {
  const { t, i18n } = useTranslation()

  const { data: session } = useSession()

  const router = useRouter()

  const token = (session?.accessToken as string) ?? ''

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [patient, setPatient] = useState<Patient | null>(null)

  const [evolutions, setEvolutions] = useState<Evolution[]>([])

  const [loading, setLoading] = useState(false)

  const [showCancelModal, setShowCancelModal] = useState(false)

  const [cancelReason, setCancelReason] = useState('')

  const [showHistory, setShowHistory] = useState(true)

  const [evolutionText, setEvolutionText] = useState('')

  const [evolutionTeeth, setEvolutionTeeth] = useState('')

  const [isUpdating, startUpdate] = useTransition()

  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null)

  // Load patient + evolutions whenever the selected appointment changes
  useEffect(() => {
    const patientId = appointment?.patient_id

    let cancelled = false

    setEvolutionText('')

    setEvolutionTeeth('')

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

        // Autofocus textarea after patient loads
        setTimeout(() => textareaRef.current?.focus(), 100)
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

  /**
   * Computes the next scheduled appointment after the current one.
   * Returns null if none exists.
   */
  const getNextAppointment = (): Appointment | null => {
    if (!appointment) return null

    const currentIndex = appointments.findIndex(a => a.id === appointment.id)

    const remaining = appointments.slice(currentIndex + 1)

    return remaining.find(a => a.status === 'scheduled') ?? null
  }

  /**
   * Single primary action: optionally saves evolution, marks appointment as
   * completed, then auto-advances to the next scheduled patient.
   */
  const handleFinishAppointment = () => {
    if (!appointment) return

    startUpdate(async () => {
      try {
        // 1. Save evolution if textarea has content
        if (patient && evolutionText.trim()) {
          const teeth = evolutionTeeth
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0)

          const ev = await createEvolution(token, patient.id, {
            descripcion: evolutionText.trim(),
            dientes: teeth.length > 0 ? teeth : undefined,
          })

          setEvolutions(prev => [ev, ...prev])

          setEvolutionText('')

          setEvolutionTeeth('')
        }

        // 2. Mark appointment as completed
        await updateAppointment(token, appointment.id, {
          patient_id: appointment.patient_id,
          title: appointment.title,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          duration_minutes: appointment.duration_minutes,
          status: 'completed',
          notes: appointment.notes ?? null,
          allow_overlap: true,
        })

        // 3. Advance to next patient
        const next = getNextAppointment()

        onAppointmentUpdated(appointment.id, 'completed', next?.id ?? null)

        toast.success(t('appointmentDetail.markedCompleted'))
      } catch {
        toast.error(t('appointmentDetail.updateError'))
      }
    })
  }

  const handleCancelAppointment = (reason?: string) => {
    if (!appointment) return

    startUpdate(async () => {
      try {
        const notes = reason ? reason.trim() || null : (appointment.notes ?? null)

        await updateAppointment(token, appointment.id, {
          patient_id: appointment.patient_id,
          title: appointment.title,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          duration_minutes: appointment.duration_minutes,
          status: 'cancelled',
          notes,
          allow_overlap: true,
        })

        const next = getNextAppointment()

        onAppointmentUpdated(appointment.id, 'cancelled', next?.id ?? null)

        toast.success(t('dashboard.cancelledSuccess'))
      } catch {
        toast.error(t('appointmentDetail.updateError'))
      }
    })
  }

  const handleConfirmCancel = () => {
    handleCancelAppointment(cancelReason || t('dashboard.cancelReasonAbsent'))

    setShowCancelModal(false)

    setCancelReason('')
  }

  const handleTogglePaid = async (ev: Evolution) => {
    if (!patient || togglingPaidId === ev.id) return

    setTogglingPaidId(ev.id)

    try {
      const updated = await updateEvolution({
        token,
        patientId: patient.id,
        evolutionId: ev.id,
        input: { pagado: !ev.pagado },
      })

      setEvolutions(prev => prev.map(e => (e.id === updated.id ? updated : e)))
    } catch {
      toast.error(t('appointmentDetail.evolutionError'))
    } finally {
      setTogglingPaidId(null)
    }
  }

  // ── Empty / loading states ────────────────────────────────────────────────

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-center px-8 gap-3">
        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Stethoscope className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t('dashboard.selectAppointment')}
        </p>
      </div>
    )
  }

  if (!appointment.patient_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-center px-8 gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <UserPlus className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            {appointment.title}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.noPatient')}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
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
            className="w-full gap-2 dark:border-gray-700 dark:text-gray-300"
            onClick={() => onEditAppointment(appointment)}
          >
            <Search className="h-4 w-4" />
            {t('dashboard.assignExistingPatient')}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="w-full gap-2 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            disabled={isUpdating}
            onClick={() => handleCancelAppointment()}
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
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!patient) return null

  // ── Derived data ─────────────────────────────────────────────────────────────

  const age = patient.fechaNacimiento ? calcAge(patient.fechaNacimiento) : null

  const hasAlergias = Boolean(patient.alergias?.trim())

  const hasAntecedentes = Boolean(patient.antecedentes?.trim())

  const hasAlerts = hasAlergias || hasAntecedentes

  const isAlreadyDone = appointment.status === 'completed' || appointment.status === 'cancelled'

  const recentEvolutions = evolutions.slice(0, 5)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* ── A. PATIENT HEADER ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
        <PatientAvatar nombre={patient.nombre} apellido={patient.apellido} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {patient.apellido}, {patient.nombre}
            </h2>
            <Link
              href={`/patients/${patient.id}`}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 mt-1 transition-colors"
            >
              {t('dashboard.viewFullRecord')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {age !== null && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('patientDetail.yearsOld', { age })}
              </span>
            )}
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
              {appointment.title}
            </span>
            {patient.obraSocial && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                {patient.obraSocial}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
            {patient.telefono && (
              <a
                href={`tel:${patient.telefono}`}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Phone className="h-3 w-3" />
                {patient.telefono}
              </a>
            )}
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Mail className="h-3 w-3" />
                {patient.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── B. MEDICAL ALERTS — always visible, never hidden ──────────────────── */}
      {hasAlerts && (
        <div className="px-5 py-3 border-b border-red-100 dark:border-red-900/40 space-y-2 bg-red-50/70 dark:bg-red-950/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-red-400">
            {t('dashboard.alerts')}
          </p>
          {hasAlergias && (
            <div className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <span>{patient.alergias}</span>
            </div>
          )}
          {hasAntecedentes && (
            <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
              <span>{patient.antecedentes}</span>
            </div>
          )}
        </div>
      )}

      {/* ── C. PRIMARY ACTION AREA ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('dashboard.newEvolution')}
          </p>

          <textarea
            ref={textareaRef}
            value={evolutionText}
            onChange={e => setEvolutionText(e.target.value)}
            placeholder={t('records.descriptionPlaceholder')}
            rows={8}
            disabled={isAlreadyDone}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-sm leading-relaxed resize-none transition-all',
              'text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              isAlreadyDone
                ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          />

          {/* Teeth input — secondary, minimal */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={evolutionTeeth}
              onChange={e => setEvolutionTeeth(e.target.value)}
              placeholder={t('records.teethPlaceholder')}
              title={t('records.teethHint')}
              disabled={isAlreadyDone}
              className="w-32 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            />
            <span className="text-xs text-gray-400 dark:text-gray-600">
              {t('records.teethHint')}
            </span>
          </div>
        </div>

        {/* ── D. HISTORY — collapsible ──────────────────────────────────────────── */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border-t border-gray-100 dark:border-gray-800"
          >
            <span>{t('dashboard.lastTreatments')}</span>
            <div className="flex items-center gap-1.5">
              {evolutions.length > 0 && (
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium normal-case tracking-normal">
                  {evolutions.length}
                </span>
              )}
              {showHistory ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {recentEvolutions.length > 0 ? (
                recentEvolutions.map(ev => (
                  <div
                    key={ev.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(ev.fecha, i18n.language)}</span>
                      </div>
                      {ev.importe !== null && ev.importe !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(ev)}
                          disabled={togglingPaidId === ev.id}
                          className={cn(
                            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors shrink-0',
                            togglingPaidId === ev.id && 'opacity-50',
                            ev.pagado
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                          )}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {ev.pagado ? t('records.paid') : t('records.pending')}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
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
                ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
                  {t('dashboard.noTreatments')}
                </p>
              )}
              {evolutions.length > 5 && (
                <Link
                  href={`/patients/${patient.id}`}
                  className="block text-center text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 py-1 transition-colors"
                >
                  {t('dashboard.allNotes')} →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── E. FOOTER ACTIONS ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {/* Primary CTA — single action, saves evolution + completes + advances */}
        {!isAlreadyDone && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 text-base shadow-sm"
            type="button"
            disabled={isUpdating}
            onClick={handleFinishAppointment}
          >
            {isUpdating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : evolutionText.trim() ? (
              t('dashboard.finishAndSave')
            ) : (
              t('dashboard.finishAppointment')
            )}
          </Button>
        )}

        {/* Secondary actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenOdontogram(patient.id)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ScanLine className="h-3.5 w-3.5" />
            {t('dashboard.openOdontogram')}
          </button>
          <button
            type="button"
            onClick={() =>
              onScheduleAppointment(patient.id, `${patient.apellido}, ${patient.nombre}`)
            }
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            {t('dashboard.scheduleAppointment')}
          </button>
          {!isAlreadyDone && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setShowCancelModal(true)}
              className="flex items-center justify-center gap-1 rounded-lg border border-orange-200 dark:border-orange-900 py-2 px-3 text-xs font-medium text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Already done badge */}
        {isAlreadyDone && (
          <div
            className={cn(
              'text-sm font-medium py-2 px-3 rounded-lg text-center',
              appointment.status === 'completed'
                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                : 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
            )}
          >
            {appointment.status === 'completed'
              ? t('appointments.form.statuses.completed')
              : appointment.notes
                ? `${t('dashboard.cancelledByPatient')}: ${appointment.notes}`
                : t('dashboard.cancelledByPatient')}
          </div>
        )}
      </div>

      {/* ── Cancel modal ──────────────────────────────────────────────────────── */}
      <Dialog open={showCancelModal} onOpenChange={open => setShowCancelModal(open)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dashboard.cancelledByPatient')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.cancelReasonPrompt')}
            </p>

            <button
              type="button"
              onClick={() => setCancelReason(t('dashboard.cancelReasonAbsent'))}
              className={cn(
                'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                cancelReason === t('dashboard.cancelReasonAbsent')
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              )}
            >
              {t('dashboard.cancelReasonAbsent')}
            </button>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('dashboard.cancelReasonCustom')}
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={t('dashboard.cancelReasonPlaceholder')}
                rows={2}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              {t('records.cancel')}
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleConfirmCancel}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('dashboard.confirmCancel')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PatientPanel
