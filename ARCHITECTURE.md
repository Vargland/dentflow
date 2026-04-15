# DentFlow — Architecture Document

**Version:** 1.1  
**Date:** 2026-04-15  
**Status:** Approved

---

## 1. Overview

DentFlow es una aplicación web **fullstack** construida sobre Next.js App Router. No hay backend separado — el servidor y el cliente coexisten en el mismo proyecto usando el modelo de React Server Components + Server Actions.

```
Browser (Client)
     │
     ▼
Next.js App Router (Server)
     │
     ├── React Server Components  → renderiza HTML en el servidor
     ├── Server Actions           → mutaciones (POST, PUT, DELETE)
     ├── Route Handlers           → API endpoints (webhooks, OAuth)
     │
     ▼
Prisma ORM
     │
     ▼
PostgreSQL (Neon)
```

---

## 2. Frontend Conventions

### 2.0 Non-Negotiable Rules

| Rule | Detail |
|------|--------|
| **Language** | All code, variable names, function names, file names, folder names → English only |
| **Comments** | TSDoc format (`/** ... */`) in English on every exported function, component, type and interface |
| **Commits** | Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `test:` |
| **Path aliases** | Use `@/` aliases always — no relative `../../` imports |
| **Types vs Interfaces** | `interface` for anything touching services/API/Prisma. `type` for UI props, local unions, utility types |
| **Typing location** | All types/interfaces live in `src/typing/` organized by domain |
| **No `any`** | Use `unknown` + type guards or proper interfaces |
| **No raw SQL** | Prisma client only |

### 2.0.1 Path Aliases (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*":            ["./src/*"],
      "@/ui/*":         ["./src/components/ui/*"],
      "@/components/*": ["./src/components/*"],
      "@/actions/*":    ["./src/actions/*"],
      "@/lib/*":        ["./src/lib/*"],
      "@/typing/*":     ["./src/typing/*"],
      "@/locales/*":    ["./src/locales/*"]
    }
  }
}
```

### 2.0.2 TSDoc Convention

```ts
/**
 * Renders the patient list with search and pagination.
 *
 * @param patients - Array of patients to display
 * @param onSelect - Callback fired when a patient row is clicked
 * @returns A server-rendered table of patients
 */
export function PatientList({ patients, onSelect }: PatientListProps) { ... }
```

### 2.0.3 Conventional Commits

```
feat(patients): add patient search by DNI
fix(auth): resolve redirect loop on session expiry
refactor(odontogram): extract ToothSVG into separate component
chore(deps): upgrade prisma to 5.22
docs(architecture): add typing conventions
style(navbar): fix mobile menu alignment
test(patients): add unit tests for createPatient action
```

---

## 3. Frontend Architecture

### 3.1 Rendering Strategy

| Tipo | Cuándo usarlo | Ejemplos |
|------|--------------|---------|
| **Server Component** (default) | Fetch de datos, renderizado inicial, sin interactividad | Patient list, patient detail, evolution list |
| **Client Component** (`"use client"`) | Estado local, eventos, hooks del browser | Forms, odontogram SVG, calendar, modals |
| **Server Action** | Mutaciones desde el cliente al servidor | createPatient, addEvolution, saveOdontogram |

**Regla:** empezar siempre como Server Component. Agregar `"use client"` solo cuando sea estrictamente necesario.

### 3.2 Component Hierarchy

```
app/
├── layout.tsx                        # Root layout (I18nProvider, Toaster)
├── page.tsx                          # Redirect → /patients
│
├── (auth)/
│   └── login/
│       ├── page.tsx                  # SC: login shell
│       └── _components/
│           └── login-button.tsx      # CC: Google OAuth button
│
└── (dashboard)/
    ├── layout.tsx                    # SC: Navbar + auth check
    │
    ├── patients/
    │   ├── page.tsx                  # SC: patient list + search
    │   ├── _components/              # components private to /patients
    │   │   ├── patient-search.tsx    # CC: search input
    │   │   └── patient-table.tsx     # SC: table of results
    │   ├── new/
    │   │   └── page.tsx              # SC: shell → CC: PatientForm
    │   └── [id]/
    │       ├── page.tsx              # SC: patient detail tabs
    │       ├── edit/
    │       │   └── page.tsx          # SC: shell → CC: PatientForm
    │       └── _components/          # components private to /patients/[id]
    │           ├── patient-tabs.tsx      # CC: tab switcher
    │           ├── odontogram-tab.tsx    # SC: load data → CC: Odontogram
    │           ├── history-tab.tsx       # SC: load evolutions → CC: EvolutionList
    │           └── billing-tab.tsx       # SC: load payments summary
    │
    ├── appointments/
    │   ├── page.tsx                  # SC: calendar shell
    │   ├── new/
    │   │   └── page.tsx              # SC: shell → CC: AppointmentForm
    │   └── _components/              # components private to /appointments
    │       ├── calendar-view.tsx      # CC: monthly/weekly view
    │       ├── day-view.tsx           # CC: day slots view
    │       └── appointment-list.tsx   # CC: filterable list
    │
    ├── billing/
    │   ├── page.tsx                  # SC: financial dashboard
    │   └── _components/
    │       ├── billing-stats.tsx      # SC: summary cards
    │       └── payment-table.tsx      # SC: payments table
    │
    └── settings/
        ├── page.tsx                  # SC: shell → CC: SettingsForm
        └── _components/
            └── settings-form.tsx     # CC: profile + preferences form
