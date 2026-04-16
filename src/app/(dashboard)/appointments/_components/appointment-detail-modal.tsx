'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ChevronDown, ChevronUp, DollarSign, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { Appointment } from '@/typing/services/appointment.interface'
import type { CreateEvolutionInput, Evolution } from '@/typing/services/evolution.interface'
import type { OdontogramState } from '@/typing/services/odontogram.interface'
import type { Patient } from '@/typing/services/patient.interface'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import Odontogram from '@/app/(dashboard)/patients/[id]/_components/odontogram'
import { deleteAppointment, updateAppointment } from '@/services/appointments.service'
import { createEvolution, getEvolutions } from '@/services/evolution.service'
import { getOdontogram } from '@/services/odontogram.service'
import { getPatient } from '@/services/patients.service'

import { AppointmentForm } from './appointment-form'

/** Status → badge colour classes. */
const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

/** Props for the AppointmentDetailModal. */
export interface AppointmentDetailModalProps {
  /** The appointment being viewed. */
  appointment: Appointment
  /** IANA timezone of the doctor. */
  timezone: string
  /** Called when the modal is dismissed. */
  onClose: () => void
  /** Called after any mutation so the calendar can refresh. */
  onUpdated: () => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a status badge. */
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation()

  const cls = STATUS_BADGE[status] ?? STATUS_BADGE.scheduled

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cls
      )}
    >
      {t(`appointments.form.statuses.${status}` as Parameters<typeof t>[0])}
    </span>
  )
}

