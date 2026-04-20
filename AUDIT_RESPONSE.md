# DentFlow — CLAUDE.md Audit Response

> Audit executed against the current `CLAUDE.md` using the meta-prompt supplied
> by the architect (senior-engineer + architecture-reviewer role, STRICT mode).
> Context assumed: Next.js pure frontend, Go API as only backend, all data
> through `src/services/`, no Server Actions anywhere.

---

## 🔴 Critical Issues

### C1. Spec-Driven workflow cites dead artifacts
The current text says:
```
3. Codear → UI + DB + Actions
```
> "No se crea ningún modelo Prisma, Server Action, página ni componente nuevo
> hasta que la spec esté aprobada."

This directly contradicts the Architecture section: no Prisma, no Server Actions,
Next never touches the DB. An agent reading the doc top-to-bottom (Spec-Driven
is framed as the "regla de oro") will assume it can create Prisma models and
Server Actions until it reaches the Architecture section several pages later.

**Fix:**
```
3. Codear → UI en Next + endpoint en Go API + service en src/services/
```
Replace `"modelo Prisma, Server Action"` with `"endpoint Go, servicio Next,
página, ni componente"`.

---

### C2. Typing section describes the old stack
> `typing/services/ → interface for DB/API/Server Action shapes`
> `` `interface` for anything touching services/Prisma/API ``

DB and Server Actions do not apply. An agent may create `interface`s shaped like
Prisma models (with `@id`, ORM relations) instead of modelling the Go REST
contract.

**Fix:** `` `interface` for anything representing a Go API request/response shape. ``

---

### C3. Security section describes enforcement in Next
> "Sensitive data always fetched server-side, scoped by `userId`."

False for the current architecture. Scoping happens in the Go API via the JWT,
not in Next. An agent could try to filter by `userId` inside a Route Handler,
which is an anti-pattern (Next has no DB access to do that correctly).

**Fix:**
```
- All sensitive data flows through `src/services/` → Go API with
  `Authorization: Bearer <jwt>`.
- The Go API revalidates the JWT and scopes every query to `sub` (userId).
  Next never enforces data ownership.
- Never expose raw DB ids in client state; always derive from the authenticated
  response.
```

---

### C4. Tests row in pre-commit hooks is a lie
The doc lists:
```
| Tests | `npm run test` | `src/**/*.{ts,tsx}` |
```
`package.json` has `"test": "echo \"No tests yet\" && exit 0"` (no-op).
Architectural decision: unit tests are out of scope for now.

**Fix:** remove the row from the hooks table AND delete the no-op script from
`package.json`. A fake `npm test` is worse than none — it misleads agents and
any future CI wiring.

---

### C5. Middleware exception list is stale
> "protects all routes except `/login` and `/api/auth`"

`/api/lang` now exists. The doc does not state the policy for new Route
Handlers: must every `/api/*` pass through auth? Does `/api/lang` require a
session? What about handlers that proxy to the Go API — do they authenticate in
Next or rely on the API?

**Fix:** explicit Route Handlers policy (see A1 below).

---

## 🟡 Ambiguities

### A1. "pure frontend" vs Route Handlers
The doc says "Next.js is pure frontend" but also defines `src/app/api/` with
Route Handlers. Route Handlers run in Node — strictly, that is not "pure
frontend". A STRICT agent can reach contradictory conclusions:

- "I cannot create Route Handlers because Next is pure frontend."
- "I can move business logic to a Route Handler because it runs server-side."

**Fix — Route Handlers policy:**
```
Route Handlers in src/app/api/ are allowed ONLY for:
1. NextAuth callbacks (/api/auth/*)
2. Platform cookies that must be HttpOnly (e.g. /api/lang)
3. Thin proxies to the Go API that require server-side token handling

Route Handlers MUST NOT:
- Access a database
- Implement business logic
- Validate domain rules (that lives in Go)
- Keep in-memory state
```

---

### A2. `src/services/` contract is undefined
The doc says "REST calls to Go API" but leaves open:

- Are services called from Server Components or Client Components?
- Where does the JWT come from (`auth()` server-only vs `useSession()`
  client-only)?
- What does a service do on 401 / 500 / network error?
- Is the response always validated with Zod, or optionally?

Each agent will invent different conventions per service.