```

**Rule:** Route-specific components live in `_components/` inside their route folder. Never import a route-specific component from outside that route.

### 3.3 Shared Components

Reusable across multiple routes — live in `src/components/`:

```
src/components/
├── ui/                        # shadcn/ui primitives (auto-generated, do not edit)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
│
├── layout/                    # App shell components
│   ├── navbar.tsx             # CC: top navigation bar
│   ├── page-header.tsx        # SC: page title + breadcrumbs
│   └── sidebar.tsx            # CC: mobile sidebar (future)
│
├── patients/                  # Shared patient components (used in >1 route)
│   ├── patient-form.tsx       # CC: create/edit form (used in /new and /[id]/edit)
│   └── patient-avatar.tsx     # SC: avatar with initials fallback
│
├── odontogram/                # Odontogram system
│   ├── odontogram.tsx         # CC: main interactive component
│   ├── tooth-svg.tsx          # CC: single tooth with 5 surfaces
│   └── surface-legend.tsx     # CC: state color legend
│
├── evolution/                 # Clinical history components
│   ├── evolution-list.tsx     # CC: accordion list of visits
│   └── evolution-form.tsx     # CC: add/edit visit form
│
├── appointments/              # Shared appointment components
│   └── appointment-form.tsx   # CC: create/edit appointment form
│
└── shared/                    # Generic reusable UI
    ├── confirm-dialog.tsx     # CC: delete confirmation modal
    ├── empty-state.tsx        # SC: empty list placeholder
    ├── loading-skeleton.tsx   # CC: skeleton loaders
    ├── data-table.tsx         # CC: sortable/filterable table
    └── lang-switcher.tsx      # CC: ES/EN toggle
```

### 3.4 Typing System

All types and interfaces live in `src/typing/`, organized by domain:

```
src/typing/
├── services/              # interfaces — anything that touches the DB / API / Server Actions
│   ├── patient.interface.ts
│   ├── evolution.interface.ts
│   ├── appointment.interface.ts
│   ├── billing.interface.ts
│   └── user.interface.ts
│
├── components/            # types — props, local unions, component-specific shapes
│   ├── patient.types.ts
│   ├── odontogram.types.ts
│   ├── appointment.types.ts
│   └── form.types.ts
│
└── pages/                 # types — page-level params, searchParams shapes
    ├── patient.types.ts
    └── appointment.types.ts
```

**Rule — interface vs type:**

```ts
// ✅ interface: anything from DB / Server Action / API response
interface Patient {
  id: string;
  nombre: string;
  apellido: string;
  userId: string;
  createdAt: Date;
}

interface CreatePatientInput {
  nombre: string;
  apellido: string;
  dni?: string;
}

// ✅ type: UI props, local unions, utility shapes
type PatientFormProps = {
  patient?: Patient;
  onSuccess?: () => void;
};

type ToothState = "healthy" | "cavity" | "filled" | "extraction" | "crown" | "rootcanal";

