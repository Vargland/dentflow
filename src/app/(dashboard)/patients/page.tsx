import Link from 'next/link'
import { Search, UserPlus, Users } from 'lucide-react'

import type { PatientListSearchParams } from '@/typing/pages/patients.types'
import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPatients } from '@/services/patients.service'

/** Lists all patients for the authenticated doctor with optional search. */
export default async function PatientsPage({ searchParams }: PatientListSearchParams) {
  const { q } = await searchParams

  const session = await auth()

  const token = session?.accessToken ?? ''

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  const patients = await getPatients(token, q)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('patients.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('patients.count', { count: patients.length })}
          </p>
        </div>
        <Link href="/patients/new">
          <Button className="w-full sm:w-auto gap-2">
            <UserPlus className="h-4 w-4" />
            {t('patients.newPatient')}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t('patients.searchPlaceholder')}
          className="pl-9"
        />
      </form>

      {/* List */}
      {patients.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">{q ? t('patients.noResults') : t('patients.empty')}</p>
          {!q && <p className="text-sm mt-1">{t('patients.emptyHint')}</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {patients.map(p => (
              <li key={p.id}>
                <Link
                  href={`/patients/${p.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {p.apellido}, {p.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {p.dni && <span>ID {p.dni}</span>}
                      {p.telefono && <span>{p.telefono}</span>}
                      {p.obraSocial && (
                        <Badge variant="secondary" className="text-xs">
                          {p.obraSocial}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {t('patients.entries', { count: p.evolutionCount })}
                    </span>
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
