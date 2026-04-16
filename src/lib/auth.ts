import NextAuth, { CredentialsSignin } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { decodeJwt } from 'jose'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean)

/** Thrown when the Go API returns 401 on credentials login. */
class InvalidCredentials extends CredentialsSignin {
  code = 'invalid_credentials'
}

/** Shape returned by POST /auth/login on the Go API. */
interface GoTokenResponse {
  token: string
  name: string
  email: string
}

/**
 * Calls the Go API login endpoint and returns the token response.
 * Throws InvalidCredentials on bad email/password.
 */
const callGoLogin = async (email: string, password: string): Promise<GoTokenResponse> => {
  const res = await fetch(`${API_URL.replace('/api/v1', '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (res.status === 401) throw new InvalidCredentials()

  if (!res.ok) throw new Error(`login failed: ${res.status}`)

  return res.json() as Promise<GoTokenResponse>
}

/**
 * Auth.js v5 configuration.
 * Supports both email/password (CredentialsProvider → Go API)
 * and Google OAuth.
 * Strategy: JWT-only (no database sessions).
 * session.accessToken holds the Go-signed JWT for API calls.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim() ?? ''

        const password = (credentials?.password as string | undefined) ?? ''

        if (!email || !password) return null

        const data = await callGoLogin(email, password)

        // Decode the Go JWT to extract the sub claim as user id
        const { sub } = decodeJwt(data.token)

        return {
          id: sub as string,
          email: data.email,
          name: data.name,
          // Stash the raw token so the jwt() callback can pick it up
          accessToken: data.token,
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For Google: enforce allowlist
      if (account?.provider === 'google') {
        if (allowedEmails.length === 0) return true

        return allowedEmails.includes(user.email ?? '')
      }

      // For credentials: Go API already validated — always allow
      return true
    },

    async jwt({ token, user, account }) {
      // First sign-in via credentials: the authorize() fn stashed the Go token
      if (user && account?.provider === 'credentials') {
        token.id = user.id

        token.accessToken = (user as typeof user & { accessToken?: string }).accessToken

        return token
      }

      // First sign-in via Google: find or create user in Go API by email
      if (user && account?.provider === 'google') {
        const apiBase = API_URL.replace('/api/v1', '')

        // Try to find existing user by logging in with a magic approach:
        // Call Go /auth/google-login which finds or creates user by email
        const res = await fetch(`${apiBase}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email ?? '',
            name: user.name ?? '',
            google_id: user.id ?? '',
          }),
        })

        if (res.ok) {
          const data = (await res.json()) as { token: string; name: string; email: string }

          const { decodeJwt } = await import('jose')

          const { sub } = decodeJwt(data.token)

          token.id = sub as string

          token.accessToken = data.token

          return token
        }

        // Fallback: mint a token with Google ID (calendar won't work but login will)
        token.id = user.id

        const { SignJWT } = await import('jose')

        const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)

        token.accessToken = await new SignJWT({
          sub: user.id ?? '',
          email: user.email ?? '',
          name: user.name ?? '',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(secret)

        return token
      }

      // Subsequent calls: check if the backend token needs refreshing
      if (token.accessToken) {
        const { exp } = decodeJwt(token.accessToken)

        const nowSec = Math.floor(Date.now() / 1000)

        const isExpired = typeof exp === 'number' && exp - nowSec < 60

        if (!isExpired) return token
      }

      // Token is missing or about to expire — re-mint (Google path only;
      // credentials users will need to log in again after 24 h)
      const { SignJWT } = await import('jose')

      const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)

      token.accessToken = await new SignJWT({
        sub: (token.id as string | undefined) ?? token.sub ?? '',
        email: (token.email as string | undefined) ?? '',
        name: (token.name as string | undefined) ?? '',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret)

      return token
    },

    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
      }

      if (session.user && token.id) {
        session.user.id = token.id as string
      }

      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})
