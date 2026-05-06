'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type {
  ActiveTool,
  AnnotationScheme,
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
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  SCHEME_MARK_TYPES,
  SCHEME_TOOL_COLORS,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
} from '@/constants/odontogram'
import { saveOdontogram } from '@/services/odontogram.service'

import ProsthesisOverlay, {
  PROSTHESIS_ROW_PADDING_BOTTOM,
  PROSTHESIS_ROW_PADDING_TOP,
} from './prosthesis-overlay'
import ToothSVG from './tooth-svg'
import { useOdontogramState } from './use-odontogram-state'

// ── Layout constants (must stay in sync with ProsthesisOverlay) ───────────────
const TOOTH_SIZE = 40

const GAP = 4

/**
 * Converts internal OdontogramData to the API wire format.
 * Internal: { mark, surfaces: {V,P,M,D,O} }
 * API:      { V, L, M, D, O } where L is the palatal/lingual surface (P internally)
 */
const serializeForApi = (
  teeth: Record<number, ToothState>
): Record<string, Record<string, string>> => {
  const result: Record<string, Record<string, string>> = {}

  for (const [fdi, tooth] of Object.entries(teeth)) {
    const apiTooth: Record<string, string> = {}

    if (tooth.surfaces.V) apiTooth['V'] = tooth.surfaces.V

    if (tooth.surfaces.M) apiTooth['M'] = tooth.surfaces.M

    if (tooth.surfaces.D) apiTooth['D'] = tooth.surfaces.D

    if (tooth.surfaces.O) apiTooth['O'] = tooth.surfaces.O

    if (tooth.surfaces.P) apiTooth['L'] = tooth.surfaces.P

    if (tooth.mark) apiTooth['mark'] = tooth.mark

    result[fdi] = apiTooth
  }

  return result
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToothRowProps {
  /** FDI numbers to render in order. */
  teeth: readonly number[]
  /** Full state map keyed by FDI number. */
  stateMap: Record<number, ToothState>
  /** Whether the row belongs to the upper arch (number label above). */
  isUpper: boolean
  /** Active annotation scheme. */
  scheme: AnnotationScheme
  /** FDI numbers currently in the multi-tooth selection buffer. */
  selectionBuffer: number[]
  /** Whether multi-tooth selection mode is active. */
  isMultiSelectMode: boolean
  /** Callback when the user clicks a surface (single-tooth mode). */
  onSurfaceClick: (fdi: number, surface: Surface) => void
  /** Callback when the user clicks a tooth in multi-select mode. */
  onToothBufferToggle: (fdi: number) => void
}

/**
 * Renders a horizontal row of SVG teeth with prosthesis bracket overlays.
 *
 * @param teeth              - FDI numbers to render.
 * @param stateMap           - Full odontogram state map.
 * @param isUpper            - True if this row belongs to the upper arch.
 * @param scheme             - Active annotation scheme.
 * @param selectionBuffer    - FDI numbers currently buffered for multi-select.
 * @param isMultiSelectMode  - Whether multi-tooth selection is active.
 * @param onSurfaceClick     - Surface click callback for normal tools.
 * @param onToothBufferToggle - Toggle callback for multi-select tools.
 */
const ToothRow = ({
  teeth,
  stateMap,
  isUpper,
  scheme,
  selectionBuffer,
  isMultiSelectMode,
  onSurfaceClick,
  onToothBufferToggle,
}: ToothRowProps) => {
  const rowWidth = teeth.length * TOOTH_SIZE + (teeth.length - 1) * GAP

  const fixedSet = new Set(teeth.filter(fdi => stateMap[fdi]?.mark === 'fixed_prosthesis'))

  const removableSet = new Set(teeth.filter(fdi => stateMap[fdi]?.mark === 'removable_prosthesis'))

  const hasProsthesis = fixedSet.size > 0 || removableSet.size > 0

  return (
    <div className="flex justify-center">
      <div
        className="relative flex gap-1"
        style={{
          width: rowWidth,
          ...(hasProsthesis && isUpper ? { paddingTop: PROSTHESIS_ROW_PADDING_TOP } : {}),
          ...(hasProsthesis && !isUpper ? { paddingBottom: PROSTHESIS_ROW_PADDING_BOTTOM } : {}),
        }}
      >
        {hasProsthesis && fixedSet.size > 0 && (
          <ProsthesisOverlay
            rowFdis={teeth}
            teethWithMark={fixedSet}
            markType="fixed_prosthesis"
            rowWidth={rowWidth}
            isUpper={isUpper}
          />
        )}

        {hasProsthesis && removableSet.size > 0 && (
          <ProsthesisOverlay
            rowFdis={teeth}
            teethWithMark={removableSet}
            markType="removable_prosthesis"
            rowWidth={rowWidth}
            isUpper={isUpper}
          />
        )}

        {teeth.map(fdi => (
          <div
            key={fdi}
            className={cn(
              'flex flex-col items-center gap-0.5',
              isMultiSelectMode && 'cursor-pointer'
            )}
            onClick={isMultiSelectMode ? () => onToothBufferToggle(fdi) : undefined}
          >
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
              scheme={scheme}
              inSelectionBuffer={selectionBuffer.includes(fdi)}
              onSurfaceClick={surface => {
                if (!isMultiSelectMode) onSurfaceClick(fdi, surface)
              }}
            />
            {!isUpper && (
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono leading-none">
                {fdi}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

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
 * Interactive SVG-based clinical odontogram with selectable annotation schemes.
 * Shared component used in the patient detail page and appointment detail modal.
 *
 * Features:
 * - Selectable annotation scheme (International / Argentina)
 * - 5 individually clickable surfaces per tooth (M, D, V, P, O)
 * - Whole-tooth marks: crown, extraction, rootcanal, extracted
 * - Multi-tooth marks (Argentina): fixed prosthesis, removable prosthesis
 * - Permanent and temporary dentition tabs
 * - Metrics summary (cavities, fillings, missing, healthy)
 * - API persistence via the Guardar button
 *
 * @param patientId   - UUID of the patient.
 * @param initialData - Pre-fetched odontogram state from the API, may be null.
 * @param token       - JWT Bearer token for API calls.
 */
const Odontogram = ({ patientId, initialData, token, initialScheme }: OdontogramProps) => {
  const { t } = useTranslation()

  const [pending, startTransition] = useTransition()

  const {
    teeth,
    activeTool,
    dentition,
    selectedTooth,
    dirty,
    metrics,
    scheme,
    selectionBuffer,
    isMultiSelectMode,
    canConfirmSelection,
    setActiveTool,
    setDentition,
    handleSurfaceClick,
    toggleToothInBuffer,
    confirmMultiSelection,
    cancelMultiSelection,
    clearAll,
    markSaved,
  } = useOdontogramState(patientId, initialData, initialScheme)

  const toolColors = SCHEME_TOOL_COLORS[scheme]

  const markTypes = SCHEME_MARK_TYPES[scheme]

  const handleSave = () => {
    startTransition(async () => {
      await saveOdontogram(token, patientId, {
        data: serializeForApi(teeth),
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
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 shrink-0">
          {t(`odontogram.schemeSelector.${scheme}`)}
        </span>
        {markTypes.map(tool => (
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
              style={{ backgroundColor: toolColors[tool] }}
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

      {/* ── Multi-select action bar ──────────────────────────────────────────── */}
      {isMultiSelectMode && (
        <div className="flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-xs">
          <span className="flex-1 text-red-700 dark:text-red-300 font-medium">
            {selectionBuffer.length === 0
              ? t('odontogram.multiSelect.hint')
              : t('odontogram.multiSelect.selected_other', { count: selectionBuffer.length })}
          </span>
          <button
            type="button"
            onClick={cancelMultiSelection}
            className="px-2 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
          >
            {t('odontogram.multiSelect.cancel')}
          </button>
          <button
            type="button"
            onClick={confirmMultiSelection}
            disabled={!canConfirmSelection}
            title={
              selectionBuffer.length >= 2 && !canConfirmSelection
                ? t('odontogram.multiSelect.nonAdjacentError')
                : undefined
            }
            className="px-2 py-0.5 rounded border border-red-500 dark:border-red-400 bg-red-500 dark:bg-red-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 dark:hover:bg-red-500 transition-colors"
          >
            {t('odontogram.multiSelect.confirm')}
          </button>
        </div>
      )}

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
                scheme={scheme}
                selectionBuffer={selectionBuffer}
                isMultiSelectMode={isMultiSelectMode}
                onSurfaceClick={handleSurfaceClick}
                onToothBufferToggle={toggleToothInBuffer}
              />
              <Midline label={t('odontogram.midline')} />
              <ToothRow
                teeth={PERMANENT_LOWER}
                stateMap={teeth}
                isUpper={false}
                scheme={scheme}
                selectionBuffer={selectionBuffer}
                isMultiSelectMode={isMultiSelectMode}
                onSurfaceClick={handleSurfaceClick}
                onToothBufferToggle={toggleToothInBuffer}
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
                scheme={scheme}
                selectionBuffer={selectionBuffer}
                isMultiSelectMode={isMultiSelectMode}
                onSurfaceClick={handleSurfaceClick}
                onToothBufferToggle={toggleToothInBuffer}
              />
              <Midline label={t('odontogram.midline')} />
              <ToothRow
                teeth={TEMPORARY_LOWER}
                stateMap={teeth}
                isUpper={false}
                scheme={scheme}
                selectionBuffer={selectionBuffer}
                isMultiSelectMode={isMultiSelectMode}
                onSurfaceClick={handleSurfaceClick}
                onToothBufferToggle={toggleToothInBuffer}
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
            {markTypes.map(tool => {
              const isProsthesis = tool === 'fixed_prosthesis' || tool === 'removable_prosthesis'

              return (
                <div key={tool} className="flex items-center gap-1.5">
                  {isProsthesis ? (
                    <svg width="16" height="10" viewBox="0 0 16 10" className="shrink-0">
                      <line
                        x1="0"
                        y1="5"
                        x2="16"
                        y2="5"
                        stroke={toolColors[tool]}
                        strokeWidth="2"
                        strokeLinecap="round"
                        {...(tool === 'removable_prosthesis' ? { strokeDasharray: '4 2' } : {})}
                      />
                    </svg>
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: toolColors[tool] }}
                    />
                  )}
                  <span className="text-[10px] text-gray-600 dark:text-gray-300">
                    {t(`odontogram.tools.${tool}`)}
                  </span>
                </div>
              )
            })}
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
                  <span style={{ color: toolColors[selectedState.mark] }}>
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
            { key: 'cavities', value: metrics.cavities, color: toolColors[MARK.CAVITY] },
            { key: 'fillings', value: metrics.fillings, color: toolColors[MARK.FILLED] },
            { key: 'missing', value: metrics.missing, color: toolColors[MARK.EXTRACTED] },
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
