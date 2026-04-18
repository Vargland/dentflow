'use client'

import { useState } from 'react'

import type { PatientFormProps } from '@/typing/components/patient.types'
import type { CreatePatientInput } from '@/typing/services/patient.interface'
import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

/**
 * Shared form for creating and editing a patient.
 * In create mode, omit the `patient` prop.
 * In edit mode, pass the full patient record.
 *
 * @param patient - Optional existing patient data (edit mode).
 * @param onSubmit - Called with the validated input when the user submits.
 * @param pending  - Controls the disabled/loading state of the submit button.
 */
const PatientForm = ({ patient, onSubmit, pending = false }: PatientFormProps) => {
  const { t } = useTranslation()

  const [sexo, setSexo] = useState(patient?.sexo ?? '')

  const fechaStr = patient?.fechaNacimiento ? patient.fechaNacimiento.split('T')[0] : ''

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const fd = new FormData(event.currentTarget)

    const input: CreatePatientInput = {
      nombre: fd.get('nombre') as string,
      apellido: fd.get('apellido') as string,
      dni: (fd.get('dni') as string) || undefined,
      fechaNacimiento: (fd.get('fechaNacimiento') as string) || undefined,
      sexo: sexo || undefined,
      telefono: (fd.get('telefono') as string) || undefined,
      email: (fd.get('email') as string) || undefined,
      direccion: (fd.get('direccion') as string) || undefined,
      alergias: (fd.get('alergias') as string) ?? '',
      medicamentos: (fd.get('medicamentos') as string) ?? '',
      antecedentes: (fd.get('antecedentes') as string) ?? '',
      obraSocial: (fd.get('obraSocial') as string) || undefined,
      nroAfiliado: (fd.get('nroAfiliado') as string) || undefined,
      notas: (fd.get('notas') as string) || undefined,
    }

    void onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal information */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('patientForm.sections.personal')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="apellido">{t('patientForm.fields.lastName')} *</Label>
            <Input id="apellido" name="apellido" defaultValue={patient?.apellido} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">{t('patientForm.fields.firstName')} *</Label>
            <Input id="nombre" name="nombre" defaultValue={patient?.nombre} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dni">{t('patientForm.fields.id')}</Label>
            <Input id="dni" name="dni" defaultValue={patient?.dni ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fechaNacimiento">{t('patientForm.fields.dob')}</Label>
            <Input
              id="fechaNacimiento"
              name="fechaNacimiento"
              type="date"
              defaultValue={fechaStr}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sexo">{t('patientForm.fields.sex')}</Label>
            <Select value={sexo} onValueChange={value => setSexo(value ?? '')}>
              <SelectTrigger id="sexo">
                <SelectValue placeholder={t('patientForm.sex.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">{t('patientForm.sex.male')}</SelectItem>
                <SelectItem value="F">{t('patientForm.sex.female')}</SelectItem>
                <SelectItem value="other">{t('patientForm.sex.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">{t('patientForm.fields.phone')}</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              defaultValue={patient?.telefono ?? ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('patientForm.fields.email')}</Label>
            <Input id="email" name="email" type="email" defaultValue={patient?.email ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="direccion">{t('patientForm.fields.address')}</Label>
            <Input id="direccion" name="direccion" defaultValue={patient?.direccion ?? ''} />
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('patientForm.sections.insurance')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="obraSocial">{t('patientForm.fields.insuranceProvider')}</Label>
            <Input id="obraSocial" name="obraSocial" defaultValue={patient?.obraSocial ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nroAfiliado">{t('patientForm.fields.memberId')}</Label>
            <Input id="nroAfiliado" name="nroAfiliado" defaultValue={patient?.nroAfiliado ?? ''} />
          </div>
        </div>
      </div>

      {/* Medical history */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('patientForm.sections.medicalHistory')}
        </h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alergias">{t('patientForm.fields.allergies')}</Label>
            <Textarea
              id="alergias"
              name="alergias"
              rows={2}
              defaultValue={patient?.alergias ?? ''}
              placeholder={t('patientForm.fields.allergiesPlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medicamentos">{t('patientForm.fields.medications')}</Label>
            <Textarea
              id="medicamentos"
              name="medicamentos"
              rows={2}
              defaultValue={patient?.medicamentos ?? ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="antecedentes">{t('patientForm.fields.medicalBackground')}</Label>
            <Textarea
              id="antecedentes"
              name="antecedentes"
              rows={3}
              defaultValue={patient?.antecedentes ?? ''}
              placeholder={t('patientForm.fields.medicalBackgroundPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('patientForm.sections.notes')}
        </h2>
        <Textarea id="notas" name="notas" rows={3} defaultValue={patient?.notas ?? ''} />
      </div>

      <Separator />

      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
        <a href={patient?.id ? `/patients/${patient.id}` : '/patients'}>
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            {t('patientForm.actions.cancel')}
          </Button>
        </a>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending
            ? t('patientForm.actions.saving')
            : patient?.id
              ? t('patientForm.actions.save')
              : t('patientForm.actions.create')}
        </Button>
      </div>
    </form>
  )
}

export default PatientForm
