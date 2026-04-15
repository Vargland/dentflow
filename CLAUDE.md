@AGENTS.md

# DentFlow — Engineering Protocol

## Project Overview
Dental practice management MVP. Patients, interactive odontogram (SVG/JSONB), clinical records, and Google Calendar integration for appointments.

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
- **Database:** PostgreSQL (Neon) via pgx + sqlc
- **Auth:** JWT validation (shared AUTH_SECRET with Auth.js)
- **Validation:** ozzo-validation
- **Migrations:** golang-migrate
- **See:** `BACKEND_ARCHITECTURE.md` for full spec

## Spec-Driven Development (regla de oro)

**Ninguna feature se codea sin una spec aprobada en `src/specs/`.**

El flujo es siempre:
```
1. Crear src/specs/feature-<nombre>.md  → definir contrato
2. Validar con el usuario               → spec aprobada
3. Codear                               → UI + DB + Actions
```

No se crea ningún modelo Prisma, Server Action, página ni componente nuevo hasta que la spec esté aprobada. Ver `src/specs/README.md` para el template y las reglas completas.

## Critical Rules

### Language & Comments
- **All code in English** — variable names, function names, file names, folder names.
- **TSDoc comments** on every exported function, component, type and interface:
  ```ts
  /**
   * Brief description.
   * @param x - what x is
   * @returns what it returns
   */
  ```
- **No inline comments** in Spanish.

### Commits
- **Conventional Commits** always:
  `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:`
- Example: `feat(patients): add search by DNI`

### Typing
- All types/interfaces in `src/typing/` organized as:
  - `typing/services/` → `interface` for DB/API/Server Action shapes
  - `typing/components/` → `type` for props, local unions
  - `typing/pages/` → `type` for page params and searchParams
- **`interface`** for anything touching services/Prisma/API
- **`type`** for UI props, unions, utility shapes

### Path Aliases
- Always use `@/` aliases — **never** relative `../../` imports.
- Available aliases: `@/ui/*`, `@/components/*`, `@/actions/*`, `@/lib/*`, `@/typing/*`, `@/locales/*`

### Components
- **Shared components** (used in >1 route) → `src/components/<domain>/`
- **Route-specific components** → `src/app/.../<route>/_components/`
- Never import a `_components/` file from outside its route.

### TypeScript
- **No `any`** — ever. Use `unknown` + type guards, or proper interfaces.
- **Zod** for all external input validation (form data, API responses, env vars).
- Run `npx tsc --noEmit` before committing. Zero errors required.

### Git Workflow
- **NEVER push to `main`** directly.
- All work on feature branches: `feature/<short-description>` (e.g. `feature/google-calendar`).
- Commits must pass Husky + lint-staged hooks (ESLint + type check).
- PR → merge into `main` only after review.

### Architecture
- **Server Components by default.** Only add `'use client'` when you need browser APIs, event handlers, or React hooks.
- **All data fetching goes through `src/services/`** — never call `fetch()` directly from a component.
- **No Server Actions for data** — Next.js is pure frontend. No Prisma, no DB access.
- **No raw SQL** — Go backend uses sqlc only.
- Services attach the JWT from Auth.js session to every request: `Authorization: Bearer <token>`

### Odontogram
- Rendered as interactive SVG. Never use a canvas or third-party chart lib.
- State shape: `Record<number, ToothState>` where keys are FDI tooth numbers (11–48).
- Persisted as JSONB in `Patient.odontograma` via `saveOdontogram()` Server Action.

### i18n
- All user-facing strings go through `t()` — no hardcoded UI text.
- Server Components: `getTranslation(lang)` from `@/lib/i18n/server`
- Client Components: `useTranslation()` from `@/lib/i18n/client`
- Add new keys to **both** `src/locales/en/common.json` and `src/locales/es/common.json`.

### Security
- Sensitive data (patient records) always fetched server-side, scoped by `userId`.
- Never expose raw DB ids in client state without ownership check.
- Auth middleware at `src/middleware.ts` protects all routes except `/login` and `/api/auth`.

## Development Commands

### Frontend (Next.js)
```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier
npm run format:check  # Prettier check
npm run typecheck     # tsc --noEmit (zero errors required)
```

### Backend (Go) — run from dentflow-api/
```bash
make run              # Start Go API (port 8080)
make build            # Build binary
make test             # go test ./... -race
make fmt              # go fmt ./...
make vet              # go vet ./...
make lint             # staticcheck ./...
make migrate-up       # Run pending migrations
make migrate-down     # Rollback last migration
make sqlc             # Regenerate sqlc types
```

## Project Structure
```
src/
├── actions/          # Server Actions (mutations + queries)
├── app/
│   ├── (auth)/       # Public: /login
│   └── (dashboard)/  # Protected: /patients, /turnos
├── components/       # Shared UI components
├── lib/
│   ├── auth.ts       # NextAuth config
│   ├── prisma.ts     # Prisma singleton
│   └── i18n/         # i18next config (client + server + settings)
└── locales/
    ├── en/common.json
    └── es/common.json
```

## Pre-commit Hooks (automated via Husky + lint-staged)

These run automatically on every `git commit`. All must pass:

| Check | Command | Scope |
|-------|---------|-------|
| ESLint (auto-fix) | `eslint --fix --max-warnings=0` | `src/**/*.{js,ts,tsx,json}` |
| Prettier (format) | `prettier --write` | `src/**/*.{js,ts,tsx,json}` |
| TypeScript | `tsc -p tsconfig.json --noEmit` | `src/**/*.{ts,tsx}` |
| Tests | `npm run test` | `src/**/*.{ts,tsx}` |
| Commit message | commitlint (`@commitlint/config-conventional`) | commit msg |

### ESLint Rules Enforced

**Core:** `no-console` (warn/error only) · `max-len` (120) · `max-params` (3) · `no-underscore-dangle` · `object-curly-spacing`

**TypeScript:** `@typescript-eslint/no-explicit-any` · `@typescript-eslint/no-use-before-define`

**React:** `react/function-component-definition` (arrow functions only) · `react/jsx-key` · `react-hooks/rules-of-hooks` · `react-hooks/exhaustive-deps` · `react-refresh/only-export-components`

**Stylistic:** `@stylistic/padding-line-between-statements` (blank line between statements; off in `index.ts`)

**Import order** (simple-import-sort): CSS → external packages → internal (`@/typing` → `@/lib` → `@/actions` → `@/components/ui` → `@/components` → `@/`) → relative

### Prettier Config
`printWidth: 100` · `semi: false` · `singleQuote: true` · `trailingComma: es5` · `arrowParens: avoid`

### Commit Message Format
```
type(scope): subject
```
Valid types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

## Before Every Commit Checklist
- [ ] No `any` types introduced
- [ ] New UI strings added to both locale files
- [ ] `npm run typecheck` passes (zero errors)
- [ ] `npm run lint` passes (zero errors)
- [ ] `npm run format:check` passes
- [ ] Working on a `feature/` branch (not `main`)
