# DentFlow — Architecture Document

**Version:** 2.0
**Date:** 2026-04-19
**Status:** Draft

> This document captures the **big picture** (the what and the why).
> For operational rules — commands, ESLint config, commit hooks, aliases —
> see [`CLAUDE.md`](./CLAUDE.md). For the Go API, see
> [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md).

---

## 1. Overview

DentFlow is a **distributed fullstack system**:

- **Frontend:** Next.js (App Router) — UI + rendering only
- **Backend:** Go API — business logic + data access
- **Database:** PostgreSQL (Neon)

There is a **strict separation of concerns**:

```
Browser
   │
   ▼
Next.js (Frontend Only)
   │
   ▼
src/services/ (API Client Layer)
   │
   ▼
Go API (chi)
   │
   ▼
PostgreSQL (Neon)
```

---

## 2. Architecture Principles

### 2.1 Single Source of Truth

- Backend (Go API) is the **only source of truth for data**.
- Frontend is a **pure consumer**; any cached state in the client
  (React state, `localStorage`, in-memory maps) is a convenience layer,
  never authoritative.

### 2.2 Strict Layer Separation

| Layer                     | Responsibility                            |
| ------------------------- | ----------------------------------------- |
| Next.js                   | Rendering, UI, user interaction           |
| Services (`src/services`) | API communication                         |
| Go API                    | Business logic, validation, authorization |
| Database                  | Persistence                               |

### 2.3 Forbidden in Frontend

- ❌ Database access (no Prisma, no raw SQL)
- ❌ Server Actions for data mutations
- ❌ Raw `fetch()` in components — always go through `src/services/`
- ❌ Business logic in components
- ❌ Hardcoded UI strings — every user-visible text goes through `t()`
- ❌ Duplicated business constants — use `src/constants/<domain>.ts`
- ❌ Ambiguous single-letter identifiers — enforced by ESLint `id-length`

---

## 3. Spec-Driven Development (golden rule)

**No feature is coded without an approved spec in `src/specs/`.**

The flow is always:

```
1. Create src/specs/feature-<name>.md   → define the contract
2. Review with the user                  → spec approved
3. Code                                  → UI + services + API
```

No new page, component, service, type or API endpoint is created until the
spec is approved. See `src/specs/README.md` for the template and full rules.

---

## 4. Frontend Architecture

### 4.1 Rendering Strategy

| Type              | Use case                           |
| ----------------- | ---------------------------------- |
| Server Components | Data fetching + initial render     |
| Client Components | Interactivity, state, browser APIs |

**Rule:** default to Server Components. Only add `'use client'` when the
component needs hooks, event handlers, or browser APIs.

### 4.2 Data Flow

```
Server Component
   │
   ├── auth()            → get JWT
   ├── call service      → with token
   └── render UI

Client Component
   │
   └── call service      → Go API
```

### 4.3 Services Layer

All API communication goes through `src/services/`, organised by domain:

```
patients.service.ts
appointments.service.ts
odontogram.service.ts
```

Responsibilities:

- Attach JWT (`Authorization: Bearer <token>`)
- Handle HTTP errors
- Parse JSON responses
- Validate payloads with Zod

```ts
/**
 * Fetches patients for the authenticated user.
 */
export const getPatients = async (token: string): Promise<Patient[]> => {
  const res = await apiClient.get('/patients', token)
  return PatientListSchema.parse(res)
}
```

### 4.4 Component Organisation

```
src/app/.../_components/   → route-scoped (never imported from outside the route)
src/components/            → shared (used in >1 route)
```

Promote a component from `_components/` to `src/components/<domain>/` the
moment a second route needs it.

### 4.5 Constants Layer

Shared business constants and domain jargon live in `src/constants/`:

```
src/constants/
└── odontogram.ts   # MARK enum, TOOL_COLORS, FDI layouts, ...
```

Rules:

- Use a named constant (`MARK.CROWN`) instead of a bare string literal
  (`'crown'`) anywhere outside the constants file.
- Keys match the API contract when the constant crosses the wire.
- No duplicated literals across files.

### 4.6 Typing System

```
src/typing/
├── services/     # interfaces — API contracts, service payloads
├── components/   # types — UI props, local unions
└── pages/        # types — page params and searchParams
```

- `interface` for anything that touches the API.
- `type` for UI props and utility shapes.
- No `any`. Use `unknown` + type guards or proper interfaces.

### 4.7 i18n

