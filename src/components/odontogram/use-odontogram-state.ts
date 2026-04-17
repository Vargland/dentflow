'use client'

import { useCallback, useEffect, useState } from 'react'

import type { OdontogramState } from '@/typing/services/odontogram.interface'

import type {
  ActiveTool,
  DentitionType,
  MarkType,
  OdontogramData,
  OdontogramMetrics,
  Surface,
  ToothState,
} from './types'

// ── FDI tooth layouts ──────────────────────────────────────────────────────────

/** Upper permanent teeth (right → left, FDI). */
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]

/** Lower permanent teeth (right → left, FDI). */
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

/** Upper temporary teeth (right → left, FDI). */
export const TEMPORARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65]

/** Lower temporary teeth (right → left, FDI). */
export const TEMPORARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]

/** All FDI tooth numbers tracked by the odontogram. */
export const ALL_TEETH = [
  ...PERMANENT_UPPER,
  ...PERMANENT_LOWER,
  ...TEMPORARY_UPPER,
  ...TEMPORARY_LOWER,
]

/** Whole-tooth tools that annotate the entire tooth rather than individual surfaces. */
const WHOLE_TOOTH_TOOLS: MarkType[] = ['corona', 'extraccion', 'endodoncia', 'ausente']

/** Build a blank tooth state. */
const blankTooth = (): ToothState => ({
  mark: null,
  surfaces: { V: null, P: null, M: null, D: null, O: null },
})

/**
 * Maps the legacy API surface state string to the v2 MarkType or null.
 * Only caries/cavity and filled/restauracion have equivalents; other states are ignored.
 *
 * @param s - Legacy surface state string from the API.
 * @returns Corresponding MarkType or null.
 */
const legacySurfaceToMark = (s: string | undefined): MarkType | null => {
  if (!s) return null

  if (s === 'cavity') return 'caries'

  if (s === 'filled') return 'restauracion'

  if (s === 'crown') return 'corona'

  if (s === 'extraction' || s === 'extracted') return 'extraccion'

  if (s === 'rootcanal') return 'endodoncia'

  return null
}

/**
 * Build the initial odontogram state from the API OdontogramState (may be null).
 *
 * @param initialData - Pre-fetched odontogram state from the API.
 * @returns Full OdontogramData keyed by FDI number.
 */
const buildInitialState = (initialData: OdontogramState | null): OdontogramData => {
  const result: OdontogramData = {}

  for (const fdi of ALL_TEETH) {
    const legacyTooth = initialData?.[fdi]

    if (!legacyTooth) {
      result[fdi] = blankTooth()

      continue
    }

    const tooth = blankTooth()

    // Map legacy API surfaces (V, L→P, M, D, O) to current surfaces
    const legacySurfaces: Array<[keyof typeof legacyTooth, Surface]> = [
      ['V', 'V'],
      ['L', 'P'],
      ['M', 'M'],
      ['D', 'D'],
      ['O', 'O'],
    ]

    for (const [legacyKey, v2Key] of legacySurfaces) {
      tooth.surfaces[v2Key] = legacySurfaceToMark(legacyTooth[legacyKey])
    }

    result[fdi] = tooth
  }

  return result
}

/**
 * Persist the odontogram state to localStorage.
 *
 * @param patientId - UUID of the patient (used as localStorage key).
 * @param state     - Full odontogram state to persist.
 */
