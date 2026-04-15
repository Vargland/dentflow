import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    /** The raw signed JWT — forwarded as Bearer token to the Go API. */
    accessToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Raw signed JWT string stored during the jwt() callback. */
    accessToken?: string
  }
}
