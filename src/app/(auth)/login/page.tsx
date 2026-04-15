import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getLang } from '@/lib/i18n/get-lang'
import { getTranslation } from '@/lib/i18n/server'

import { LoginForm } from './login-form'

/** Login page — shows email/password form with optional Google OAuth. */
export default async function LoginPage() {
  const session = await auth()

  if (session?.user) redirect('/patients')

  const lang = await getLang()

  const { t } = await getTranslation(lang)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">🦷</span>
            <h1 className="text-2xl font-bold text-gray-900">DentFlow</h1>
            <p className="text-sm text-gray-500 text-center">{t('login.tagline')}</p>
          </div>

          <div className="w-full border-t border-gray-100" />

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