const persist = (patientId: string, state: OdontogramData) => {
  try {
    localStorage.setItem(`odontogram_${patientId}`, JSON.stringify(state))
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Load persisted odontogram state from localStorage.
 *
 * @param patientId - UUID of the patient.
 * @returns Persisted state or null if not found.
 */
const loadPersisted = (patientId: string): OdontogramData | null => {
  try {
    const raw = localStorage.getItem(`odontogram_${patientId}`)

    if (!raw) return null

    return JSON.parse(raw) as OdontogramData
  } catch {
    return null
  }
}

// ── Metrics ───────────────────────────────────────────────────────────────────

/**
 * Derive aggregated metrics from the full odontogram state.
 *
 * @param state - Full odontogram state.
 * @returns Computed metric counters.
 */
const computeMetrics = (state: OdontogramData): OdontogramMetrics => {
  let caries = 0

  let restauraciones = 0

  let ausentes = 0

  let sanos = 0

  for (const fdi of ALL_TEETH) {
    const tooth = state[fdi]

    if (!tooth) {
      sanos++

      continue
    }

    if (tooth.mark === 'ausente') {
      ausentes++

      continue
    }

    const hasCaries = Object.values(tooth.surfaces).some(v => v === 'caries')

    const hasRestaur = Object.values(tooth.surfaces).some(v => v === 'restauracion')

    const hasAnyMark = tooth.mark !== null || Object.values(tooth.surfaces).some(v => v !== null)

    if (hasCaries) caries++
    else if (hasRestaur) restauraciones++
    else if (!hasAnyMark) sanos++
  }

  return { caries, restauraciones, ausentes, sanos }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Return type for useOdontogramState. */
export interface UseOdontogramStateReturn {
  /** Current full state. */
  teeth: OdontogramData
  /** The tool the user is actively painting with. */
  activeTool: ActiveTool
  /** Which dentition tab is visible. */
  dentition: DentitionType
  /** The last tooth the user clicked (for the right panel). */
  selectedTooth: number | null
  /** Whether the state has been modified since last save. */
  dirty: boolean
  /** Computed metrics for the metrics row. */
  metrics: OdontogramMetrics
  /** Switch the active tool. */
  setActiveTool: (tool: ActiveTool) => void
  /** Switch dentition. */
  setDentition: (d: DentitionType) => void
  /** Handle a surface click on a tooth. */
  handleSurfaceClick: (fdi: number, surface: Surface) => void
  /** Handle a whole-tooth click for whole-tooth tools. */
  handleToothClick: (fdi: number) => void
  /** Reset all teeth to blank state. */
  clearAll: () => void
  /** Mark the state as saved (resets dirty flag). */
  markSaved: () => void
}

/**
 * Manages the full odontogram state with localStorage persistence.
 *
 * @param patientId   - UUID of the patient (used as localStorage key).
 * @param initialData - Pre-fetched odontogram state from the API.
 * @returns State and action handlers for the odontogram UI.
 */
export const useOdontogramState = (
  patientId: string,
  initialData: OdontogramState | null
): UseOdontogramStateReturn => {
  const [teeth, setTeeth] = useState<OdontogramData>(() => {
    const persisted = loadPersisted(patientId)

    return persisted ?? buildInitialState(initialData)
  })

  const [activeTool, setActiveTool] = useState<ActiveTool>('caries')

  const [dentition, setDentition] = useState<DentitionType>('permanent')

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

  const [dirty, setDirty] = useState(false)

  // Sync to localStorage whenever teeth state changes
  useEffect(() => {
    persist(patientId, teeth)
  }, [patientId, teeth])

  const handleSurfaceClick = useCallback(
    (fdi: number, surface: Surface) => {
      setSelectedTooth(fdi)

      setTeeth(prev => {
        const current = prev[fdi] ?? blankTooth()

        if (WHOLE_TOOTH_TOOLS.includes(activeTool)) {
          // Whole-tooth tool applied via surface click → toggle on the tooth
          const newMark = current.mark === activeTool ? null : activeTool

          return { ...prev, [fdi]: { ...current, mark: newMark } }
        }

        // Surface-level tool
        const currentSurface = current.surfaces[surface]

        const newSurface = currentSurface === activeTool ? null : activeTool

        return {
          ...prev,
          [fdi]: {
            ...current,
            surfaces: { ...current.surfaces, [surface]: newSurface },
          },
        }
      })

      setDirty(true)
    },
    [activeTool]
  )

  const handleToothClick = useCallback(
    (fdi: number) => {
      setSelectedTooth(fdi)

      setTeeth(prev => {
        const current = prev[fdi] ?? blankTooth()

        const newMark = current.mark === activeTool ? null : activeTool

        return { ...prev, [fdi]: { ...current, mark: newMark } }
      })

      setDirty(true)
    },
    [activeTool]
  )

  const clearAll = useCallback(() => {
    const blank: OdontogramData = {}

    for (const fdi of ALL_TEETH) {
      blank[fdi] = blankTooth()
    }

    setTeeth(blank)

    setSelectedTooth(null)

    setDirty(true)
  }, [])

  const markSaved = useCallback(() => {
    setDirty(false)
  }, [])

  const metrics = computeMetrics(teeth)

  return {
    teeth,
    activeTool,
    dentition,
    selectedTooth,
    dirty,
    metrics,
    setActiveTool,
    setDentition,
    handleSurfaceClick,
    handleToothClick,
    clearAll,
    markSaved,
  }
}
