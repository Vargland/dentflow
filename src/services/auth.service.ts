/**
 * Auth service — calls the Go API for registration.
 * Login is handled by Auth.js CredentialsProvider (server-side).
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').replace(
  '/api/v1',
  ''
)

export interface RegisterInput {
  email: string
  name: string
  password: string
}

export interface RegisterResult {
  token: string
  name: string
  email: string
}

/** Error thrown when the registration email is already taken. */
export class EmailTakenError extends Error {
  constructor() {
    super('email already registered')

    this.name = 'EmailTakenError'
  }
}

/**
 * Registers a new user via the Go API.
 * Throws EmailTakenError if the email is already in use.
 *
 * @param input - Registration data (email, name, password).
 * @returns The new user's token response.
 */
export const registerUser = async (input: RegisterInput): Promise<RegisterResult> => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (res.status === 409) throw new EmailTakenError()

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }

    throw new Error(body.error?.message ?? `registration failed: ${res.status}`)
  }

  return res.json() as Promise<RegisterResult>
}
