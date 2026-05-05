'use client'

import { useCallback, useState } from 'react'

import type {
  ActiveTool,
  AnnotationScheme,
  DentitionType,
  MarkType,
  OdontogramData,
  OdontogramMetrics,
  Surface,
  ToothState,
} from '@/typing/components/odontogram.types'
import type { OdontogramState } from '@/typing/services/odontogram.interface'
import {
  ALL_TEETH,
  ANNOTATION_SCHEME,
  MARK,
  MULTI_TOOTH_MARKS,
  SCHEME_MARK_TYPES,
  WHOLE_TOOTH_MARKS,
} from '@/constants/odontogram'

/** Build a blank tooth state. */
const blankTooth = (): ToothState => ({
  mark: null,
  surfaces: { V: null, P: null, M: null, D: null, O: null },
})

/**
 * Maps a surface state string from the API to the UI MarkType or null.
 *
 * @param value - Surface state string from the API.
 * @returns Corresponding MarkType or null.
 */
const toMarkType = (value: string | undefined): MarkType | null => {
  if (!value) return null

  switch (value) {
    case MARK.CAVITY:
    case MARK.FILLED:
    case MARK.CROWN:
    case MARK.EXTRACTION:
    case MARK.EXTRACTED:
    case MARK.ROOTCANAL:
    case MARK.FIXED_PROSTHESIS:
    case MARK.REMOVABLE_PROSTHESIS:
      return value

    default:
      return null
  }
}

/**
 * Build the initial odontogram state from API data.
 *
 * @param initialData - Pre-fetched odontogram state from the API.
 * @returns Full OdontogramData keyed by FDI number.
 */
const buildInitialState = (initialData: OdontogramState | null): OdontogramData => {
  const result: OdontogramData = {}

  for (const fdi of ALL_TEETH) {
    const apiTooth = initialData?.[fdi]

    if (!apiTooth) {
      result[fdi] = blankTooth()

      continue
    }

    const tooth = blankTooth()

    const surfaceMap: Array<[keyof typeof apiTooth, Surface]> = [
      ['V', 'V'],
      ['L', 'P'],
      ['M', 'M'],
      ['D', 'D'],
      ['O', 'O'],
    ]

    for (const [apiKey, uiKey] of surfaceMap) {
      tooth.surfaces[uiKey] = toMarkType(apiTooth[apiKey])
    }

    // Whole-tooth mark stored as 'mark' key in the API JSON
    tooth.mark = toMarkType((apiTooth as Record<string, string>)['mark'])

    result[fdi] = tooth
  }

  return result
}

/** Build a fully blank odontogram. */
const buildBlankState = (): OdontogramData => {
  const blank: OdontogramData = {}

  for (const fdi of ALL_TEETH) {
    blank[fdi] = blankTooth()
  }

  return blank
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
  /** Active annotation scheme. */
  scheme: AnnotationScheme
  /** FDI numbers in the multi-tooth selection buffer (prosthesis tools). */
  selectionBuffer: number[]
  /** True when the active tool requires multi-tooth selection. */
  isMultiSelectMode: boolean
  /** True when at least one tooth is in the selection buffer. */
  canConfirmSelection: boolean
  /** Switch the active tool. */
  setActiveTool: (tool: ActiveTool) => void
  /** Switch dentition. */
  setDentition: (dentitionType: DentitionType) => void
  /** Handle a surface click on a tooth. */
  handleSurfaceClick: (fdi: number, surface: Surface) => void
  /** Handle a whole-tooth click for whole-tooth tools. */
  handleToothClick: (fdi: number) => void
  /** Toggle a tooth in/out of the multi-tooth selection buffer. */
  toggleToothInBuffer: (fdi: number) => void
  /** Confirm and apply the multi-tooth mark to all teeth in the buffer. */
  confirmMultiSelection: () => void
  /** Discard the current selection buffer without applying anything. */
  cancelMultiSelection: () => void
  /** Reset all teeth to blank state. */
  clearAll: () => void
  /** Mark the state as saved (resets dirty flag). */
  markSaved: () => void
  /**
   * Switch the annotation scheme.
   * Clears the odontogram state — caller is responsible for showing a
   * confirmation dialog before invoking this.
   */
  applySchemeChange: (nextScheme: AnnotationScheme) => void
}