type OdontogramSurface = "M" | "D" | "O" | "V" | "L";
```

### 2.4 State Management

DentFlow **no usa Redux ni Zustand**. El estado se maneja así:

| Tipo de estado | Solución |
|---------------|----------|
| Estado del servidor (DB) | Server Components + revalidatePath |
| Estado local de UI | `useState` / `useReducer` |
| Estado de formularios | `react-hook-form` + Zod |
| Estado de sesión | Auth.js JWT (cookie) |
| Estado global ligero | React Context (solo i18n y theme) |

### 2.5 Forms

Todos los formularios siguen este patrón:

```
CC: Form (react-hook-form + zod)
  │
  ├── client-side validation (Zod schema)
  │
  └── onSubmit → Server Action
        │
        ├── server-side validation (Zod schema, misma o más estricta)
        ├── auth check (userId from session)
        ├── prisma mutation
        └── revalidatePath + redirect
```

### 2.6 i18n

```
src/lib/i18n/
├── settings.ts      # languages, fallback, cookie name
├── server.ts        # getTranslation(lang) → para Server Components
└── client.ts        # useTranslation() → para Client Components

src/locales/
├── en/common.json
└── es/common.json
```

- Idioma detectado desde cookie `dentflow-lang`
- Server Components leen la cookie via `getCookies()`
- Client Components sincronizan via `I18nProvider`
- Sin prefijo de idioma en la URL (`/patients`, no `/es/patients`)

---

## 3. Backend Architecture

> Next.js is **pure frontend**. All data fetching and mutations go through the Go API.
> See `BACKEND_ARCHITECTURE.md` for the full Go backend spec.

### 3.1 Data Flow

```
Client Component
    │
    │  fetch() with Authorization: Bearer <jwt>
    ▼
src/services/*.ts  (API client layer)
    │
    │  REST /api/v1/
    ▼
Go API (chi router)
    │
    ▼
PostgreSQL (Neon) via pgx + sqlc
```

```
Server Component (page.tsx)
    │
    ├── 1. Auth: auth() → get JWT token from session
    ├── 2. Call: service.getPatients(token)  ← hits Go API
    └── 3. Render: pass data as props to children
```

### 3.2 Service Layer (frontend)

All API calls live in `src/services/` — never call `fetch` directly from a component:

```
src/services/
├── api-client.ts          # Base fetch wrapper: attaches JWT, handles errors, parses JSON
├── patients.service.ts    # getPatients, getPatient, createPatient, updatePatient, deletePatient
├── evolution.service.ts   # getEvolutions, addEvolution, updateEvolution, deleteEvolution
├── odontogram.service.ts  # getOdontogram, saveOdontogram, getOdontogramHistory
├── appointments.service.ts
├── billing.service.ts
└── settings.service.ts
```

Service pattern:
```ts
/**
 * Fetches all patients for the authenticated doctor.
 * @param token - JWT bearer token from Auth.js session
 * @returns Array of patients scoped to the doctor
 */
