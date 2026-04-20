# GitHub Issues — CLAUDE.md Audit Follow-up

> Ready-to-paste issues for https://github.com/Vargland/dentflow/issues/new
> Copy each block's **Title** into the title field and the **Body** into the
> description. Apply the suggested **Labels** (create them if missing).
>
> Suggested label palette:
> - `docs` — documentation changes
> - `architecture` — affects high-level design
> - `blocking` — must-fix before new features
> - `security` — relates to data / auth / PHI
> - `agent-ux` — improves AI-assisted development
> - `needs-decision` — requires architect input before coding
>
> Recommended milestone: **Docs v2**.

---

## Epic — parent issue to open first

### Title
```
Epic: CLAUDE.md v2 — eliminate stale references and add missing policies
```

### Body
```markdown
Tracking issue for the audit executed on CLAUDE.md (see AUDIT_RESPONSE.md in
the repo). Split into two PRs:

**PR #1 — Critical fixes (blocking)**
- [ ] #C1 Spec-Driven workflow cites Prisma / Server Actions / DB
- [ ] #C2 Typing section describes the old stack
- [ ] #C3 Security section places ownership checks in Next
- [ ] #C5 Middleware exception list is stale
- [ ] #A1 Route Handlers policy (allowed / forbidden)
- [ ] #A2 Services contract (token, Zod, error type)
- [ ] #I3 Error-handling policy
- [ ] #I4 Security policy (non-negotiable for medical data)
- [ ] #C4 Remove fake `npm test` from hooks table and package.json

**PR #2 — Policies & agent UX (after decisions)**
- [ ] #I1 Do / Don't matrix in Architecture section
- [ ] #I5 Mutation policy (refresh vs revalidate vs optimistic)
- [ ] #I6 Reorder doc: Architecture before Spec-Driven

**Open questions to answer before PR #1:**
- Q1 Service call sites (Server Components only? Route Handlers too?)
- Q2 Typed `ApiError` class — adopt?
- Q3 Cache invalidation strategy (`router.refresh` vs `revalidatePath`)
- Q4 Does `src/specs/README.md` exist?
- Q5 Add `@/services/*` (and maybe `@/constants/*`, `@/specs/*`) aliases now?
- Q6 PHI logging — how do we enforce "never log PHI"?

Source audit: `AUDIT_RESPONSE.md` in the repo root.
```

### Labels
`docs` · `architecture` · `blocking`

---

# PR #1 — Critical Fixes (bloqueantes)

## Issue 1

### Title
```
docs(claude): C1 — Spec-Driven workflow cites Prisma / Server Actions / DB
```

### Body
```markdown
**Severity:** 🔴 Critical — blocking

**Problem**
The Spec-Driven section reads:

> 3. Codear → UI + DB + Actions
> No se crea ningún modelo Prisma, Server Action, página ni componente nuevo
> hasta que la spec esté aprobada.

This contradicts the Architecture section (no Prisma, no Server Actions, Next
never touches the DB). A STRICT agent reading top-to-bottom may create Prisma
models or Server Actions before reaching the corrective rules.

**Fix**
Replace the step and the sentence:

- Step 3: `Codear → UI en Next + endpoint en Go API + service en src/services/`
- Forbidden artifacts list: drop "modelo Prisma, Server Action"; keep
  "página, componente, endpoint Go, servicio Next".

**Done when**
- [ ] CLAUDE.md no longer mentions Prisma or Server Actions in Spec-Driven.
- [ ] Workflow reflects the Next-as-frontend + Go-as-backend split.

Source: `AUDIT_RESPONSE.md` § 🔴 C1
```

### Labels
`docs` · `architecture` · `blocking`

---

## Issue 2

### Title
```
docs(claude): C2 — Typing section describes the old stack
```

### Body
```markdown
**Severity:** 🔴 Critical — blocking

**Problem**
The Typing section says:

> typing/services/ → interface for DB/API/Server Action shapes
> `interface` for anything touching services/Prisma/API

Prisma and Server Actions are dead. An agent may shape `interface`s like Prisma
models (with ORM relations) instead of modelling the Go REST contract.

**Fix**
Rewrite both bullets as:

- `typing/services/` → `interface` for Go API request/response shapes.
- `interface` for anything representing a Go API contract.

**Done when**
- [ ] No mention of Prisma or Server Actions in the Typing section.
- [ ] Each bullet explicitly names the Go API as the source of shape.

Source: `AUDIT_RESPONSE.md` § 🔴 C2
```

### Labels
`docs` · `blocking`

---

## Issue 3

### Title
```
docs(claude): C3 — Security section wrongly places ownership checks in Next
```

### Body
```markdown
**Severity:** 🔴 Critical — blocking · security-relevant

**Problem**
Current text:

> Sensitive data (patient records) always fetched server-side, scoped by
> `userId`.

False under the current architecture: scoping happens in Go via the JWT, not
in Next. An agent could filter by `userId` inside a Route Handler — an
anti-pattern because Next has no DB access to do it correctly.

**Fix**
Replace the Security bullet with:

- All sensitive data flows through `src/services/` → Go API with
  `Authorization: Bearer <jwt>`.
- The Go API revalidates the JWT and scopes every query to `sub` (userId).
  Next never enforces data ownership.
- Never expose raw DB ids in client state; always derive from the
  authenticated response.

**Done when**
- [ ] Security section names Go as the sole enforcer of ownership.
- [ ] Next's role is limited to forwarding the JWT.

Source: `AUDIT_RESPONSE.md` § 🔴 C3
```

### Labels
`docs` · `security` · `blocking`

---

## Issue 4

### Title
```
chore: C4 — remove the fake `npm test` script and hooks row
```

### Body
```markdown
**Severity:** 🔴 Critical — doc/code mismatch

**Problem**
- CLAUDE.md hooks table lists `| Tests | npm run test | ... |`.
- `package.json` has `"test": "echo \"No tests yet\" && exit 0"`.

Decision: unit tests are out of scope for now. Having a no-op `npm test` is
worse than none — it misleads agents and any CI wiring.

**Fix**
- [ ] Remove the `Tests` row from the hooks table in CLAUDE.md.
- [ ] Remove the `"test"` entry from `package.json`.
- [ ] Make sure no `.lintstagedrc.js` / Husky hook references `npm test`.
- [ ] If commitlint still allows the `test:` commit type, leave it — that is
      the commit-type `test`, not test execution.

**Done when**
- [ ] `npm test` returns "npm ERR! missing script" (or similar) — clearly no
      tests defined.
- [ ] Docs no longer mention test execution.

Source: `AUDIT_RESPONSE.md` § 🔴 C4
```

### Labels
`docs` · `blocking`

---

## Issue 5

### Title
```
docs(claude): C5 — middleware exception list is stale
```

### Body
```markdown
**Severity:** 🔴 Critical — blocking · security-relevant

**Problem**
Current text:

> Auth middleware at `src/middleware.ts` protects all routes except `/login`
> and `/api/auth`.

`/api/lang` now exists. The doc does not state the policy for new Route
Handlers: must every `/api/*` go through auth? Does `/api/lang` need a
session? What about proxies to the Go API?

**Fix**
Extend the rule with an explicit table of exceptions and the default policy:

- Default: all routes require an authenticated session.
- Exceptions (must be listed and justified):
  - `/login` — public entry point.
  - `/api/auth/*` — NextAuth callbacks (own auth flow).
  - `/api/lang` — platform cookie, protected by same-origin check only.
- Any new exception requires a security note in the PR.

**Done when**
- [ ] Exception list in CLAUDE.md matches `src/middleware.ts`.
- [ ] Policy for adding new exceptions is documented.
- [ ] Resolves overlap with A1 (Route Handlers policy).

Source: `AUDIT_RESPONSE.md` § 🔴 C5
```

### Labels
`docs` · `security` · `blocking`

---

## Issue 6

### Title
```
docs(claude): A1 — define Route Handlers policy (allowed / forbidden)
```

### Body
```markdown
**Severity:** 🟡 Ambiguity — blocking for PR #1

**Problem**
CLAUDE.md says "Next.js is pure frontend" but `src/app/api/*` Route Handlers
exist and run in Node. A STRICT agent can conclude contradictory things:

- "I cannot create Route Handlers because Next is pure frontend."
- "I can put business logic in a Route Handler because it runs server-side."

**Fix — new subsection**
```
### Route Handlers
Allowed ONLY for:
1. NextAuth callbacks (/api/auth/*)
2. Platform cookies that must be HttpOnly (e.g. /api/lang)
3. Thin proxies to the Go API that require server-side token handling

MUST NOT:
- Access a database
- Implement business logic
- Validate domain rules (that lives in Go)
- Keep in-memory state
```

**Done when**
- [ ] New "Route Handlers" subsection added under Architecture.
- [ ] Allowed and forbidden cases are explicit binary rules.
- [ ] Matches the reality of `/api/auth`, `/api/lang`.

Source: `AUDIT_RESPONSE.md` § 🟡 A1
```

### Labels
`docs` · `architecture` · `agent-ux`

---

## Issue 7

### Title
```
docs(claude): A2 — define the Services contract (token, Zod, error type)
```

### Body
```markdown
**Severity:** 🟡 Ambiguity — blocking for PR #1 · depends on Q1 & Q2

**Problem**
CLAUDE.md says "REST calls to Go API" but leaves open:

- Are services called from Server Components, Route Handlers, or Client
  Components?
- Where does the JWT come from (`auth()` server-only vs `useSession()` client)?
- How does a service react to 401 / 500 / network failures?
- Is the response always validated with Zod?

Each agent will invent different conventions per service.

**Proposed contract (pending Q1 + Q2)**
```
### Services (contract)
- Called from Server Components (preferred) or Route Handlers.
- NEVER called directly from Client Components — data arrives as props.
- Every service:
  1. Receives `token: string` as an explicit parameter.
  2. Parses the response body with Zod.
  3. Throws `ApiError` (typed) on any non-2xx — never returns `null`.
- Session is resolved once at the page boundary with `auth()`.
```

**Open questions (answer in the issue before coding)**
- Q1 — Servers Components only? Or also Route Handlers? Or also Client?
- Q2 — Adopt a typed `ApiError` class now?

**Done when**
- [ ] Q1 and Q2 answered in this issue.
- [ ] New "Services (contract)" subsection added to CLAUDE.md.
- [ ] Existing services audited for compliance (or a follow-up issue opened).

Source: `AUDIT_RESPONSE.md` § 🟡 A2
```

### Labels
`docs` · `architecture` · `needs-decision`

---

## Issue 8

### Title
```
docs(claude): I3 — add error-handling policy
```

### Body
```markdown
**Severity:** 🟢 Improvement — blocking for PR #1 · depends on Q2

**Problem**
CLAUDE.md has no rule for handling failures in services, Route Handlers, or
Server Components. Agents will invent inconsistent strategies (silent catch,
propagated throw, empty fallback) → inconsistent UX.

**Proposed policy (pending Q2)**
```
### Error Handling
- Services throw `ApiError` on any non-2xx. They never swallow errors.
- Server Components let errors bubble to the nearest error.tsx boundary.
- Client Components expose `{ data, error, loading }` via typed hooks.
- Never render raw `error.message` in production — map to i18n keys.
- Log errors server-side with request id + userId. Never log PHI body.
```

**Open question**
- Q2 — Confirm typed `ApiError`. Without it this policy needs rewording.

**Done when**
- [ ] Q2 answered.
- [ ] New "Error Handling" section added.
- [ ] `error.tsx` exists at the relevant route segments, or a follow-up issue
      is filed.

Source: `AUDIT_RESPONSE.md` § 🟢 I3
```

### Labels
`docs` · `architecture` · `needs-decision`

---

## Issue 9

### Title
```
docs(claude): I4 — add non-negotiable security policy for medical data
```

### Body
```markdown
**Severity:** 🟢 Improvement — blocking for PR #1 · security-critical

**Problem**
The app handles PHI (clinical records, odontograms, patient identifiers). The
doc lacks hard rules that an agent can follow mechanically.

**Proposed policy**
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

**Open question**
- Q6 — Enforcement mechanism for "never log PHI" (doc only? lint rule? review?)

**Done when**
- [ ] Q6 answered.
- [ ] New "Security (non-negotiable)" section added to CLAUDE.md.
- [ ] Existing Route Handlers audited against the list, or follow-up issues
      filed per violation.

Source: `AUDIT_RESPONSE.md` § 🟢 I4
```

### Labels
`docs` · `security` · `needs-decision`

---

# PR #2 — Policies & Agent UX (after PR #1 merges)

## Issue 10

### Title
```
docs(claude): I1 — add Do / Don't matrix at the end of Architecture §
```

### Body
```markdown
**Severity:** 🟢 Improvement — high ROI for agent UX
**Depends on:** PR #1 merged (otherwise the matrix references stale rules)

**Problem**
STRICT agents parse binary tables better than prose. Several rules today are
spread across paragraphs where a one-row lookup would do.

**Proposed matrix**
| Task                          | Do                           | Don't                  |
|-------------------------------|------------------------------|------------------------|
| Fetch patient data            | Service → Go API             | fetch() in component   |
| Validate user input           | Zod at service boundary      | Ad-hoc if/else checks  |
| Persist state                 | POST to Go API endpoint      | Route Handler + DB     |
| Set cookies                   | Route Handler /api/*         | "use server" file      |
| Auth check                    | middleware.ts + Go JWT guard | Per-component checks   |
| Share component across routes | src/components/<domain>/     | Copy into _components/ |
| Add a constant                | src/constants/<domain>.ts    | Inline literal         |

**Done when**
- [ ] Matrix appended to the Architecture section.
- [ ] Each row references an existing rule elsewhere in the doc (no new rules
      introduced here).

Source: `AUDIT_RESPONSE.md` § 🟢 I1
```

### Labels
`docs` · `agent-ux`

---

## Issue 11

### Title
```
docs(claude): I5 — add mutation policy (refresh / revalidate / optimistic)
```

### Body
```markdown
**Severity:** 🟢 Improvement — needs-decision
**Depends on:** Q3

**Problem**
CLAUDE.md does not distinguish reads from writes. Agents do not know whether
a POST should:
- Invalidate the cache
- Call `router.refresh()`
- Do an optimistic update
Result: inconsistent UX across features.

**Proposed policy (pending Q3)**
```
### Mutations
- Every mutation goes through a service (`postX`, `updateX`, `deleteX`).
- After a successful mutation the caller chooses the refresh strategy:
  - Server Component page: `revalidatePath()` or full navigation.
  - Client Component: `router.refresh()`.
- Optimistic updates are OPT-IN per feature and must be documented in the spec.
- Never mix optimistic + pessimistic within the same screen.
```

**Open question**
- Q3 — Default strategy: always `router.refresh()`, or adopt
  `revalidatePath` / `revalidateTag`?

**Done when**
- [ ] Q3 answered.
- [ ] New "Mutations" section added.

Source: `AUDIT_RESPONSE.md` § 🟢 I5
```

### Labels
`docs` · `architecture` · `needs-decision`

---

## Issue 12

### Title
```
docs(claude): I6 — reorder doc so Architecture precedes Spec-Driven
```

### Body
```markdown
**Severity:** 🟢 Improvement — agent UX

**Problem**
A STRICT agent applies the first rule it sees. Current order:
1. Overview
2. Stack
3. Spec-Driven (currently mentions stale artifacts — fixed in PR #1)
4. Critical Rules (corrects the above)

An agent reading the first 40% of the doc gets the old mental model.

**Proposed order**
1. Overview
2. **Architecture** (definitive truth first)
3. Stack (consequence of Architecture)
4. Spec-Driven
5. Critical Rules
6. Operational (commands, hooks, checklist)

**Done when**
- [ ] Sections are reordered without changing content (after PR #1 landed the
      content fixes).
- [ ] Table of contents (if any) reflects the new order.

Source: `AUDIT_RESPONSE.md` § 🟢 I6
```

### Labels
`docs` · `agent-ux`

---

# Decision Issues (questions from the audit)

These are separate because they block several of the above. Open them as
`needs-decision` and answer in comments before touching CLAUDE.md.

## Issue 13

### Title
```
decision: Q1 — where are `src/services/*` allowed to run?
```

### Body
```markdown
**Blocks:** #A2, #I3

Choose one:
- A) Server Components only (agents call services from `page.tsx`, pass data
     down as props).
- B) Server Components + Route Handlers (Route Handler acts as a thin proxy
     that calls the service on behalf of a client component).
- C) Anywhere including Client Components (with a client-safe wrapper that
     reads the JWT via `useSession`).

**Recommendation from audit:** B. A is simplest but breaks when a client needs
fresh data; C leaks the token to the browser.

Once decided, write the rule into the Services contract (A2).
```

### Labels
`needs-decision` · `architecture`

---

## Issue 14

### Title
```
decision: Q2 — adopt a typed `ApiError` class for services?
```

### Body
```markdown
**Blocks:** #A2, #I3

Without a typed error, every service handles failures differently. Proposed
shape:

```ts
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) { super(message) }
}
```

- A) Adopt now (add to `src/services/_error.ts`, refactor existing services).
- B) Adopt only for new services; leave old ones.
- C) Skip — rely on raw `Error` + `try/catch`.

**Recommendation from audit:** A. Without it, A2/I3 cannot be written as
binary rules.
```

### Labels
`needs-decision` · `architecture`

---

## Issue 15

### Title
```
decision: Q3 — cache invalidation strategy after mutations
```

### Body
```markdown
**Blocks:** #I5

- A) Always `router.refresh()` from the client.
- B) `revalidatePath` / `revalidateTag` inside Route Handlers, client does
     nothing after the fetch resolves.
- C) Hybrid documented per feature in the spec.

**Recommendation from audit:** A for now (simpler mental model, works with the
current "Next is a thin shell" stance). Revisit when caching becomes a real
perf concern.
```

### Labels
`needs-decision` · `architecture`

---

## Issue 16

### Title
```
decision: Q4 — does `src/specs/README.md` exist? If not, create or drop
```

### Body
```markdown
**Blocks:** part of #C1

CLAUDE.md says:
> Ver `src/specs/README.md` para el template y las reglas completas.

Check the filesystem:
- A) It exists → nothing to do.
- B) It does not exist → either create it (template + rules) or remove the
     reference from CLAUDE.md.

**Recommendation:** create a minimal `src/specs/README.md` with the spec
template and the approval flow. Low effort, high value (agents cite it
constantly).
```

### Labels
`needs-decision` · `docs`

---

## Issue 17

### Title
```
decision: Q5 — add `@/services/*` path alias (and maybe `@/constants`, `@/specs`)
```

### Body
```markdown
**Blocks:** #A2 (implicitly — can be done independently)

Current `tsconfig.json` aliases: `@/ui/*`, `@/components/*`, `@/lib/*`,
`@/typing/*`, `@/locales/*`. Missing:

- `@/services/*` — central data layer, used everywhere.
- `@/constants/*` — already a real directory (`src/constants/odontogram.ts`).
- `@/specs/*` — used in docs only; aliasing optional.

Also update:
- `tsconfig.json` paths
- `eslint.config.mjs` simple-import-sort groups
- CLAUDE.md Path Aliases list

**Recommendation:** do it now as a small chore PR (before PR #1 lands, so
docs in PR #1 can reference the final aliases).
```

### Labels
`needs-decision` · `chore`

---

## Issue 18

### Title
```
decision: Q6 — enforcement mechanism for "never log PHI"
```

### Body
```markdown
**Blocks:** #I4

Options:
- A) Doc rule only (relies on code review).
- B) Lint rule (custom ESLint rule that flags `console.log(patient)`, etc.).
- C) Central `logger` wrapper that strips known PHI fields before emitting.
- D) B + C combined.

**Recommendation:** C now, D later. A central logger is cheap and removes the
class of accidents; the lint rule can follow once the logger is the only
allowed path.
```

### Labels
`needs-decision` · `security`

---

## Order to create the issues

1. **Epic** (issue #0) — open first; gets linked from everything else.
2. Decision issues **Q1–Q6** (#13–#18) — open next so you can reference them
   by number from the blocking issues.
3. Critical + blocking issues **C1–C5, A1–A2, I3–I4, C4** (#1–#9).
4. PR #2 issues **I1, I5, I6** (#10–#12).

Cross-link each blocking issue back to the Epic with `Part of #<epic>`.
