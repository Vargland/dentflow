@AGENTS.md

# DentFlow — Engineering Protocol

Dental practice management MVP. Patients, interactive odontogram (SVG + JSONB),
clinical records, and appointments with Google Calendar integration.

> High-level system overview → [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> Go API specification     → [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md)

---

## Agent Behavior Mode: STRICT

When rules are violated:

- ❌ DO NOT proceed
- ✅ STOP and explain the issue

### Decision rules for AI agents

If unsure:

1. Prefer **services** over any other data access.
2. Do not mix architectures (frontend vs backend responsibilities).
3. Do not create new patterns — reuse what exists.
4. Ask for a spec if backend contract changes are required.

### Rule priority (when two rules conflict)

1. Architecture (data flow, backend/frontend separation)
2. Spec rules
3. Data validation & typing
4. Component structure
5. Style & conventions

---

## Tech Stack

### Frontend (Next.js)

- **Framework:** Next.js App Router — pure frontend, no Server Actions for data
- **Auth:** Auth.js v5 (NextAuth) — Google OAuth, issues JWT
- **Data:** `src/services/*.ts` → REST calls to Go API with JWT Bearer
- **UI:** Tailwind CSS + shadcn/ui + Lucide Icons
- **i18n:** i18next — EN/ES via cookie `dentflow-lang`
- **Validation:** Zod (parse API responses)

### Backend (Go API)

- **Language:** Go 1.22+
- **Router:** chi
- **Database:** PostgreSQL (Neon) via pgx + sqlc (no ORM)
- **Auth:** JWT validation (shared `AUTH_SECRET` with Auth.js)
- **Validation:** ozzo-validation
- **Migrations:** golang-migrate
- **See:** [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) for the full spec.

---

## Architecture (Single Source of Truth)

- Next.js is **pure frontend**.
- Go API is the **only backend**.

### Strict rules

- ❌ NO Server Actions for data
- ❌ NO database access from frontend
- ❌ NO Prisma in frontend
- ❌ NO raw `fetch()` in components
- ❌ NO business logic in components
- ❌ NO hardcoded UI strings
- ❌ NO duplicated business constants
- ❌ NO ambiguous single-letter identifiers
- ✅ ALL data goes through `src/services/`
- ✅ Backend handles ALL business logic and validation

### Data flow

```
Component → Service → Go API → Database
```

Server Component:

```
auth() → get JWT
service.getX(token)
render UI
```

Client Component:

```ts
// Get the token from the Auth.js session — the ONLY approved pattern
const { data: session } = useSession()
const token = session?.accessToken ?? ''
service.getX(token) → Go API
```

### Sensitive data rule

Data classified as sensitive (patient records, odontogram, clinical notes,
personal identifiers) MUST be fetched in **Server Components only**.

Client Components may only call services for:

- User-initiated mutations (create, update, delete)
- Search/autocomplete triggered by user input

If unsure whether data is sensitive: default to Server Component.

### Route Handlers

Route Handlers (`src/app/api/`) are permitted **only** for:

- Auth.js internal OAuth callbacks (`/api/auth/[...nextauth]`)
- OAuth redirect callbacks that cannot be handled by the Go API
  (e.g. Google Calendar OAuth callback that requires a browser redirect
  back to the Next.js app)

Route Handlers MUST NOT:

- ❌ Fetch or mutate application data (patients, appointments, odontogram)
- ❌ Access the database directly
- ❌ Contain business logic

If a task seems to need a Route Handler for data: stop — it belongs in the
Go API.

---

## Spec-Driven Development

Any work that touches the API contract or the database requires an approved
spec before writing code. See `src/specs/README.md` for the template.

### Requires a spec — STOP, do not code without one

- New Go API endpoints
- Changes to an existing API request or response shape
- New database entities or migrations
- Complex multi-domain flows (e.g. OAuth + external API + DB)

### Does NOT require a spec — proceed directly

- UI-only changes: layout, styling, copy, component refactors
- New components or pages that consume **existing, unchanged** endpoints
- Bug fixes that do not change the API contract
- Adding i18n keys, constants, or types for existing functionality

### Agent decision rule (unambiguous)

> Does this task require a new endpoint, a contract change, or a migration?
>
> - **YES** → STOP. Create the spec first. Do not write any code.
> - **NO** → Proceed. No spec needed.

If the answer is unclear: treat it as YES and ask.

---

## Services Layer

All API communication lives in `src/services/`, organised by domain:

```
src/services/
  api-client.ts
  patients.service.ts
  appointments.service.ts
  odontogram.service.ts
  ...
```

Responsibilities:

- Attach JWT (`Authorization: Bearer <token>`).
- Handle HTTP errors.
- Parse JSON responses.
- Validate payloads with Zod — never return raw/unvalidated data.
- All GET requests use `cache: 'no-store'` — medical data must never be stale.
  Do NOT override this with `force-cache`, `revalidate`, or any other cache
  strategy unless a spec explicitly requires it and the architect approves.

```ts
/**
 * Fetches patients for the authenticated user.
 */
export const getPatients = async (token: string): Promise<Patient[]> => {
  const res = await apiClient.get('/patients', token)
  return PatientListSchema.parse(res)
}
```

### Error handling contract

Services throw `ApiError` (from `api-client.ts`) on any non-2xx response.
Components MUST handle errors — never let them propagate silently.

**Server Component (data fetch on render):**

```ts
import { redirect } from 'next/navigation'
import { ApiError } from '@/services/api-client'

try {
  const data = await someService.getData(token)
} catch (err) {
  if (err instanceof ApiError && err.status === 401) redirect('/login')
  throw err // let Next.js error.tsx handle it
}
```

**Client Component (mutation or user-initiated fetch):**

```ts
import { ApiError } from '@/services/api-client'

try {
  await someService.doAction(token, input)
} catch (err) {
  if (err instanceof ApiError && err.status === 401) {
    // session expired — redirect to login
    router.push('/login')
    return
  }
  // show user-facing error via toast or inline state — use t() for the message
  setError(err instanceof ApiError ? err.message : t('errors.unexpected'))
}
```

**Rules:**

- `401` always → redirect to `/login` (session expired or invalid).
- `403` → show permission error, do NOT redirect.
- `404` → render empty/not-found UI state.
- `409` → surface conflict message to the user (e.g. overlapping appointment).
- `5xx` → throw so `error.tsx` catches it, or show a generic toast.
- Never swallow errors silently.
- Error messages shown to users MUST go through `t()`.

---

## Validation

- ALL API responses MUST be validated with Zod.
- NEVER trust external data.

```ts
const parsed = schema.parse(response)
```

---

## Typing

All types and interfaces live in `src/typing/`, organised by domain:

```
src/typing/
  services/      # interface — DB/API/service contracts
  components/    # type      — UI props, local unions
  pages/         # type      — page params & searchParams
```

Rules:

- `interface` for anything touching services/API.
- `type` for UI props, unions, utility shapes.
- ❌ NO `any` — use `unknown` + type guards, or proper interfaces.
- ✅ Run `npx tsc --noEmit` before committing. Zero errors required.

---

## Constants Layer

Shared business constants and domain jargon live in `src/constants/`:

```
src/constants/
  odontogram.ts   # MARK enum, TOOL_COLORS, FDI layouts, ...
```

Rules:

- Use named constants (`MARK.CROWN`) instead of bare string literals
  (`'crown'`) anywhere outside the constants file.
- Keys match the API contract when the constant crosses the wire.
- No duplicated literals across files.

---

## Components

### Structure

- **Shared** (used in >1 route) → `src/components/<domain>/`
- **Route-specific**            → `src/app/.../_components/`

### Strict isolation

- ❌ NEVER import a `_components/` file from outside its route.

### Promotion rule

Promote `_components` → shared when:

- Used in 2+ routes, OR
- Clearly reusable.

Steps:

1. Move the file to `src/components/<domain>/`.
2. Update imports across the app.

### Rendering strategy

- **Server Component** (default): data fetching + initial render.
- **Client Component** (`'use client'`): interactivity, state, browser APIs.

Rule: default to Server Components. Only add `'use client'` when hooks,
event handlers, or browser APIs are required.

---

## i18n

```
src/lib/i18n/
  settings.ts     # languages, fallback, cookie name
  server.ts       # getTranslation(lang) — Server Components
  client.ts       # useTranslation()     — Client Components

src/locales/
  en/common.json
  es/common.json
```

Rules:

- ALL user-visible strings go through `t()`.
- Server Components use `getTranslation(lang)` from `@/lib/i18n/server`.
- Client Components use `useTranslation()` from `@/lib/i18n/client`.
- Language detected from cookie `dentflow-lang`. No URL prefix
  (`/patients`, not `/es/patients`).

### When adding a key

1. Add it to `src/locales/en/common.json`.
2. **Immediately** add the translation to `src/locales/es/common.json`.
3. ❌ NEVER leave a key missing in either file.

---

## Odontogram

- Rendered as **interactive SVG** only. No canvas, no chart libraries.
- State shape: `Record<number, ToothState>` keyed by **FDI** tooth numbers
  (permanent 11–48, temporary 51–85).
- Persisted as **JSONB** in the API via `saveOdontogram()`.
- Clinical marks (`MARK.CAVITY`, `MARK.FILLED`, `MARK.CROWN`,
  `MARK.EXTRACTION`, `MARK.ROOTCANAL`, `MARK.EXTRACTED`) come from
  `src/constants/odontogram.ts` — never hardcode the strings.

---

## Security

- Sensitive data is always fetched server-side, scoped by `userId`.
- Frontend MAY send IDs; backend MUST validate ownership before returning
  or mutating anything.
- ❌ Never trust client-side data.
- ❌ Never expose data without ownership validation.
- Auth middleware at `src/middleware.ts` protects all routes except
  `/login` and `/api/auth`.

---

## Language & Comments

- All code in English — variable names, function names, file names, folder names.
- TSDoc on every exported function, component, type and interface:

```ts
/**
 * Brief description.
 * @param x - what x is
 * @returns what it returns
 */
```

- ❌ NO Spanish in code or inline comments.

---

## Path Aliases

Always use `@/` aliases — ❌ never relative `../../` imports.

Available aliases (`tsconfig.json`):

```
@/*             → ./src/*
@/ui/*          → ./src/components/ui/*
@/components/*  → ./src/components/*
@/actions/*     → ./src/actions/*
@/lib/*         → ./src/lib/*
@/typing/*      → ./src/typing/*
@/locales/*     → ./src/locales/*
```

---

## Git Workflow

- ❌ NEVER push to `main` directly.
- All work on typed branches — valid prefixes:
  - `feature/<short-description>` — new functionality
  - `fix/<short-description>`     — bug fixes
  - `chore/<short-description>`   — config, tooling, deps, docs
  - `docs/<short-description>`    — documentation only
- Commits MUST pass Husky + lint-staged hooks (ESLint + typecheck).
- PR → merge into `main` only after review.
- **Before any new commit, verify the current branch is not already merged.**
  If the matching PR is closed/merged, start a new branch from fresh `main`.

### Conventional Commits

Format:

```
type(scope): subject
```

Valid types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build`
`ci` `chore` `revert`.

Example: `feat(patients): add search by DNI`.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/        # Public: /login
│   └── (dashboard)/   # Protected: /patients, /appointments, /settings, ...
├── components/        # Shared UI components (used in >1 route)
├── constants/         # Shared business constants (MARK enum, ...)
├── lib/
│   ├── auth.ts        # NextAuth config
│   └── i18n/          # i18next config (client + server + settings)
├── locales/
│   ├── en/common.json
│   └── es/common.json
├── services/          # API client layer (the only caller of fetch())
├── specs/             # Spec-Driven Development
└── typing/            # interface + type, organised by domain
```

---

## Development Commands

### Frontend (Next.js) — run from repo root

```bash
npm run dev            # Dev server (port 3000)
npm run build          # Production build
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier
npm run format:check   # Prettier check
npm run typecheck      # tsc --noEmit (zero errors required)
```

### Backend (Go) — run from `dentflow-api/`

```bash
make run               # Start Go API (port 8080)
make build             # Build binary
make test              # go test ./... -race
make fmt               # go fmt ./...
make vet               # go vet ./...
make lint              # staticcheck ./...
make migrate-up        # Run pending migrations
make migrate-down      # Rollback last migration
make sqlc              # Regenerate sqlc types
```

---

## Pre-commit Hooks (Husky + lint-staged)

All must pass on every `git commit`:

| Check             | Command                                        | Scope                        |
| ----------------- | ---------------------------------------------- | ---------------------------- |
| ESLint (auto-fix) | `eslint --fix --max-warnings=0`                | `src/**/*.{js,ts,tsx,json}`  |
| Prettier (format) | `prettier --write`                             | `src/**/*.{js,ts,tsx,json}`  |
| TypeScript        | `tsc -p tsconfig.json --noEmit`                | `src/**/*.{ts,tsx}`          |
| Tests             | `npm run test`                                 | `src/**/*.{ts,tsx}`          |
| Commit message    | commitlint (`@commitlint/config-conventional`) | commit message               |

### ESLint rules enforced

**Core:** `no-console` (warn/error only) · `max-len` (120) · `max-params` (3)
· `no-underscore-dangle` · `object-curly-spacing` · `id-length` (min 3,
whitelist: `i j id to fd cn ev`).

**TypeScript:** `@typescript-eslint/no-explicit-any` ·
`@typescript-eslint/no-use-before-define`.

**React:** `react/function-component-definition` (arrow functions only) ·
`react/jsx-key` · `react-hooks/rules-of-hooks` ·
`react-hooks/exhaustive-deps` · `react-refresh/only-export-components`.

**Stylistic:** `@stylistic/padding-line-between-statements` (blank line
between statements; disabled in `index.ts`).

**Import order** (simple-import-sort): CSS → external packages → internal
(`@/typing` → `@/lib` → `@/actions` → `@/components/ui` → `@/components`
→ `@/`) → relative.

### Prettier config

`printWidth: 100` · `semi: false` · `singleQuote: true`
· `trailingComma: es5` · `arrowParens: avoid`.

---

## No New Patterns Rule (CRITICAL)

- ❌ Do NOT introduce new patterns or abstractions.
- ✅ Always follow the existing structure.

If unsure:

- Reuse an existing service.
- Reuse an existing component.
- Do not invent an abstraction to "clean things up" mid-task.

---

## Before Every Commit Checklist

- [ ] No `any` types introduced.
- [ ] No hardcoded UI strings — all through `t()`.
- [ ] New i18n keys added to **both** `en/common.json` and `es/common.json`.
- [ ] New domain constants live in `src/constants/` (no duplicated literals).
- [ ] `npm run typecheck` passes (zero errors).
- [ ] `npm run lint` passes (zero errors).
- [ ] `npm run format:check` passes.
- [ ] Working on a `feature/` or `docs/` branch — not `main`.
- [ ] Branch is **not** already merged (if unsure: `git fetch` + check PR state).

---

## Final Principle

> The frontend renders.
> The backend decides.
> The database persists.
>
> Simple, predictable, consistent code scales. Clever code does not.
