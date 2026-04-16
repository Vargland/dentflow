'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

/**
 * Wraps children with NextAuth SessionProvider so useSession() works in client components.
 */
export const SessionProvider = ({ children }: { children: React.ReactNode }) => (
  <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
)