**Fix — Services contract:**
```
- Services are called from Server Components (preferred) or Route Handlers.
- Services are NEVER called directly from Client Components — data arrives as
  props.
- Every service:
  1. Receives `token: string` explicitly as a parameter (never reads session
     internally).
  2. Parses the response body with Zod. Unvalidated data is forbidden.
  3. Throws a typed `ApiError` on non-2xx. Never returns `null` for error cases.
- Session is resolved once at the page boundary with `auth()` and passed down.
```

---

### A3. Odontogram "persisted as JSONB"
> "Persisted as JSONB by the Go API — the frontend calls the odontogram
> service"

Unanswered: full JSONB per save vs delta? Optimistic updates? Conflict
resolution when two tabs edit? Without a contract, every agent solves this
differently.

**Fix:** define the save contract in the odontogram spec under `src/specs/`
and link it from CLAUDE.md.

---

### A4. "No inline comments in Spanish"
Clear for comments, but user-facing strings are a different concern. A STRICT
agent could see a `"Paciente creado"` toast and "fix it" to English, breaking
i18n.

**Fix:**
```
User-facing strings are always translated via `t()` (EN + ES locales).
Code (identifiers, comments, logs) is English-only.
```

---

### A5. `@AGENTS.md` import lacks a concrete consequence
The first line imports `AGENTS.md` which warns "This is NOT the Next.js you
know". An agent can dismiss it as folklore and keep relying on training data.
Missing the operational consequence:

**Fix (append to AGENTS.md or CLAUDE.md):**
```
Before generating any Next.js code, read node_modules/next/dist/docs/ for the
specific API you plan to use. Do not rely on training-data defaults.
```

---

### A6. Missing `@/services` path alias
The listed aliases are `@/ui/*, @/components/*, @/lib/*, @/typing/*,
@/locales/*`. `@/services` — the central data layer — is missing. Agents will
use relative imports or invent the alias.

**Fix:** add `@/services/*` to `tsconfig.json` paths, to the eslint
import-sort order, and list it in the doc. Consider `@/constants/*` and
`@/specs/*` too.

---

## 🟢 Suggested Improvements

### I1. Add a binary Do / Don't matrix
A STRICT agent performs better with a binary table than with prose. Append this
to the Architecture section:

```
| Task                          | Do                           | Don't                  |
|-------------------------------|------------------------------|------------------------|
| Fetch patient data            | Service → Go API             | fetch() in component   |
| Validate user input           | Zod at service boundary      | Ad-hoc if/else checks  |
| Persist state                 | POST to Go API endpoint      | Route Handler + DB     |
| Set cookies                   | Route Handler /api/*         | "use server" file      |
| Auth check                    | middleware.ts + Go JWT guard | Per-component checks   |
| Share component across routes | src/components/<domain>/     | Copy into _components/ |
| Add a constant                | src/constants/<domain>.ts    | Inline literal         |
```

One table replaces half a dozen prose rules and is what a STRICT agent parses
best.

---

### I2. Document the Constants layer
`src/constants/odontogram.ts` already exists but is invisible in the doc.
Agents will duplicate literals because they do not know the layer is there.

**Fix — new section:**
```
### Constants
- Domain literals (enum values, colors, FDI numbers, status strings) live in
  src/constants/<domain>.ts.
- Never inline a domain literal more than once — extract to constants on
  second use.
- Constants are typed with `as const satisfies <Type>` to enforce
  exhaustiveness.
```

---

### I3. Error-handling policy (currently absent)
No rule covers:
- A service failing (network, 5xx)
- A Route Handler failing
- A Server Component failing to fetch

Agents will invent: silent `try/catch`, propagated `throw`, empty fallback —
inconsistent UX.

**Fix:**
```
### Error Handling
- Services throw `ApiError` (typed) on any non-2xx. They never swallow errors.
- Server Components let errors bubble to the nearest error.tsx boundary.
- Client Components that fetch (via a typed hook) expose `{ data, error,
  loading }`.
- Never render raw `error.message` in production — map to user-friendly i18n
  keys.
- Log errors server-side with request id + userId. Never log PHI body.
```

---

