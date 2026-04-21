'use client'

import { useCallback, useEffect, useState } from 'react'

import type {
  ActiveTool,
  DentitionType,
  MarkType,
  OdontogramData,
  OdontogramMetrics,
  Surface,
  ToothState,
} from '@/typing/components/odontogram.types'
import type { OdontogramState } from '@/typing/services/odontogram.interface'
import { ALL_TEETH, MARK, WHOLE_TOOTH_MARKS } from '@/constants/odontogram'

/** Build a blank tooth state. */
const blankTooth = (): ToothState => ({
  mark: null,
  surfaces: { V: null, P: null, M: null, D: null, O: null },
})

/**
 * Maps a surface state string from the API to the UI MarkType or null.
 * The UI now uses the same term set as the API; this helper just validates
 * and narrows the type, folding unknown states to `null`.
 *
 * @param legacyState - Surface state string from the API.
 * @returns Corresponding MarkType or null.
 */
const legacySurfaceToMark = (legacyState: string | undefined): MarkType | null => {
  if (!legacyState) return null

  switch (legacyState) {
    case MARK.CAVITY:
    case MARK.FILLED:
    case MARK.CROWN:
    case MARK.EXTRACTION:
    case MARK.EXTRACTED:
    case MARK.ROOTCANAL:
      return legacyState

    default:
      return null
  }
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
 * Persist unsaved odontogram changes to localStorage (draft buffer only).
 * The API is always the source of truth — localStorage is cleared on save.
 *
 * @param patientId - UUID of the patient (used as localStorage key).
 * @param state     - Full odontogram state to persist.
 */
const persistDraft = (patientId: string, state: OdontogramData) => {
  try {
    localStorage.setItem(`odontogram_draft_${patientId}`, JSON.stringify(state))
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Clear the draft buffer after a successful API save.
 *
 * @param patientId - UUID of the patient.
 */
const clearDraft = (patientId: string) => {
  try {
    localStorage.removeItem(`odontogram_draft_${patientId}`)
  } catch {
    // ignore
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
  let cavities = 0

  let fillings = 0

  let missing = 0

  let healthy = 0

  for (const fdi of ALL_TEETH) {
    const tooth = state[fdi]

    if (!tooth) {
      healthy++

      continue
    }

    if (tooth.mark === MARK.EXTRACTED) {
      missing++

      continue
    }

    const hasCavity = Object.values(tooth.surfaces).some(mark => mark === MARK.CAVITY)

    const hasFilling = Object.values(tooth.surfaces).some(mark => mark === MARK.FILLED)

    const hasAnyMark =
      tooth.mark !== null || Object.values(tooth.surfaces).some(mark => mark !== null)

    if (hasCavity) cavities++
    else if (hasFilling) fillings++
    else if (!hasAnyMark) healthy++
  }

  return { cavities, fillings, missing, healthy }
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
  setDentition: (dentitionType: DentitionType) => void
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
  // API data is always the source of truth on mount.
  const [teeth, setTeeth] = useState<OdontogramData>(() => buildInitialState(initialData))

  const [activeTool, setActiveTool] = useState<ActiveTool>(MARK.CAVITY)

  const [dentition, setDentition] = useState<DentitionType>('permanent')

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

  const [dirty, setDirty] = useState(false)

  // Remove legacy localStorage keys that used to override API data on mount.
  useEffect(() => {
    try {
      localStorage.removeItem(`odontogram_${patientId}`)
    } catch {
      /* ignore */
    }
  }, [patientId])

  // Buffer unsaved changes to localStorage so they survive an accidental page refresh.
  useEffect(() => {
    persistDraft(patientId, teeth)
  }, [patientId, teeth])

  const handleSurfaceClick = useCallback(
    (fdi: number, surface: Surface) => {
      setSelectedTooth(fdi)

      setTeeth(prev => {
        const current = prev[fdi] ?? blankTooth()

        if (WHOLE_TOOTH_MARKS.includes(activeTool)) {
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

    clearDraft(patientId)
  }, [patientId])

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