```
src/lib/i18n/
├── settings.ts    # languages, fallback, cookie name
├── server.ts      # getTranslation(lang) — Server Components
└── client.ts      # useTranslation()     — Client Components

src/locales/
├── en/common.json
└── es/common.json
```

- Every user-visible string goes through `t()`.
- New keys must be added to **both** `en/common.json` and `es/common.json`.
- Language is detected from the `dentflow-lang` cookie. No URL prefix.

---

## 5. Backend Architecture (Go API)

> Full specification: [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md).

Responsibilities:

- Authentication (JWT validation)
- Authorization (per-user ownership checks)
- Business logic
- Data validation
- Database access

Stack:

- Router: **chi**
- DB access: **pgx + sqlc** (no ORM)
- Validation: **ozzo-validation**
- Migrations: **golang-migrate**

---

## 6. Database Architecture

- Provider: **PostgreSQL (Neon)**.
- All entities scoped by `userId` — per-doctor isolation.
- **JSONB** for flexible structures (odontogram, working hours, preferences).
- No direct access from the frontend under any circumstance.

---

## 7. Authentication Flow

```
Google OAuth
   │
   ▼
Auth.js (Next.js)
   │
   ▼
JWT issued
   │
   ▼
Frontend stores session
   │
   ▼
Services send JWT → Go API
   │
   ▼
Go API validates token
```

---

## 8. Security

- Every non-public request requires a valid JWT.
- Backend validates ownership (`userId`) before returning or mutating data.
- Frontend is **not trusted** — no sensitive logic, no ID spoofing defence.
- Secrets live in environment variables, never in git.
- HTTPS only in production.

---

## 9. Odontogram (domain-specific rules)

The odontogram is a central feature with its own invariants:

- Rendered as **interactive SVG** only. No canvas, no chart libraries.
- State shape: `Record<number, ToothState>` keyed by **FDI** tooth numbers
  (permanent 11–48, temporary 51–85).
- Persisted as **JSONB** in the API.
- Clinical marks (`MARK.CAVITY`, `MARK.FILLED`, `MARK.CROWN`,
  `MARK.EXTRACTION`, `MARK.ROOTCANAL`, `MARK.EXTRACTED`) come from
  `src/constants/odontogram.ts` — never hardcode the strings.

---

## 10. Engineering Guarantees

These run on every commit via Husky + lint-staged. All must pass.

| Check             | Tool                                |
| ----------------- | ----------------------------------- |
| Lint (auto-fix)   | `eslint --fix --max-warnings=0`     |
| Format            | `prettier --write`                  |
| Typecheck         | `tsc -p tsconfig.json --noEmit`     |
| Commit message    | `commitlint` (Conventional Commits) |

Additional enforcement:

- **`id-length`** ESLint rule (min 3, small whitelist) — prevents ambiguous
  single-letter identifiers.
- **No `any`** — `@typescript-eslint/no-explicit-any`.
- **No `console.log`** — only `console.warn` / `console.error`.
- **`max-len: 120`**, **`max-params: 3`**.
- **Commits** follow Conventional Commits:
  `feat(patients): add search by DNI`.
- **Branches** — never push to `main` directly. Work on
  `feature/<short-description>` and open a PR.

---

## 11. What Was Removed (Legacy)

The following patterns are **no longer part of the system**:

| Removed                               | Replaced by                   |
| ------------------------------------- | ----------------------------- |
| Server Actions for data               | `src/services/*.ts` → Go API  |
| Prisma in frontend                    | Go + pgx + sqlc               |
| `src/actions/`                        | `src/services/`               |
| Direct DB access from Next.js         | Go API only                   |
| `src/lib/prisma.ts`, `src/lib/db/`    | Go repository layer           |
| Route Handlers for data               | Auth.js OAuth handlers only   |

Do not reintroduce any of the above. If a task seems to require it, stop
and revisit the spec — the right answer is almost certainly an API call.

---

## 12. System Goal

The architecture is designed for:

- 🚀 Fast frontend iteration
- 📦 Scalable backend
- 🤖 Predictable AI-assisted development
- 🧪 Easy to test and reason about in isolation

---

## 13. Final Principle

> The frontend renders.
> The backend decides.
> The database persists.

---

## Changelog

| Version | Date       | Change                                                        |
| ------- | ---------- | ------------------------------------------------------------- |
| 2.0     | 2026-04-19 | Rewrite for the distributed Next.js + Go architecture. Remove legacy Prisma/Server Actions sections. Add spec-driven, constants layer, engineering guarantees, odontogram domain rules. |
| 1.1     | 2026-04-15 | Previous monolithic Next.js + Prisma architecture (superseded). |
