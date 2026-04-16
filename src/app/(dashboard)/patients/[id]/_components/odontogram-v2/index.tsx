'use client'

import { useTransition } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

import type { OdontogramProps } from '@/typing/components/odontogram.types'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { saveOdontogram } from '@/services/odontogram.service'

import { exportToPNG } from './export-png'
import ToothCanvas from './tooth-canvas'
import { TOOL_COLORS } from './tooth-geometry'
import type { ActiveTool, MarkType, Surface, ToothState } from './types'
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  TEMPORARY_LOWER,
  TEMPORARY_UPPER,
  useOdontogramState,
} from './use-odontogram-state'

// ── Tool configuration ────────────────────────────────────────────────────────

interface ToolEntry {
  tool: MarkType
  labelEs: string
  labelEn: string
}

const TOOLS: ToolEntry[] = [
  { tool: 'caries', labelEs: 'Caries', labelEn: 'Caries' },
  { tool: 'restauracion', labelEs: 'Restauracion', labelEn: 'Restoration' },
  { tool: 'corona', labelEs: 'Corona', labelEn: 'Crown' },
  { tool: 'extraccion', labelEs: 'Extraccion', labelEn: 'Extraction' },
  { tool: 'endodoncia', labelEs: 'Endodoncia', labelEn: 'Root canal' },
  { tool: 'ausente', labelEs: 'Ausente', labelEn: 'Absent' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

interface ToothGroupProps {
  teeth: number[]
  stateMap: Record<number, ToothState>
  isDark: boolean
  isUpper: boolean
  onSurfaceClick: (fdi: number, surface: Surface) => void
}

/** Renders a horizontal row of tooth canvases. */
const ToothRow = ({ teeth, stateMap, isDark, isUpper, onSurfaceClick }: ToothGroupProps) => (
  <div className="flex justify-center gap-1 flex-wrap">
    {teeth.map(fdi => (
      <div key={fdi} className="flex flex-col items-center gap-0.5">
        {isUpper && (
          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-mono leading-none">
            {fdi}
          </span>
        )}
        <ToothCanvas
          fdi={fdi}
          state={
            stateMap[fdi] ?? {
              mark: null,
              surfaces: { V: null, P: null, M: null, D: null, O: null },
            }
          }
          isDark={isDark}
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

const Midline = () => (
  <div className="flex items-center gap-2 my-1">
    <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
      línea media
    </span>
    <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
  </div>
)

// ── Section label ─────────────────────────────────────────────────────────────

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest">
    {label}
  </p>
)

// ── OdontogramV2 ─────────────────────────────────────────────────────────────

/**
 * Enhanced canvas-based clinical odontogram (v2).
 * Drop-in replacement for the legacy SVG Odontogram component.
 *
 * @param patientId   - UUID of the patient (also used as localStorage key).
 * @param initialData - Pre-fetched odontogram state from the API, may be null.
 * @param token       - JWT Bearer token for API calls.
 */
const OdontogramV2 = ({ patientId, initialData, token }: OdontogramProps) => {
  const { t } = useTranslation()

  const { resolvedTheme } = useTheme()

  const isDark = resolvedTheme === 'dark'

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

  const handleExport = () => {
    exportToPNG(teeth, patientId)
  }

  // Selected tooth info for the right panel
  const selectedState = selectedTooth ? teeth[selectedTooth] : null

  const markedSurfaces = selectedState
    ? (Object.entries(selectedState.surfaces) as Array<[Surface, MarkType | null]>)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k}: ${v}`)
    : []

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {TOOLS.map(({ tool, labelEn }) => (
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
            {labelEn}
          </button>
        ))}

        <button
          type="button"
          onClick={clearAll}
          className="ml-auto px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
        >
          Limpiar todo
        </button>
      </div>

      {/* ── Dentition tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(['permanent', 'temporary'] as const).map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDentition(d)}
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-t transition-colors',
              dentition === d
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-b-0 border-gray-200 dark:border-gray-700'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {d === 'permanent' ? 'Permanente' : 'Temporal'}
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
                isDark={isDark}
                isUpper
                onSurfaceClick={handleSurfaceClick}
              />
              <Midline />
              <ToothRow
                teeth={PERMANENT_LOWER}
                stateMap={teeth}
                isDark={isDark}
                isUpper={false}
                onSurfaceClick={handleSurfaceClick}
              />
              <SectionLabel label={t('odontogram.lower')} />
            </>
          ) : (
            <>
              <SectionLabel label="Superior temporal" />
              <ToothRow
                teeth={TEMPORARY_UPPER}
                stateMap={teeth}
                isDark={isDark}
                isUpper
                onSurfaceClick={handleSurfaceClick}
              />
              <Midline />
              <ToothRow
                teeth={TEMPORARY_LOWER}
                stateMap={teeth}
                isDark={isDark}
                isUpper={false}
                onSurfaceClick={handleSurfaceClick}
              />
              <SectionLabel label="Inferior temporal" />
            </>
          )}
        </div>

        {/* Right panel */}
        <aside className="w-40 shrink-0 space-y-4">
          {/* Legend */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Leyenda
            </p>
            {TOOLS.map(({ tool, labelEn }) => (
              <div key={tool} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: TOOL_COLORS[tool] }}
                />
                <span className="text-[10px] text-gray-600 dark:text-gray-300">{labelEn}</span>
              </div>
            ))}
          </div>

          {/* Selected tooth info */}
          {selectedTooth && selectedState && (
            <div className="space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Diente {selectedTooth}
              </p>
              {selectedState.mark && (
                <p className="text-[10px] text-gray-700 dark:text-gray-300">
                  Marca:{' '}
                  <span style={{ color: TOOL_COLORS[selectedState.mark] }}>
                    {selectedState.mark}
                  </span>
                </p>
              )}
              {markedSurfaces.length > 0 ? (
                <ul className="space-y-0.5">
                  {markedSurfaces.map(s => (
                    <li key={s} className="text-[10px] text-gray-600 dark:text-gray-300">
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                !selectedState.mark && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Sano</p>
                )
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Metrics row ─────────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap border-t border-gray-100 dark:border-gray-700 pt-3">
        {[
          { label: 'Caries', value: metrics.caries, color: TOOL_COLORS.caries },
          {
            label: 'Restauraciones',
            value: metrics.restauraciones,
            color: TOOL_COLORS.restauracion,
          },
          { label: 'Ausentes', value: metrics.ausentes, color: TOOL_COLORS.ausente },
          { label: 'Sanos', value: metrics.sanos, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {label}:{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} type="button">
          Exportar PNG
        </Button>
        <Button onClick={handleSave} disabled={!dirty || pending} size="sm" type="button">
          {pending ? t('odontogram.saving') : t('odontogram.save')}
        </Button>
      </div>
    </div>
  )
}

export default OdontogramV2
