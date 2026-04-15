'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { OdontogramProps } from '@/typing/components/odontogram.types'
import type { Surface, SurfaceState, ToothData } from '@/typing/services/odontogram.interface'
import { useTranslation } from '@/lib/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { saveOdontogram } from '@/services/odontogram.service'

/** Colour mapping for each tooth surface state. */
const SURFACE_COLORS: Record<SurfaceState, string> = {
  healthy: '#ffffff',
  cavity: '#ef4444',
  filled: '#3b82f6',
  extraction: '#6b7280',
  extracted: '#9ca3af',
  crown: '#f59e0b',
  implant: '#10b981',
  rootcanal: '#8b5cf6',
  fracture: '#f97316',
}

const STATE_KEYS: SurfaceState[] = [
  'healthy',
  'cavity',
  'filled',
  'extraction',
  'crown',
  'rootcanal',
]

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]

const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

/**
 * Returns true when the tooth has an occlusal/central surface
 * (premolars and molars: last digit 4–8).
 */
const hasCentralSurface = (n: number) => n % 10 >= 4

/**
 * Interactive SVG representation of a single tooth with 5 clickable surfaces.
 *
 * @param number  - FDI tooth number.
 * @param data    - Current surface states for this tooth.
 * @param onSurface - Called when the user clicks a surface.
 * @param isUpper - Whether the tooth belongs to the upper arch.
 */
const ToothSVG = ({
  number,
  data,
  onSurface,
  isUpper,
}: {
  number: number
  data: ToothData
  onSurface: (surface: Surface) => void
  isUpper: boolean
}) => {
  const central = hasCentralSurface(number)

  const getColor = (s: Surface) => SURFACE_COLORS[data[s] ?? 'healthy']

  const stroke = '#374151'

  const sw = 1

  return (
    <div className="flex flex-col items-center gap-0.5">
      {isUpper && (
        <span className="text-[9px] text-gray-500 font-mono leading-none">{number}</span>
      )}
      <svg width="36" height="36" viewBox="0 0 36 36" className="cursor-pointer">
        {central ? (
          <>
            {/* Vestibular */}
            <polygon
              points="0,0 36,0 28,8 8,8"
              fill={getColor('V')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('V')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Lingual */}
            <polygon
              points="8,28 28,28 36,36 0,36"
              fill={getColor('L')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('L')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Mesial */}
            <polygon
              points="0,0 8,8 8,28 0,36"
              fill={getColor('M')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('M')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Distal */}
            <polygon
              points="36,0 36,36 28,28 28,8"
              fill={getColor('D')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('D')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Occlusal (center) */}
            <rect
              x="8"
              y="8"
              width="20"
              height="20"
              fill={getColor('O')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('O')}
              className="hover:opacity-75 transition-opacity"
            />
          </>
        ) : (
          <>
            {/* Vestibular */}
            <polygon
              points="4,0 32,0 26,10 10,10"
              fill={getColor('V')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('V')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Lingual */}
            <polygon
              points="10,26 26,26 32,36 4,36"
              fill={getColor('L')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('L')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Mesial */}
            <polygon
              points="4,0 10,10 10,26 4,36"
              fill={getColor('M')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('M')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Distal */}
            <polygon
              points="32,0 32,36 26,26 26,10"
              fill={getColor('D')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('D')}
              className="hover:opacity-75 transition-opacity"
            />
            {/* Incisal (center) */}
            <rect
              x="10"
              y="10"
              width="16"
              height="16"
              fill={getColor('O')}
              stroke={stroke}
              strokeWidth={sw}
              onClick={() => onSurface('O')}
              className="hover:opacity-75 transition-opacity"
            />
          </>
        )}
      </svg>
      {!isUpper && (
        <span className="text-[9px] text-gray-500 font-mono leading-none">{number}</span>
      )}
    </div>
  )
}

/**
 * Interactive adult odontogram (FDI 11–48).
 * Persists state to the Go API via the odontogram service.
 *
 * @param patientId   - UUID of the patient.
 * @param initialData - Pre-fetched odontogram state (may be null for new patients).
 * @param token       - JWT Bearer token for API calls.
 */
const Odontogram = ({ patientId, initialData, token }: OdontogramProps) => {
  const { t } = useTranslation()

  const [teeth, setTeeth] = useState<Record<number, ToothData>>(() => {
    const result: Record<number, ToothData> = {}

    ;[...UPPER_TEETH, ...LOWER_TEETH].forEach(n => {
      result[n] = (initialData?.[n] as ToothData) ?? {}
    })

    return result
  })

  const [activeState, setActiveState] = useState<SurfaceState>('cavity')

  const [pending, startTransition] = useTransition()

  const [dirty, setDirty] = useState(false)

  const handleSurface = (toothNumber: number, surface: Surface) => {
    setTeeth(prev => {
      const current = prev[toothNumber] ?? {}

      const currentState = current[surface] ?? 'healthy'

      const newState: SurfaceState = currentState === activeState ? 'healthy' : activeState

      setDirty(true)

      return { ...prev, [toothNumber]: { ...current, [surface]: newState } }
    })
  }

  const handleSave = () => {
    startTransition(async () => {
      await saveOdontogram(token, patientId, {
        data: teeth as Record<string, unknown>,
      })

      setDirty(false)

      toast.success(t('odontogram.saved'))
    })
  }

  const renderRow = (toothNumbers: number[], isUpper: boolean) => (
    <div className="flex justify-center gap-1 flex-wrap">
      {toothNumbers.map(n => (
        <ToothSVG
          key={n}
          number={n}
          data={teeth[n] ?? {}}
          onSurface={surface => handleSurface(n, surface)}
          isUpper={isUpper}
        />
      ))}
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* State selector */}
      <div className="flex flex-wrap gap-2">
        {STATE_KEYS.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveState(key)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
              activeState === key
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-400'
            )}
          >
            <span
              className="h-3 w-3 rounded-sm border border-gray-400"
              style={{ backgroundColor: SURFACE_COLORS[key] }}
            />
            {t(`odontogram.states.${key}`)}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{t('odontogram.hint')}</p>

      {/* Upper arch */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-gray-400 text-center uppercase tracking-widest">
          {t('odontogram.upper')}
        </p>
        {renderRow(UPPER_TEETH, true)}
      </div>

      <div className="border-t border-dashed border-gray-200 my-1" />

      {/* Lower arch */}
      <div className="space-y-1">
        {renderRow(LOWER_TEETH, false)}
        <p className="text-[10px] font-semibold text-gray-400 text-center uppercase tracking-widest">
          {t('odontogram.lower')}
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending} size="sm">
          {pending ? t('odontogram.saving') : t('odontogram.save')}
        </Button>
      </div>
    </div>
  )
}

export default Odontogram
