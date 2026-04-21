import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cookieName, languages } from '@/lib/i18n/settings'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const bodySchema = z.object({
  lang: z.enum(languages),
})

/**
 * Verifies the request originates from the same site to prevent CSRF.
 */
const isSameOrigin = async (): Promise<boolean> => {
  const headerList = await headers()

  const origin = headerList.get('origin')

  const host = headerList.get('host')

  if (!origin || !host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/**
 * Persists the user's language preference in an HttpOnly-friendly cookie.
 */
export const POST = async (request: Request) => {
  if (!(await isSameOrigin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const cookieStore = await cookies()

  cookieStore.set(cookieName, parsed.data.lang, {
    path: '/',
    sameSite: 'strict',
    maxAge: ONE_YEAR_SECONDS,
  })

  return NextResponse.json({ ok: true })
}