### I4. Explicit security policy (medical app, non-negotiable)
Missing hard rules for PHI:
```
### Security (non-negotiable for medical data)
- Every Route Handler sets `Cache-Control: no-store` by default.
- Every mutating Route Handler validates `Origin === Host` (CSRF).
- The JWT lives in an HttpOnly, SameSite=Strict cookie. Never read it from JS.
- Logs NEVER contain: patient names, clinical notes, odontogram data, emails,
  phones.
  Logs MAY contain: userId, patientId (uuid), request id, latency, status.
- Error responses to the client never include stack traces or internal paths.
- No third-party scripts on authenticated pages unless vetted and listed here.
```

---

### I5. Mutation policy
Today reads and writes are not distinguished. Agents do not know whether a POST
should invalidate cache, call `router.refresh()`, or do an optimistic update.

**Fix:**
```
### Mutations
- Every mutation goes through a service: `postX`, `updateX`, `deleteX`.
- After a successful mutation, the caller decides the UI refresh strategy:
  - Server Component page: `revalidatePath()` from a Route Handler, or a full
    navigation.
  - Client Component: `router.refresh()` to re-fetch Server Component data.
- Optimistic updates are OPT-IN per feature and must be documented in the spec.
- Never mix optimistic + pessimistic within the same screen.
```

---

### I6. Reorder the doc
A STRICT agent reads top-to-bottom and applies what it sees first. Current
order:
1. Project overview
2. Stack
3. Spec-driven (mentions Prisma, Actions, DB — stale)
4. Critical Rules (corrects the above)

Recommended order:
1. Overview
2. Architecture (the definitive truth, first)
3. Stack (follows from Architecture)
4. Spec-Driven (aligned with Architecture)
5. Critical Rules
6. Operational (commands, hooks, checklist)

So an agent reading the first 40% of the doc does not get poisoned with stale
information.

---

## ❓ Questions for the Architect

1. **Service call sites.** Are `src/services/*` called only from Server
   Components, only from Route Handlers, or from both? I need the rule to
   document it unambiguously.
2. **Typed errors.** Do you want a typed `ApiError` class as the single error
   contract for services? Without it, every service handles errors differently.
3. **Cache invalidation.** After mutations: always `router.refresh()`, or
   adopt `revalidatePath` / `revalidateTag` in Route Handlers? Mixing the two
   models is a bug source.
4. **Specs index.** Does `src/specs/README.md` exist? Either we create it or
   we remove the reference.
5. **Aliases.** Add `@/services/*` (and probably `@/constants/*`, `@/specs/*`)
   to `tsconfig.json` now?
6. **PHI logging.** Who enforces "never log PHI" — the doc, a lint rule, code
   review? Without an enforcement mechanism the rule will be broken.

---

## 🧠 Follow-up Prompt (reusable)

Use this to iterate CLAUDE.md to v2 after decisions are taken:

```
Given the current CLAUDE.md plus the architect's decisions on C1–C5 and
A1–A6, produce v2 of the document that:

1. Removes every mention of Prisma, Server Actions, and DB-in-Next.
2. Adds a `### Route Handlers (policy)` section with explicit allowed /
   forbidden uses.
3. Adds a `### Services (contract)` section with standard signature, token
   handling, and mandatory Zod.
4. Adds a `### Security (non-negotiable)` section tailored to medical data.
5. Adds the Do / Don't matrix at the end of the Architecture section.
6. Reorders the doc: Architecture first, Spec-Driven after.
7. Lists the real aliases (including `@/services`, `@/constants`).

Do not change style or wording elsewhere. Only structure and technical
content.

In the commit message, list which sections changed and why.
```

---

## Reviewer Verdict

- **C1, C2, C3, C5** (Prisma / Actions / DB / middleware contradictions) are
  **real and blocking** — a STRICT agent will take wrong decisions against the
  current doc.
- **A1, A2, I3, I4, I5** (Route Handlers, services, errors, security,
  mutations) are **missing policies**, not contradictions. These are decisions
  pending before the app grows — they cannot be left to agent judgement.
- **I1, I6** (Do/Don't matrix, reorder) are **high-ROI legibility** for
  agent consumption.

**Recommended split:**
- PR #1 (docs-only): C1–C5 + A1 + A2 + I3 + I4. Unblocks agents immediately.
- PR #2 (after decisions): I1, I5, I6 and the remaining ambiguities. These
  require architect input on Q1–Q6.

Tests are explicitly out of scope and will be removed from the hooks table +
`package.json`.
