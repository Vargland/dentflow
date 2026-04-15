'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, DollarSign, Plus } from 'lucide-react'
import { toast } from 'sonner'

import type { EvolutionListProps } from '@/typing/components/evolution.types'
import type { Evolution } from '@/typing/services/evolution.interface'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEvolution } from '@/services/evolution.service'

/**
 * Formats a date string for display.
 *
 * @param dateStr - ISO date string.
 * @param lang    - Locale code (e.g. 'es' or 'en').
 * @returns Localised date string.
 */
const formatDate = (dateStr: string, lang: string) =>
  new Date(dateStr).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

/** Displays one expanded evolution card. */
const EvolutionCard = ({ ev }: { ev: Evolution }) => {
  const { t } = useTranslation()

  return (
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
  )
}

/**
 * Renders the clinical evolution history for a patient and provides
 * a form to add new records.
 *
 * @param patientId  - UUID of the patient.
 * @param evolutions - Pre-fetched list of evolutions (SSR).
 * @param token      - JWT Bearer token for API calls.
 */
const EvolutionList = ({ patientId, evolutions: initial, token }: EvolutionListProps) => {
  const { t, i18n } = useTranslation()

  const [evolutions, setEvolutions] = useState<Evolution[]>(initial)

  const [showForm, setShowForm] = useState(false)

  const [pending, startTransition] = useTransition()

  const [expanded, setExpanded] = useState<string | null>(initial[0]?.id ?? null)

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

    startTransition(async () => {
      const created = await createEvolution(token, patientId, {
        descripcion: fd.get('descripcion') as string,
        dientes,
        importe,
      })

      setEvolutions(prev => [created, ...prev])

      setExpanded(created.id)

      setShowForm(false)

      toast.success(t('records.saved'))

      form.reset()
    })
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showForm ? t('records.cancel') : t('records.newRecord')}
        </Button>
      </div>

      {/* New record form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 text-sm">{t('records.newRecordTitle')}</h3>
          <div className="space-y-1.5">
            <Label htmlFor="descripcion">{t('records.description')} *</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              required
              placeholder={t('records.descriptionPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dientes">{t('records.teethTreated')}</Label>
              <Input id="dientes" name="dientes" placeholder={t('records.teethPlaceholder')} />
              <p className="text-xs text-gray-500">{t('records.teethHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="importe">{t('records.amount')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="importe"
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
          <div className="flex justify-end">
            <Button type="submit" disabled={pending} size="sm">
              {pending ? t('records.saving') : t('records.save')}
            </Button>
          </div>
        </form>
      )}

      {/* Records list */}
      {evolutions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="font-medium">{t('records.empty')}</p>
          <p className="text-sm mt-1">{t('records.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evolutions.map(ev => (
            <div
              key={ev.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-gray-500 shrink-0 font-mono">
                    {formatDate(ev.fecha, i18n.language)}
                  </span>
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
                  {expanded === ev.id ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expanded === ev.id && <EvolutionCard ev={ev} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EvolutionList
