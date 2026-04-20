import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    /** The raw signed JWT — forwarded as Bearer token to the Go API. */
    accessToken: string
    /**
     * Set when the session is invalid and the user must re-authenticate.
     * Middleware redirects to /login when this field is present.
     */
    error?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Raw signed JWT string stored during the jwt() callback. */
    accessToken?: string
    /** Propagated to Session when auth fails (e.g. GoogleLoginFailed). */
    error?: string
  }
}
