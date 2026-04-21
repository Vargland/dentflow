'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type {
  ActiveTool,
  MarkType,
  OdontogramProps,
  Surface,
  ToothState,
} from '@/typing/components/odontogram.types'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  HEALTHY_COLOR,
  MARK,
  MARK_TYPES,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  TOOL_COLORS,
} from '@/constants/odontogram'
import { saveOdontogram } from '@/services/odontogram.service'

import ToothSVG from './tooth-svg'
import { useOdontogramState } from './use-odontogram-state'

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToothRowProps {
  /** FDI numbers to render in order. */
  teeth: readonly number[]
  /** Full state map keyed by FDI number. */
  stateMap: Record<number, ToothState>
  /** Whether the row belongs to the upper arch (number label above). */
  isUpper: boolean
  /** Callback when the user clicks a surface. */
  onSurfaceClick: (fdi: number, surface: Surface) => void
}

/**
 * Renders a horizontal row of SVG teeth.
 *
 * @param teeth          - FDI numbers to render.
 * @param stateMap       - Full odontogram state map.
 * @param isUpper        - True if this row belongs to the upper arch.
 * @param onSurfaceClick - Surface click callback.
 */
const ToothRow = ({ teeth, stateMap, isUpper, onSurfaceClick }: ToothRowProps) => (
  <div className="flex justify-center gap-1 flex-wrap">
    {teeth.map(fdi => (
      <div key={fdi} className="flex flex-col items-center gap-0.5">
        {isUpper && (
          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono leading-none">
            {fdi}
          </span>
        )}
        <ToothSVG
          fdi={fdi}
          state={
            stateMap[fdi] ?? {
              mark: null,
              surfaces: { V: null, P: null, M: null, D: null, O: null },
            }
          }
          onSurfaceClick={surface => onSurfaceClick(fdi, surface)}
        />
        {!isUpper && (
          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono leading-none">
            {fdi}
          </span>
        )}
      </div>
    ))}
  </div>
)

// ── Midline divider ───────────────────────────────────────────────────────────

interface MidlineProps {
  /** Translated midline label. */
  label: string
}

/**
 * Horizontal dashed midline divider with a centred label.
 *
 * @param label - Translated text shown between the dashes.
 */
const Midline = ({ label }: MidlineProps) => (
  <div className="flex items-center gap-2 my-1">
    <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
  </div>
)

// ── Section label ─────────────────────────────────────────────────────────────

interface SectionLabelProps {
  /** Text to display. */
  label: string
}

/**
 * Small all-caps section heading.
 *
 * @param label - Text to display.
 */
const SectionLabel = ({ label }: SectionLabelProps) => (
  <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest">
    {label}
  </p>
)

// ── Odontogram ────────────────────────────────────────────────────────────────

/**
 * Interactive SVG-based clinical odontogram.
 * Shared component used in the patient detail page and appointment detail modal.
 *
 * Features:
 * - 5 individually clickable surfaces per tooth (M, D, V, P, O)
 * - Whole-tooth marks: crown, extraction, rootcanal, extracted
 * - Permanent and temporary dentition tabs
 * - Metrics summary (cavities, fillings, missing, healthy)
 * - API persistence via the Guardar button
 *
 * @param patientId   - UUID of the patient (also used as localStorage key).
 * @param initialData - Pre-fetched odontogram state from the API, may be null.
 * @param token       - JWT Bearer token for API calls.
 */
