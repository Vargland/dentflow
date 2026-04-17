import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react'

import type { PatientPageParams } from '@/typing/pages/patients.types'
import type { OdontogramState } from '@/typing/services/odontogram.interface'
import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Odontogram from '@/components/odontogram/odontogram'
import { ApiError } from '@/services/api-client'
import { getEvolutions } from '@/services/evolution.service'
import { getPatient } from '@/services/patients.service'

import EvolutionList from './_components/evolution-list'

/**
 * Calculates age in years from a date-of-birth string.
 *
 * @param dob - ISO date string.
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

/** Patient detail page: odontogram, clinical records, and medical history. */
export default async function PatientPage({ params }: PatientPageParams) {
  const { id } = await params

  const session = await auth()

  const token = session?.accessToken ?? ''

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  let patient

  try {
    patient = await getPatient(token, id)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound()

    notFound()
  }

  const evolutions = await getEvolutions(token, id).catch(() => [])

  const age = patient.fechaNacimiento ? calcAge(patient.fechaNacimiento) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/patients">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.apellido}, {patient.nombre}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {patient.dni && <span className="text-sm text-gray-500">ID {patient.dni}</span>}
              {age !== null && (
                <Badge variant="secondary">{t('patientDetail.yearsOld', { age })}</Badge>
              )}
              {patient.obraSocial && (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {patient.obraSocial}
                  {patient.nroAfiliado && ` - ${patient.nroAfiliado}`}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link href={`/patients/${id}/edit`}>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Pencil className="h-4 w-4" />
            {t('patientDetail.edit')}
          </Button>
        </Link>
      </div>

      {/* Quick contact info */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        {patient.telefono && (
          <a
            href={`tel:${patient.telefono}`}
            className="flex items-center gap-1.5 hover:text-blue-600"
          >
            <Phone className="h-4 w-4" />
            {patient.telefono}
          </a>
        )}
        {patient.email && (
          <a
            href={`mailto:${patient.email}`}
            className="flex items-center gap-1.5 hover:text-blue-600"
          >
            <Mail className="h-4 w-4" />
            {patient.email}
          </a>
        )}
        {patient.direccion && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {patient.direccion}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="odontogram" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="odontogram">{t('patientDetail.tabs.odontogram')}</TabsTrigger>
          <TabsTrigger value="evolution">
            {t('patientDetail.tabs.records')} ({evolutions.length})
          </TabsTrigger>
          <TabsTrigger value="historia">{t('patientDetail.tabs.medicalHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="odontogram">
          <Odontogram
            patientId={patient.id}
            initialData={patient.odontograma as OdontogramState | null}
            token={token}
          />
        </TabsContent>

        <TabsContent value="evolution">
          <EvolutionList patientId={patient.id} evolutions={evolutions} token={token} />
        </TabsContent>

        <TabsContent value="historia">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            {[
              {
                label: t('patientDetail.medicalHistory.allergies'),
                value: patient.alergias,
              },
              {
                label: t('patientDetail.medicalHistory.medications'),
                value: patient.medicamentos,
              },
              {
                label: t('patientDetail.medicalHistory.background'),
                value: patient.antecedentes,
              },
              {
                label: t('patientDetail.medicalHistory.notes'),
                value: patient.notas,
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{label}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {value ?? (
                    <span className="text-gray-400 italic">
                      {t('patientDetail.medicalHistory.noData')}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
