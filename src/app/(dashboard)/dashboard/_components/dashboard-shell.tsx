'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

import type { Appointment } from '@/typing/services/appointment.interface'
import type { OdontogramState } from '@/typing/services/odontogram.interface'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Odontogram from '@/components/odontogram/odontogram'
import { AppointmentForm } from '@/app/(dashboard)/appointments/_components/appointment-form'
import { listAppointments } from '@/services/appointments.service'
import { getOdontogram } from '@/services/odontogram.service'

import AgendaPanel from './agenda-panel'
import PatientPanel from './patient-panel'

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for DashboardShell. */
export interface DashboardShellProps {
  /** Today's appointments pre-fetched server-side. */
  initialAppointments: Appointment[]
  /** Doctor's IANA timezone. */
  timezone: string
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client shell for the dashboard page.
 * Manages selected appointment state and wires AgendaPanel ↔ PatientPanel.
 *
 * @param initialAppointments - Server-fetched appointments for today.
 * @param timezone            - Doctor's IANA timezone for time display.
 */
const DashboardShell = ({ initialAppointments, timezone }: DashboardShellProps) => {
  const { data: session } = useSession()

  const token = (session?.accessToken as string) ?? ''

  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)

  const [selectedId, setSelectedId] = useState<string | null>(
    // Auto-select the first scheduled appointment of today, if any
    initialAppointments.find(appointment => appointment.status === 'scheduled')?.id ?? null
  )

  const [showNewForm, setShowNewForm] = useState(false)

  const [prefilledPatientId, setPrefilledPatientId] = useState<string | null>(null)

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  // Date navigation — start at today, shift ±1 day with arrows
  const [viewDate, setViewDate] = useState<Date>(() => {
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    return today
  })

  // Odontogram modal state
  const [odontogramPatientId, setOdontogramPatientId] = useState<string | null>(null)

  const [odontogramData, setOdontogramData] = useState<OdontogramState | null>(null)

  const [odontogramLoading, setOdontogramLoading] = useState(false)

  const selectedAppointment =
    appointments.find(appointment => appointment.id === selectedId) ?? null

  // ── Handlers ────────────────────────────────────────────────────────────────

  /**
   * Update the local status of an appointment after a mutation.
   * If a nextId is provided, automatically advance to that appointment.
   */
  const handleAppointmentUpdated = (id: string, status: string, nextId?: string | null) => {
    setAppointments(prev =>
      prev.map(appointment => (appointment.id === id ? { ...appointment, status } : appointment))
    )

    if (nextId) {
      setSelectedId(nextId)
    }
  }

  /** Open the appointment form pre-filled with the given patient. */
  const handleScheduleAppointment = (patientId: string) => {
    setPrefilledPatientId(patientId)

    setShowNewForm(true)
  }

  /** Re-fetches appointments for the given date and updates state. */
  const refreshAppointments = async (date: Date) => {
    if (!token) return

    try {
      const startOfDay = new Date(date)

      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)

      endOfDay.setHours(23, 59, 59, 999)

      const fresh = await listAppointments(token, startOfDay.toISOString(), endOfDay.toISOString())

      const sorted = [...fresh].sort(
        (first, second) =>
          new Date(first.start_time).getTime() - new Date(second.start_time).getTime()
      )

      setAppointments(sorted)

      setSelectedId(sorted.find(appointment => appointment.status === 'scheduled')?.id ?? null)
    } catch {
      // Keep existing list if refresh fails
    }
  }

  /**
   * Called when the new appointment form succeeds.
   * Re-fetches appointments for the current view date.
   */
  const handleFormSuccess = async () => {
    setShowNewForm(false)

    setPrefilledPatientId(null)

    await refreshAppointments(viewDate)
  }

  /** Navigate to the previous day. */
  const handlePrevDay = async () => {
    const prev = new Date(viewDate)

    prev.setDate(prev.getDate() - 1)

    setViewDate(prev)

    await refreshAppointments(prev)
  }

  /** Navigate to the next day. */
  const handleNextDay = async () => {
    const next = new Date(viewDate)

    next.setDate(next.getDate() + 1)

    setViewDate(next)

    await refreshAppointments(next)
  }

  /** Navigate back to today. */
  const handleToday = async () => {
    const today = new Date()

    today.setHours(0, 0, 0, 0)

    setViewDate(today)

    await refreshAppointments(today)
  }

  /** Called after editing an appointment (e.g. assigning a patient). */
  const handleEditSuccess = async () => {
    setEditingAppointment(null)

    await refreshAppointments(viewDate)
  }

  /** Open the odontogram modal for the given patient. */
  const handleOpenOdontogram = async (patientId: string) => {
    setOdontogramPatientId(patientId)

    setOdontogramData(null)

    setOdontogramLoading(true)

    try {
      const res = await getOdontogram(token, patientId)

      setOdontogramData((res.data as OdontogramState) ?? null)
    } catch {
      setOdontogramData(null)
    } finally {
      setOdontogramLoading(false)
    }
  }

  /** Close the odontogram modal. */
  const handleCloseOdontogram = () => {
    setOdontogramPatientId(null)

    setOdontogramData(null)
  }

  return (
    <>
      {/* Two-column layout */}
      <div className="flex gap-4 h-[calc(100vh-7rem)]">
        {/* Left — agenda (35%) */}
        <div className="w-[340px] shrink-0">
          <AgendaPanel
            appointments={appointments}
            selectedId={selectedId}
            viewDate={viewDate}
            onSelect={appt => setSelectedId(appt.id)}
            onNewAppointment={() => {
              setPrefilledPatientId(null)

              setShowNewForm(true)
            }}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
            onToday={handleToday}
          />
        </div>

        {/* Right — patient file (flex-1) */}
        <div className="flex-1 min-w-0">
          <PatientPanel
            appointment={selectedAppointment}
            appointments={appointments}
            onAppointmentUpdated={handleAppointmentUpdated}
            onScheduleAppointment={handleScheduleAppointment}
            onOpenOdontogram={handleOpenOdontogram}
            onEditAppointment={appt => setEditingAppointment(appt)}
          />
        </div>
      </div>

      {/* New appointment modal */}
      {showNewForm && (
        <AppointmentForm
          appointment={null}
          timezone={timezone}
          prefilledPatientId={prefilledPatientId ?? undefined}
          onSuccess={handleFormSuccess}
          onClose={() => {
            setShowNewForm(false)

            setPrefilledPatientId(null)
          }}
        />
      )}

      {/* Edit appointment modal (assign existing patient) */}
      {editingAppointment && (
        <AppointmentForm
          appointment={editingAppointment}
          timezone={timezone}
          onSuccess={handleEditSuccess}
          onClose={() => setEditingAppointment(null)}
        />
      )}

      {/* Odontogram modal */}
      {odontogramPatientId && (
        <Dialog open onOpenChange={open => !open && handleCloseOdontogram()}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Odontograma</DialogTitle>
            </DialogHeader>

            {odontogramLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </div>
            ) : (
              <Odontogram
                patientId={odontogramPatientId}
                initialData={odontogramData}
                token={token}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default DashboardShell
