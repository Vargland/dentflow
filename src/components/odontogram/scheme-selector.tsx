'use client'

import type { AnnotationScheme } from '@/typing/components/odontogram.types'
import { useTranslation } from '@/lib/i18n/client'
import { ANNOTATION_SCHEME } from '@/constants/odontogram'

interface SchemeSelectorProps {
  /** Currently active annotation scheme. */
  value: AnnotationScheme
  /** Called when the user clicks a different scheme option. */
  onChange: (scheme: AnnotationScheme) => void
}

/**
 * Segmented control for switching between annotation schemes.
 * Renders two buttons: International and Argentina.
 */
const SchemeSelector = ({ value, onChange }: SchemeSelectorProps) => {
  const { t } = useTranslation()

  const options: { scheme: AnnotationScheme; label: string }[] = [
    {
      scheme: ANNOTATION_SCHEME.INTERNATIONAL,
      label: t('odontogram.schemeSelector.international'),
    },
    {
      scheme: ANNOTATION_SCHEME.ARGENTINA,
      label: t('odontogram.schemeSelector.argentina'),
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{t('odontogram.schemeSelector.label')}:</span>
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {options.map(({ scheme, label }) => (
          <button
            key={scheme}
            type="button"
            onClick={() => onChange(scheme)}
            className={[
              'px-3 py-1 text-xs font-medium transition-colors',
              value === scheme
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SchemeSelector
