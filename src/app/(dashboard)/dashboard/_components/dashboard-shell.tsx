'use client'

import { useState } from 'react'

import type { Appointment } from '@/typing/services/appointment.interface'
import { AppointmentForm } from '@/app/(dashboard)/appointments/_components/appointment-form'

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
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)

  const [selectedId, setSelectedId] = useState<string | null>(
    // Auto-select the first scheduled appointment of today, if any
    initialAppointments.find(a => a.status === 'scheduled')?.id ?? null
  )

  const [showNewForm, setShowNewForm] = useState(false)

  const [prefilledPatientId, setPrefilledPatientId] = useState<string | null>(null)

  const selectedAppointment = appointments.find(a => a.id === selectedId) ?? null

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Update the local status of an appointment after a mutation. */
  const handleAppointmentUpdated = (id: string, status: string) => {
    setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)))
  }

  /** Open the appointment form pre-filled with the given patient. */
  const handleScheduleAppointment = (patientId: string) => {
    setPrefilledPatientId(patientId)

    setShowNewForm(true)
  }

  /** Called when the new appointment form succeeds. */
  const handleFormSuccess = () => {
    setShowNewForm(false)

    setPrefilledPatientId(null)
    // No need to refresh — new appointment likely isn't today or not relevant
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
            onSelect={appt => setSelectedId(appt.id)}
            onNewAppointment={() => {
              setPrefilledPatientId(null)

              setShowNewForm(true)
            }}
          />
        </div>

        {/* Right — patient file (flex-1) */}
        <div className="flex-1 min-w-0">
          <PatientPanel
            appointment={selectedAppointment}
            onAppointmentUpdated={handleAppointmentUpdated}
            onScheduleAppointment={handleScheduleAppointment}
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
    </>
  )
}

export default DashboardShell
