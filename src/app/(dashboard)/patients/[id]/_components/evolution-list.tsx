'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, DollarSign, Loader2, Pencil, Plus } from 'lucide-react'
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
import { createEvolution, updateEvolution } from '@/services/evolution.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Returns true when updatedAt is meaningfully later than createdAt
 * (more than 5 seconds apart, to ignore DB timestamp noise).
 */
const wasEdited = (ev: Evolution): boolean => {
  if (!ev.updatedAt) return false

  const diff = new Date(ev.updatedAt).getTime() - new Date(ev.createdAt).getTime()

  return diff > 5000
}

// ── Sub-component props ───────────────────────────────────────────────────────

interface EvolutionCardProps {
  /** The evolution record to display. */
  ev: Evolution
  /** Locale code for date formatting. */
  lang: string
  /** Whether this card is in inline-edit mode. */
  isEditing: boolean
  /** Draft description text while editing. */
  editText: string
  /** Whether a save request is in flight for this card. */
  isSaving: boolean
  /** Called when the user clicks the pencil icon. */
  onEditStart: (ev: Evolution) => void
  /** Called when draft text changes. */
  onEditChange: (text: string) => void
  /** Called when the user confirms the edit. */
  onEditSave: (ev: Evolution) => void
  /** Called when the user cancels the edit. */
  onEditCancel: () => void
}

// ── Sub-component ─────────────────────────────────────────────────────────────

/**
 * Expanded body of one evolution card — description (editable), teeth, amount,
 * and an "edited at" note when the record has been modified after creation.
 */
const EvolutionCard = ({
  ev,
  lang,
  isEditing,
  editText,
  isSaving,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: EvolutionCardProps) => {
  const { t } = useTranslation()

  const edited = wasEdited(ev)

  return (
    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
      {/* Description — inline editable */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={event => onEditChange(event.target.value)}
            rows={4}
            autoFocus
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onEditCancel}>
              {t('records.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving || !editText.trim()}
              onClick={() => onEditSave(ev)}
              className="gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('records.saveChanges')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2 group">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap flex-1">
            {ev.descripcion}
          </p>
          <button
            type="button"
            onClick={() => onEditStart(ev)}
            title={t('records.edit')}
            className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-all shrink-0 mt-0.5"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Teeth */}
      {ev.dientes.length > 0 && !isEditing && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('records.teeth')}</span>
          {ev.dientes.map(toothNumber => (
            <Badge key={toothNumber} variant="secondary" className="text-xs px-1.5">
              {toothNumber}
            </Badge>
          ))}
        </div>
      )}

      {/* Amount + paid status */}
      {ev.importe !== null && !isEditing && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('records.amount')}: <span className="font-medium">${ev.importe.toLocaleString()}</span>
          {' — '}
          <span className={ev.pagado ? 'text-green-600' : 'text-orange-500'}>
            {ev.pagado ? t('records.paid') : t('records.pending')}
          </span>
        </p>
      )}

      {/* Edited note */}
      {!isEditing && edited && ev.updatedAt && (
        <p className="text-[11px] text-gray-300 dark:text-gray-600 italic">
          {t('records.editedAt', { date: formatDate(ev.updatedAt, lang) })}
        </p>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Renders the clinical evolution history for a patient and provides
 * a form to add new records. Supports inline editing of existing records.
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

  const [editingEvId, setEditingEvId] = useState<string | null>(null)

  const [editingEvText, setEditingEvText] = useState('')

  const [savingEvId, setSavingEvId] = useState<string | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = event.currentTarget

    const fd = new FormData(form)

    const dienteStr = (fd.get('dientes') as string) ?? ''

    const dientes = dienteStr
      ? dienteStr
          .split(',')
          .map(Number)
          .filter(toothNumber => !Number.isNaN(toothNumber))
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

  /**
   * Starts inline editing for the given evolution record.
   *
   * @param ev - The evolution to edit.
   */
  const handleEditStart = (ev: Evolution) => {
    setEditingEvId(ev.id)

    setEditingEvText(ev.descripcion)

    setExpanded(ev.id)
  }

  /**
   * Saves the inline edit for the given evolution record.
   *
   * @param ev - The evolution being saved.
   */
  const handleEditSave = async (ev: Evolution) => {
    if (!editingEvText.trim() || savingEvId === ev.id) return

    setSavingEvId(ev.id)

    try {
      const updated = await updateEvolution({
        token,
        patientId,
        evolutionId: ev.id,
        input: { descripcion: editingEvText.trim() },
      })

      setEvolutions(prev =>
        prev.map(evolution => (evolution.id === updated.id ? updated : evolution))
      )

      setEditingEvId(null)

      toast.success(t('records.updated'))
    } catch {
      toast.error(t('appointmentDetail.evolutionError'))
    } finally {
      setSavingEvId(null)
    }
  }

  const handleEditCancel = () => setEditingEvId(null)

  // ── Render ───────────────────────────────────────────────────────────────────

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
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {t('records.newRecordTitle')}
          </h3>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('records.teethHint')}</p>
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
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="font-medium">{t('records.empty')}</p>
          <p className="text-sm mt-1">{t('records.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {evolutions.map(ev => (
            <div
              key={ev.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0 font-mono">
                    {formatDate(ev.fecha, i18n.language)}
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {ev.descripcion}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {wasEdited(ev) && (
                    <span className="hidden sm:inline text-[10px] text-gray-300 dark:text-gray-600 italic">
                      {t('records.edited')}
                    </span>
                  )}
                  {ev.dientes.length > 0 && (
                    <div className="hidden sm:flex gap-1">
                      {ev.dientes.slice(0, 3).map(toothNumber => (
                        <Badge key={toothNumber} variant="secondary" className="text-xs px-1.5">
                          {toothNumber}
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

              {expanded === ev.id && (
                <EvolutionCard
                  ev={ev}
                  lang={i18n.language}
                  isEditing={editingEvId === ev.id}
                  editText={editingEvText}
                  isSaving={savingEvId === ev.id}
                  onEditStart={handleEditStart}
                  onEditChange={setEditingEvText}
                  onEditSave={handleEditSave}
                  onEditCancel={handleEditCancel}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EvolutionList
