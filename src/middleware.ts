import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

export default auth(req => {
  const { pathname } = req.nextUrl

  // Rutas publicas
  const publicPaths = ['/login', '/api/auth']

  const isPublic = publicPaths.some(path => pathname.startsWith(path))

  if (isPublic) return NextResponse.next()

  // Si no esta autenticado, redirigir al login
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)

    loginUrl.searchParams.set('callbackUrl', pathname)

    return NextResponse.redirect(loginUrl)
  }

  // Google login was rejected by the Go API — deny access
  if (req.auth.error === 'GoogleLoginFailed') {
    const loginUrl = new URL('/login', req.url)

    loginUrl.searchParams.set('error', 'google_login_failed')

    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