/**
 * Manages odontogram UI state including annotation scheme and multi-tooth
 * selection for prosthesis marks.
 *
 * @param patientId     - UUID of the patient.
 * @param initialData   - Pre-fetched odontogram state from the API.
 * @param initialScheme - Annotation scheme from the doctor's settings.
 * @returns State and action handlers for the odontogram UI.
 */
export const useOdontogramState = (
  patientId: string,
  initialData: OdontogramState | null,
  initialScheme: AnnotationScheme = ANNOTATION_SCHEME.INTERNATIONAL
): UseOdontogramStateReturn => {
  const [teeth, setTeeth] = useState<OdontogramData>(() => buildInitialState(initialData))

  const [dirty, setDirty] = useState(false)

  const [activeTool, setActiveToolState] = useState<ActiveTool>(SCHEME_MARK_TYPES[initialScheme][0])

  const [dentition, setDentition] = useState<DentitionType>('permanent')

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)

  const [scheme, setScheme] = useState<AnnotationScheme>(initialScheme)

  const [selectionBuffer, setSelectionBuffer] = useState<number[]>([])

  const isMultiSelectMode = MULTI_TOOTH_MARKS.includes(activeTool as MarkType)

  const canConfirmSelection = selectionBuffer.length >= 1

  const setActiveTool = useCallback(
    (tool: ActiveTool) => {
      // Discard any active buffer when switching tools
      if (selectionBuffer.length > 0) setSelectionBuffer([])

      setActiveToolState(tool)
    },
    [selectionBuffer.length]
  )

  const handleSurfaceClick = useCallback(
    (fdi: number, surface: Surface) => {
      if (MULTI_TOOTH_MARKS.includes(activeTool as MarkType)) return

      setSelectedTooth(fdi)

      setTeeth(prev => {
        const current = prev[fdi] ?? blankTooth()

        if (WHOLE_TOOTH_MARKS.includes(activeTool as MarkType)) {
          const newMark = current.mark === activeTool ? null : activeTool

          return { ...prev, [fdi]: { ...current, mark: newMark } }
        }

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
      if (MULTI_TOOTH_MARKS.includes(activeTool as MarkType)) return

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

  const toggleToothInBuffer = useCallback((fdi: number) => {
    setSelectionBuffer(prev =>
      prev.includes(fdi) ? prev.filter(id => id !== fdi) : [...prev, fdi]
    )

    setSelectedTooth(fdi)
  }, [])

  const confirmMultiSelection = useCallback(() => {
    if (selectionBuffer.length < 1) return

    const mark = activeTool as MarkType

    setTeeth(prev => {
      const next = { ...prev }

      for (const fdi of selectionBuffer) {
        const current = next[fdi] ?? blankTooth()

        next[fdi] = { ...current, mark }
      }

      return next
    })

    setSelectionBuffer([])

    setDirty(true)
  }, [activeTool, selectionBuffer])

  const cancelMultiSelection = useCallback(() => {
    setSelectionBuffer([])
  }, [])

  const clearAll = useCallback(() => {
    setTeeth(buildBlankState())

    setSelectedTooth(null)

    setSelectionBuffer([])

    setDirty(true)
  }, [])

  const markSaved = useCallback(() => {
    setDirty(false)
  }, [])

  const applySchemeChange = useCallback((nextScheme: AnnotationScheme) => {
    // Only the visual interpretation changes — teeth data is never touched.
    // Reset the active tool to the first one available in the new scheme.
    const firstTool = SCHEME_MARK_TYPES[nextScheme][0]

    setScheme(nextScheme)

    setActiveToolState(firstTool)

    setSelectionBuffer([])
  }, [])

  const metrics = computeMetrics(teeth)

  return {
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
    handleToothClick,
    toggleToothInBuffer,
    confirmMultiSelection,
    cancelMultiSelection,
    clearAll,
    markSaved,
    applySchemeChange,
  }
}