const Odontogram = ({ patientId, initialData, token }: OdontogramProps) => {
  const { t } = useTranslation()

  const [pending, startTransition] = useTransition()

  const {
    teeth,
    activeTool,
    dentition,
    selectedTooth,
    dirty,
    metrics,
    setActiveTool,
    setDentition,
    handleSurfaceClick,
    clearAll,
    markSaved,
  } = useOdontogramState(patientId, initialData)

  const handleSave = () => {
    startTransition(async () => {
      await saveOdontogram(token, patientId, {
        data: teeth as Record<string, unknown>,
      })

      markSaved()

      toast.success(t('odontogram.saved'))
    })
  }

  // Selected tooth info for the right panel
  const selectedState = selectedTooth ? teeth[selectedTooth] : null

  const markedSurfaces = selectedState
    ? (Object.entries(selectedState.surfaces) as Array<[Surface, MarkType | null]>)
        .filter(([, mark]) => mark !== null)
        .map(([surface, mark]) => `${surface}: ${t(`odontogram.tools.${mark as MarkType}`)}`)
    : []

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {MARK_TYPES.map(tool => (
          <button
            key={tool}
            type="button"
            onClick={() => setActiveTool(tool as ActiveTool)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
              activeTool === tool
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400'
            )}
          >
            <span
              className="h-3 w-3 rounded-sm border border-gray-300 dark:border-gray-500 shrink-0"
              style={{ backgroundColor: TOOL_COLORS[tool] }}
            />
            {t(`odontogram.tools.${tool}`)}
          </button>
        ))}

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
        >
          {t('odontogram.clearAll')}
        </button>
      </div>

      {/* ── Dentition tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(['permanent', 'temporary'] as const).map(dentitionOption => (
          <button
            key={dentitionOption}
            type="button"
            onClick={() => setDentition(dentitionOption)}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-t transition-colors',
              dentition === dentitionOption
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-b-0 border-gray-200 dark:border-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {t(`odontogram.${dentitionOption}`)}
          </button>
        ))}
      </div>

      {/* ── Main layout: odontogram + right panel ───────────────────────────── */}
      <div className="flex gap-4">
        {/* Odontogram grid */}
        <div className="flex-1 space-y-2">
          {dentition === 'permanent' ? (
            <>
              <SectionLabel label={t('odontogram.upper')} />
              <ToothRow
                teeth={PERMANENT_UPPER}
                stateMap={teeth}
                isUpper
                onSurfaceClick={handleSurfaceClick}
              />
              <Midline label={t('odontogram.midline')} />
              <ToothRow
                teeth={PERMANENT_LOWER}
                stateMap={teeth}
                isUpper={false}
                onSurfaceClick={handleSurfaceClick}
              />
              <SectionLabel label={t('odontogram.lower')} />
            </>
          ) : (
            <>
              <SectionLabel label={t('odontogram.upperTemp')} />
              <ToothRow
                teeth={TEMPORARY_UPPER}
                stateMap={teeth}
                isUpper
                onSurfaceClick={handleSurfaceClick}
              />
              <Midline label={t('odontogram.midline')} />
              <ToothRow
                teeth={TEMPORARY_LOWER}
                stateMap={teeth}
                isUpper={false}
                onSurfaceClick={handleSurfaceClick}
              />
              <SectionLabel label={t('odontogram.lowerTemp')} />
            </>
          )}
        </div>

        {/* Right panel */}
        <aside className="w-40 shrink-0 space-y-4">
          {/* Legend */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {t('odontogram.legend')}
            </p>
            {MARK_TYPES.map(tool => (
              <div key={tool} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: TOOL_COLORS[tool] }}
                />
                <span className="text-[10px] text-gray-600 dark:text-gray-300">
                  {t(`odontogram.tools.${tool}`)}
                </span>
              </div>
            ))}
          </div>

          {/* Selected tooth info */}
          {selectedTooth !== null && selectedState !== null && (
            <div className="space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {t('odontogram.tooth', { number: selectedTooth })}
              </p>
              {selectedState.mark !== null && (
                <p className="text-[10px] text-gray-700 dark:text-gray-300">
                  {t('odontogram.toothMark')}:{' '}
                  <span style={{ color: TOOL_COLORS[selectedState.mark] }}>
                    {t(`odontogram.tools.${selectedState.mark}`)}
                  </span>
                </p>
              )}
              {markedSurfaces.length > 0 ? (
                <ul className="space-y-0.5">
                  {markedSurfaces.map(surfaceLabel => (
                    <li key={surfaceLabel} className="text-[10px] text-gray-600 dark:text-gray-300">
                      {surfaceLabel}
                    </li>
                  ))}
                </ul>
              ) : (
                selectedState.mark === null && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {t('odontogram.toothHealthy')}
                  </p>
                )
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Metrics row ─────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap border-t border-gray-100 dark:border-gray-700 pt-3">
        {(
          [
            { key: 'cavities', value: metrics.cavities, color: TOOL_COLORS[MARK.CAVITY] },
            { key: 'fillings', value: metrics.fillings, color: TOOL_COLORS[MARK.FILLED] },
            { key: 'missing', value: metrics.missing, color: TOOL_COLORS[MARK.EXTRACTED] },
            { key: 'healthy', value: metrics.healthy, color: HEALTHY_COLOR },
          ] as const
        ).map(({ key, value, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t(`odontogram.metrics.${key}`)}:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending} size="sm" type="button">
          {pending ? t('odontogram.saving') : t('odontogram.save')}
        </Button>
      </div>
    </div>
  )
}

export default Odontogram
