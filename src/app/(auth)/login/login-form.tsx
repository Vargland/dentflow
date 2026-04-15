'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

import { useTranslation } from '@/lib/i18n/client'
import { Button } from '@/components/ui/button'
import { EmailTakenError, registerUser } from '@/services/auth.service'

type View = 'login' | 'register'

/** Email/password login and registration form. */
export const LoginForm = () => {
  const { t } = useTranslation()

  const [view, setView] = useState<View>('login')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [name, setName] = useState('')

  const [confirmPassword, setConfirmPassword] = useState('')

  const resetError = () => setError(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setError(null)

    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t('login.invalidCredentials'))

      return
    }

    window.location.href = '/patients'
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    setError(null)

    if (password.length < 8) {
      setError(t('login.passwordTooShort'))

      return
    }

    if (password !== confirmPassword) {
      setError(t('login.passwordMismatch'))

      return
    }

    setLoading(true)

    try {
      await registerUser({ email, name, password })

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      setLoading(false)

      if (result?.error) {
        setError(t('login.invalidCredentials'))

        return
      }

      window.location.href = '/patients'
    } catch (err) {
      setLoading(false)

      if (err instanceof EmailTakenError) {
        setError(t('login.emailTaken'))

        return
      }

      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    await signIn('google', { callbackUrl: '/patients' })
  }

  const switchView = (next: View) => {
    setView(next)

    setError(null)

    setEmail('')

    setPassword('')

    setName('')

    setConfirmPassword('')
  }

  if (view === 'register') {
    return (
      <div className="w-full flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-semibold text-gray-900">{t('login.registerTitle')}</h2>
          <p className="text-sm text-gray-500">{t('login.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-name" className="text-sm font-medium text-gray-700">
              {t('login.name')}
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value);

 resetError() }}
              required
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
              {t('login.email')}
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value);

 resetError() }}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
              {t('login.password')}
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value);

 resetError() }}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-confirm" className="text-sm font-medium text-gray-700">
              {t('login.confirmPassword')}
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value);

 resetError() }}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? t('login.creating') : t('login.createAccount')}
          </Button>
        </form>

        <p className="text-sm text-center text-gray-500">
          {t('login.haveAccount')}{' '}
          <button
            type="button"
            onClick={() => switchView('login')}
            className="text-blue-600 hover:underline font-medium"
          >
            {t('login.backToLogin')}
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-5">
      <p className="text-sm text-gray-600 text-center">{t('login.signInPrompt')}</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            {t('login.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value);

 resetError() }}
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            {t('login.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value);

 resetError() }}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <Button type="submit" className="w-full mt-1" disabled={loading}>
          {loading ? t('login.signingIn') : t('login.signIn')}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs text-gray-400">{t('login.orDivider')}</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <Button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        variant="outline"
        className="w-full flex items-center gap-3"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {t('login.continueWithGoogle')}
      </Button>

      <p className="text-sm text-center text-gray-500">
        {t('login.noAccount')}{' '}
        <button
          type="button"
          onClick={() => switchView('register')}
          className="text-blue-600 hover:underline font-medium"
        >
          {t('login.register')}
        </button>
      </p>
    </div>
  )
}