const getPatients = async (token: string): Promise<Patient[]> => {
  const res = await apiClient.get('/patients', token)
  return PatientListSchema.parse(res)
}
```

### 3.3 Route Handlers (Next.js — minimal)

Only for Auth.js — no data endpoints in Next.js:

```
src/app/api/
└── auth/[...nextauth]/route.ts   # Auth.js OAuth handlers only
```

### 3.4 Middleware

```
src/middleware.ts
  │
  ├── Public: /login, /api/auth/** → pass through
  └── Everything else: verify JWT session
        ├── Authenticated → next()
        └── Not authenticated → redirect /login?callbackUrl=...
```

### 3.5 What is REMOVED from Next.js

| Removed | Replaced by |
|---------|-------------|
| `src/actions/*.ts` (Server Actions) | `src/services/*.ts` → Go API |
| `src/lib/prisma.ts` | Go + pgx + sqlc |
| `src/lib/db/` | Go repository layer |
| Prisma schema (data queries) | sqlc generated queries in Go |

---

## 4. Database Architecture

### 4.1 Provider

**Neon** (PostgreSQL serverless) — acceso via connection string con `sslmode=require`.

### 4.2 Schema Overview

```
User (1) ──────────────── (N) Patient
  │                              │
  │                         (N) Evolution
  │                              │
  │                         (N) Appointment
  │                              │
  │                         (N) Budget
  │
  └── (1) Profile
```

Todas las entidades tienen `userId` — los datos de cada odontólogo están completamente aislados.

### 4.3 Key Design Decisions

| Decisión | Razón |
|----------|-------|
| `odontograma` como `Json` | El shape cambia (adulto/pediátrico/versiones), JSONB es más flexible que columnas fijas |
| `Evolution.dientes` como `Int[]` | Array nativo de PostgreSQL, fácil de consultar |
| `Budget.items` como `Json` | Lista variable de ítems sin tabla separada |
| `Profile.workingHours` como `Json` | Configuración flexible por día |
| `Decimal` para importes | Evita errores de float en dinero |
| No soft-delete en v1 | Simplicidad; se agrega en v2 si se necesita |

### 4.4 Migrations

- Desarrollo: `npx prisma migrate dev --name <descripcion>`
- Producción: `npx prisma migrate deploy` (en CI/CD)
- El schema en `prisma/schema.prisma` es la fuente de verdad

---

## 5. Auth Architecture

```
Google OAuth
    │
    ▼
Auth.js v5 (NextAuth)
    │
    ├── Provider: Google
    ├── Adapter: PrismaAdapter (crea User en DB al primer login)
    ├── Session strategy: JWT (no DB sessions)
    │
    ├── signIn callback: verifica ALLOWED_EMAILS whitelist
    ├── jwt callback: agrega user.id al token
    └── session callback: expone user.id al cliente
```

El `userId` del JWT se usa en cada Server Action para aislar los datos.

---

## 6. External Integrations

### 6.1 WhatsApp Reminders (MVP)
- No API directa — se genera un link `https://wa.me/{phone}?text={encodedMessage}`
- El odontólogo hace click y envía manualmente desde su WhatsApp
- Template configurable en Settings

### 6.2 Email Reminders (v2)
- Provider: Resend o SendGrid
- Trigger: cron job o queue 24hs antes del turno
- Template: HTML email con datos del turno

---

## 7. Infrastructure & Deploy

```
Vercel (hosting)
    │
    ├── Next.js App (serverless functions por route)
    ├── Edge Middleware (auth checks)
    └── Environment Variables
            ├── DATABASE_URL (Neon)
            ├── AUTH_SECRET
            ├── GOOGLE_CLIENT_ID / SECRET
            └── ALLOWED_EMAILS

Neon (PostgreSQL)
    └── Production database (serverless, auto-scale)
```

### 7.1 Environments

| Env | Branch | DB |
|-----|--------|----|
| Production | `main` | Neon production |
| Preview | `feature/*` | Neon dev branch (futuro) |
| Local | — | Neon production (via .env) |

---

## 8. Performance

| Técnica | Implementación |
|---------|---------------|
| Server Components | Fetch en servidor, sin waterfalls en cliente |
| Streaming | `Suspense` + `loading.tsx` para rutas lentas |
| Image optimization | `next/image` para avatares y fotos |
| Font optimization | `next/font` para fuentes |
| DB indexing | Índices en `userId`, `apellido`, `fecha` |
| Connection pooling | Neon serverless driver (futuro) |

---

## 9. Security

| Regla | Implementación |
|-------|---------------|
| Auth en cada request | Middleware JWT check |
| Row-level isolation | `userId` en todo WHERE de Prisma |
| Input validation | Zod en client + server |
| No raw SQL | Solo Prisma Client |
| Secrets en env | `.env` nunca en git |
| HTTPS only | Forzado por Vercel en producción |
| No `any` en TypeScript | ESLint rule `@typescript-eslint/no-explicit-any` |

---

## 10. Folder Structure (completa)

```
dentflow/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── actions/               # Server Actions por dominio
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   ├── api/auth/[...nextauth]/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                # shadcn primitivos
│   │   ├── layout/
│   │   ├── patients/
│   │   ├── odontogram/
│   │   ├── appointments/
│   │   ├── evolution/
│   │   ├── billing/
│   │   └── shared/
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── utils.ts
│   │   ├── db/                # query helpers
│   │   └── i18n/
│   │
│   ├── locales/
│   │   ├── en/common.json
│   │   └── es/common.json
│   │
│   ├── specs/                 # Spec-Driven Development
│   ├── middleware.ts
│   └── types/                 # TypeScript types globales
│
├── public/
├── .env
├── .env.example
├── PRD.md
├── ARCHITECTURE.md
├── CLAUDE.md
└── package.json
```
