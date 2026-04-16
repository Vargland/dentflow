'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSession } from 'next-auth/react'
import { format, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { Loader2, Trash2 } from 'lucide-react'

import type { Appointment } from '@/typing/services/appointment.interface'
import type { PatientListItem } from '@/typing/services/patient.interface'
import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createAppointment,
  deleteAppointment,
  updateAppointment,
} from '@/services/appointments.service'
import { getPatients } from '@/services/patients.service'

/** Formats a local date/time as HH:mm for an <input type="time"> */
const toTimeInput = (date: Date) => format(date, 'HH:mm')

/** Formats a local date as yyyy-MM-dd for an <input type="date"> */
const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd')

interface AppointmentFormProps {
  /** Appointment being edited, or null when creating a new one. */
  appointment: Appointment | null
  /** UTC datetime to pre-fill the start time (for click-to-create). */
  defaultStart?: Date
  /** IANA timezone of the doctor. */
  timezone: string
  /** Called after a successful create/update/delete. */
  onSuccess: () => void
  /** Called when the dialog is dismissed. */
  onClose: () => void
}

/**
 * Modal dialog for creating or editing an appointment.
 * All times are shown in the doctor's local timezone and converted to UTC before sending.
 */
export const AppointmentForm = ({
  appointment,
  defaultStart,
  timezone,
  onSuccess,
  onClose,
}: AppointmentFormProps) => {
  const { data: session } = useSession()

  const { t } = useTranslation()

  // Determine initial local date/time
  const initialLocal = (() => {
    if (appointment) return toZonedTime(parseISO(appointment.start_time), timezone)

    if (defaultStart) return toZonedTime(defaultStart, timezone)

    return toZonedTime(new Date(), timezone)
  })()

  const initialEndLocal = (() => {
    if (appointment) return toZonedTime(parseISO(appointment.end_time), timezone)

    const d = new Date(initialLocal)

    d.setMinutes(d.getMinutes() + 30)

    return d
  })()

  const [date, setDate] = useState(toDateInput(initialLocal))

  const [startTime, setStartTime] = useState(toTimeInput(initialLocal))

  const [endTime, setEndTime] = useState(toTimeInput(initialEndLocal))

  const [title, setTitle] = useState(appointment?.title ?? '')

  const [patientId, setPatientId] = useState<string>(appointment?.patient_id ?? '')

  const [status, setStatus] = useState(appointment?.status ?? 'scheduled')

  const [notes, setNotes] = useState(appointment?.notes ?? '')

  const [error, setError] = useState('')

  const [patients, setPatients] = useState<PatientListItem[]>([])

  const [patientSearch, setPatientSearch] = useState('')

  const [isSaving, startSave] = useTransition()

  const [isDeleting, startDelete] = useTransition()

  // Load patients for autocomplete
  useEffect(() => {
    if (!session?.accessToken) return

    getPatients(session.accessToken as string, patientSearch || undefined)
      .then(setPatients)
      .catch(() => setPatients([]))
  }, [session?.accessToken, patientSearch])

  const buildPayload = () => {
    // Combine date + time inputs into a local datetime, then convert to UTC
    const startLocal = new Date(`${date}T${startTime}:00`)

    const endLocal = new Date(`${date}T${endTime}:00`)

    const startUTC = fromZonedTime(startLocal, timezone)

    const endUTC = fromZonedTime(endLocal, timezone)

    const durationMinutes = Math.round((endUTC.getTime() - startUTC.getTime()) / 60000)

    return {
      patient_id: patientId || null,
      title: title.trim(),
      start_time: startUTC.toISOString(),
      end_time: endUTC.toISOString(),
      duration_minutes: durationMinutes > 0 ? durationMinutes : 30,
      status,
      notes: notes.trim() || null,
    }
  }

  const handleSave = () => {
    setError('')

    const token = session?.accessToken as string

    startSave(async () => {
      try {
        const payload = buildPayload()

        if (appointment) {
          await updateAppointment(token, appointment.id, payload)
        } else {
          await createAppointment(token, payload)
        }

        onSuccess()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error'

        if (msg.toLowerCase().includes('overlap') || msg.toLowerCase().includes('overlap')) {
          setError(t('appointments.overlap'))
        } else {
          setError(msg)
        }
      }
    })
  }

  const handleDelete = () => {
    if (!appointment) return

    if (!window.confirm(t('appointments.form.confirmDelete'))) return

    const token = session?.accessToken as string

    startDelete(async () => {
      await deleteAppointment(token, appointment.id)

      onSuccess()
    })
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {appointment ? t('appointments.form.editTitle') : t('appointments.form.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-title">{t('appointments.form.appointmentTitle')}</Label>
            <Input
              id="appt-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('appointments.form.appointmentTitlePlaceholder')}
            />
          </div>

          {/* Patient search */}
          <div className="space-y-1.5">
            <Label>{t('appointments.form.patient')}</Label>
            <Input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              placeholder={t('appointments.form.patientPlaceholder')}
            />
            {patients.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                  onClick={() => {
                    setPatientId('')

                    setPatientSearch('')
                  }}
                >
                  {t('appointments.form.noPatient')}
                </button>
                {patients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                    onClick={() => {
                      setPatientId(p.id)

                      setPatientSearch(`${p.nombre} ${p.apellido}`)
                    }}
                  >
                    {p.nombre} {p.apellido}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-date">{t('appointments.form.date')}</Label>
            <Input
              id="appt-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="appt-start">{t('appointments.form.startTime')}</Label>
              <Input
                id="appt-start"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appt-end">{t('appointments.form.endTime')}</Label>
              <Input
                id="appt-end"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>{t('appointments.form.status')}</Label>
            <Select value={status} onValueChange={v => setStatus(v ?? 'scheduled')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">
                  {t('appointments.form.statuses.scheduled')}
                </SelectItem>
                <SelectItem value="completed">
                  {t('appointments.form.statuses.completed')}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t('appointments.form.statuses.cancelled')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-notes">{t('appointments.form.notes')}</Label>
            <Textarea
              id="appt-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('appointments.form.notesPlaceholder')}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {appointment && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 sm:mr-auto"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2">{t('appointments.form.delete')}</span>
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
            {t('appointments.form.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isDeleting || !title.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('appointments.form.saving')}
              </>
            ) : (
              t('appointments.form.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