/** Collapsible evolution card row (same pattern as patient detail). */
const EvolutionRow = ({ ev }: { ev: Evolution }) => {
  const { t, i18n } = useTranslation()

  const [open, setOpen] = useState(false)

  const dateLabel = new Date(ev.fecha).toLocaleDateString(
    i18n.language === 'es' ? 'es-AR' : 'en-US',
    { day: '2-digit', month: '2-digit', year: 'numeric' }
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-gray-500 shrink-0 font-mono">{dateLabel}</span>
          <span className="text-sm text-gray-800 truncate">{ev.descripcion}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {ev.dientes.length > 0 && (
            <div className="hidden sm:flex gap-1">
              {ev.dientes.slice(0, 3).map(d => (
                <Badge key={d} variant="secondary" className="text-xs px-1.5">
                  {d}
                </Badge>
              ))}
              {ev.dientes.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5">
                  +{ev.dientes.length - 3}
                </Badge>
              )}
            </div>
          )}
          {ev.importe !== null && (
            <span
              className={cn(
                'text-xs font-medium',
                ev.pagado ? 'text-green-600' : 'text-orange-500'
              )}
            >
              ${ev.importe.toLocaleString()}
            </span>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ev.descripcion}</p>
          {ev.dientes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">{t('records.teeth')}</span>
              {ev.dientes.map(d => (
                <Badge key={d} variant="secondary" className="text-xs px-1.5">
                  {d}
                </Badge>
              ))}
            </div>
          )}
          {ev.importe !== null && (
            <p className="text-xs text-gray-500">
              {t('records.amount')}:{' '}
              <span className="font-medium">${ev.importe.toLocaleString()}</span>
              {' — '}
              <span className={ev.pagado ? 'text-green-600' : 'text-orange-500'}>
                {ev.pagado ? t('records.paid') : t('records.pending')}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab — "Turno" info
// ---------------------------------------------------------------------------

interface AppointmentTabProps {
  appointment: Appointment
  timezone: string
  onEdit: () => void
  onMarkCompleted: () => void
  isMarkingCompleted: boolean
}

const AppointmentTab = ({
  appointment,
  timezone,
  onEdit,
  onMarkCompleted,
  isMarkingCompleted,
}: AppointmentTabProps) => {
  const { t } = useTranslation()

  const localStart = toZonedTime(parseISO(appointment.start_time), timezone)

  const localEnd = toZonedTime(parseISO(appointment.end_time), timezone)

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Title */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelTitle')}
          </p>
          <p className="text-base font-medium text-gray-900 mt-0.5">{appointment.title}</p>
        </div>

        {/* Date / time */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelDateTime')}
          </p>
          <p className="text-sm text-gray-800 mt-0.5">
            {format(localStart, 'EEEE, MMMM d, yyyy')}
            {' · '}
            {format(localStart, 'HH:mm')}–{format(localEnd, 'HH:mm')}{' '}
            <span className="text-gray-400 text-xs">({appointment.duration_minutes} min)</span>
          </p>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelStatus')}
          </p>
          <div className="mt-1">
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {/* Patient name if available */}
        {appointment.patient_name && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('appointmentDetail.labelPatient')}
            </p>
            <p className="text-sm text-gray-800 mt-0.5">{appointment.patient_name}</p>
          </div>
        )}

        {/* Notes */}
        {appointment.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('appointmentDetail.labelNotes')}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          {t('appointmentDetail.editAppointment')}
        </Button>

        {appointment.status === 'scheduled' && (
          <Button
            variant="outline"
            className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
            onClick={onMarkCompleted}
            disabled={isMarkingCompleted}
          >
            {isMarkingCompleted ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('appointmentDetail.markCompleted')}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab — Evoluciones
// ---------------------------------------------------------------------------

interface EvolutionsTabProps {
  patientId: string
  token: string
}

const EvolutionsTab = ({ patientId, token }: EvolutionsTabProps) => {
  const { t } = useTranslation()

  const [evolutions, setEvolutions] = useState<Evolution[]>([])

  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)

  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await getEvolutions(token, patientId)

        if (!cancelled) {
          setEvolutions(data)

          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setEvolutions([])

          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, patientId])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = e.currentTarget

    const fd = new FormData(form)

    const dienteStr = (fd.get('dientes') as string) ?? ''

    const dientes = dienteStr
      ? dienteStr
          .split(',')
          .map(Number)
          .filter(n => !Number.isNaN(n))
      : []

    const importeRaw = fd.get('importe') as string

    const importe = importeRaw ? Number(importeRaw) : undefined

    const pagadoRaw = fd.get('pagado')

    const pagado = pagadoRaw === 'on'

    const input: CreateEvolutionInput = {
      descripcion: fd.get('descripcion') as string,
      dientes,
      importe,
      pagado,
    }

    startTransition(async () => {
      try {
        const created = await createEvolution(token, patientId, input)

        setEvolutions(prev => [created, ...prev])

        setShowForm(false)

        toast.success(t('records.saved'))

        form.reset()
      } catch {
        toast.error(t('appointmentDetail.evolutionError'))
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm(s => !s)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? t('records.cancel') : t('records.newRecord')}
        </Button>
      </div>

      {/* New evolution form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 text-sm">{t('records.newRecordTitle')}</h3>

          <div className="space-y-1.5">
            <Label htmlFor="ev-descripcion">{t('records.description')} *</Label>
            <Textarea
              id="ev-descripcion"
              name="descripcion"
              rows={3}
              required
              placeholder={t('records.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-dientes">{t('records.teethTreated')}</Label>
              <Input id="ev-dientes" name="dientes" placeholder={t('records.teethPlaceholder')} />
              <p className="text-xs text-gray-500">{t('records.teethHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-importe">{t('records.amount')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="ev-importe"
                  name="importe"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ev-pagado" name="pagado" className="h-4 w-4 rounded" />
            <Label htmlFor="ev-pagado" className="cursor-pointer">
              {t('records.paid')}
            </Label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending} size="sm">
              {pending ? t('records.saving') : t('records.save')}
            </Button>
          </div>
        </form>
      )}

      {/* Evolutions list */}
      {evolutions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="font-medium">{t('records.empty')}</p>
          <p className="text-sm mt-1">{t('records.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evolutions.map(ev => (
            <EvolutionRow key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab — Odontograma
// ---------------------------------------------------------------------------

interface OdontogramTabProps {
  patientId: string
  token: string
}

const OdontogramTab = ({ patientId, token }: OdontogramTabProps) => {
  const [initialData, setInitialData] = useState<OdontogramState | null>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await getOdontogram(token, patientId)

        if (!cancelled) {
          setInitialData((res.data as OdontogramState) ?? null)

          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setInitialData(null)

          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, patientId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return <Odontogram patientId={patientId} initialData={initialData} token={token} />
}

// ---------------------------------------------------------------------------
// Case B — appointment without patient (simple view)
// ---------------------------------------------------------------------------

interface SimpleViewProps {
  appointment: Appointment
  timezone: string
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

const SimpleView = ({ appointment, timezone, onEdit, onDelete, isDeleting }: SimpleViewProps) => {
  const { t } = useTranslation()

  const localStart = toZonedTime(parseISO(appointment.start_time), timezone)

  const localEnd = toZonedTime(parseISO(appointment.end_time), timezone)

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Title */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelTitle')}
          </p>
          <p className="text-base font-medium text-gray-900 mt-0.5">{appointment.title}</p>
        </div>

        {/* Date / time */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelDateTime')}
          </p>
          <p className="text-sm text-gray-800 mt-0.5">
            {format(localStart, 'EEEE, MMMM d, yyyy')}
            {' · '}
            {format(localStart, 'HH:mm')}–{format(localEnd, 'HH:mm')}{' '}
            <span className="text-gray-400 text-xs">({appointment.duration_minutes} min)</span>
          </p>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('appointmentDetail.labelStatus')}
          </p>
          <div className="mt-1">
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('appointmentDetail.labelNotes')}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          {t('appointmentDetail.editAppointment')}
        </Button>

        <Button
          variant="outline"
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {t('appointments.form.delete')}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Large modal showing appointment details.
 *
 * - Case A (with patient): three tabs — Turno, Odontograma, Evoluciones.
 * - Case B (no patient): simple view with edit/delete actions.
 *
 * @param appointment - The appointment to display.
 * @param timezone    - IANA timezone for local time rendering.
 * @param onClose     - Called when the modal is closed.
 * @param onUpdated   - Called after any mutation so the calendar can refresh.
 */
export const AppointmentDetailModal = ({
  appointment,
  timezone,
  onClose,
  onUpdated,
}: AppointmentDetailModalProps) => {
  const { data: session } = useSession()

  const { t } = useTranslation()

  const token = session?.accessToken as string

  /** Controls whether the AppointmentForm edit dialog is open. */
  const [editingAppointment, setEditingAppointment] = useState(false)

  /** Tracks "mark completed" mutation. */
  const [isMarkingCompleted, startMarkCompleted] = useTransition()

  /** Tracks "delete" mutation (Case B). */
  const [isDeleting, startDelete] = useTransition()

  /** Patient data fetched when patient_id exists. */
  const [patient, setPatient] = useState<Patient | null>(null)

  const hasPatient = Boolean(appointment.patient_id)

  const patientId = appointment.patient_id

  // Fetch patient record when there is a linked patient
  useEffect(() => {
    if (!patientId || !token) return

    let cancelled = false

    getPatient(token, patientId)
      .then(data => {
        if (!cancelled) setPatient(data)
      })
      .catch(() => {
        if (!cancelled) setPatient(null)
      })

    return () => {
      cancelled = true
    }
  }, [patientId, token])

  const handleMarkCompleted = () => {
    startMarkCompleted(async () => {
      try {
        await updateAppointment(token, appointment.id, {
          patient_id: appointment.patient_id,
          title: appointment.title,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          duration_minutes: appointment.duration_minutes,
          status: 'completed',
          notes: appointment.notes ?? null,
        })

        toast.success(t('appointmentDetail.markedCompleted'))

        onUpdated()

        onClose()
      } catch {
        toast.error(t('appointmentDetail.updateError'))
      }
    })
  }

  const handleDelete = () => {
    if (!window.confirm(t('appointments.form.confirmDelete'))) return

    startDelete(async () => {
      try {
        await deleteAppointment(token, appointment.id)

        onUpdated()

        onClose()
      } catch {
        toast.error(t('appointmentDetail.deleteError'))
      }
    })
  }

  const handleEditSuccess = () => {
    setEditingAppointment(false)

    onUpdated()

    onClose()
  }

  return (
    <>
      <Dialog open onOpenChange={open => !open && onClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{appointment.title}</DialogTitle>
          </DialogHeader>

          {hasPatient ? (
            /* Case A — appointment with patient: tabbed interface */
            <Tabs defaultValue="appointment" className="mt-2">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="appointment">
                  {t('appointmentDetail.tabs.appointment')}
                </TabsTrigger>
                <TabsTrigger value="odontogram">
                  {t('appointmentDetail.tabs.odontogram')}
                </TabsTrigger>
                <TabsTrigger value="evolutions">
                  {t('appointmentDetail.tabs.evolutions')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointment" className="mt-4">
                <AppointmentTab
                  appointment={appointment}
                  timezone={timezone}
                  onEdit={() => setEditingAppointment(true)}
                  onMarkCompleted={handleMarkCompleted}
                  isMarkingCompleted={isMarkingCompleted}
                />
              </TabsContent>

              <TabsContent value="odontogram" className="mt-4">
                {patient && token ? (
                  <OdontogramTab patientId={patient.id} token={token} />
                ) : (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evolutions" className="mt-4">
                {patient && token ? (
                  <EvolutionsTab patientId={patient.id} token={token} />
                ) : (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            /* Case B — appointment without patient */
            <div className="mt-2">
              <SimpleView
                appointment={appointment}
                timezone={timezone}
                onEdit={() => setEditingAppointment(true)}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested AppointmentForm for editing */}
      {editingAppointment && (
        <AppointmentForm
          appointment={appointment}
          timezone={timezone}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingAppointment(false)}
        />
      )}
    </>
  )
}
