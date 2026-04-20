# Spec-Driven Development — DentFlow

## Core rule

**No feature is coded without an approved spec.**

The order is always:

```
1. src/specs/feature-<name>.md  → define the contract
2. Review with the user          → spec approved
3. Code                          → UI + services + Go API
```

---

## Spec file structure

```
src/specs/
├── README.md                     ← this file
├── feature-appointments.md
└── ...
```

### Template

```md
# Spec: <Feature Name>

## Status
[ ] Draft | [ ] In Review | [ ] Approved | [ ] Implemented

## Goal
One line: what problem does this feature solve?

## Data contract

### Inputs
- What the feature receives (form data, URL params, session context)
- Exact TypeScript types for each field

### Outputs
- What it returns (object shape, possible errors)

### Validations (Zod)
- Business rules validated on the frontend before hitting the API
- Mirror the Go API validation — do not duplicate business logic

## API Endpoints (Go)
- Method + path for each endpoint
- TypeScript signature of the service function
- Expected error codes (ApiError.code values)

## DB Migrations (Go)
- New tables or columns
- SQL migration file names (e.g. 000003_appointments.up.sql)
- Indexes and foreign keys

## UI
- Components involved (Server vs Client) with file paths
- UI states: loading · error · empty · success
- i18n: new keys required in both en/common.json and es/common.json

## Edge cases
- List of edge cases to handle

## Out of scope (MVP)
- What is explicitly NOT done in this iteration
```

---

## Approval criteria

A spec is **approved** when:

1. Data contract has complete types (no `any`)
2. Zod validations are defined field by field
3. Go API endpoints are named and typed
4. DB migrations are listed (if any)
5. Edge cases are identified
6. MVP scope is bounded
7. The developer (or Claude) confirmed: *"spec approved, ready to code"*

---

## What requires a spec

- New database entities (new migration)
- New Go API endpoints
- Changes to existing API contracts (request/response shape)
- Complex multi-domain flows (e.g. OAuth + DB + external API)

## What does NOT require a spec

- UI-only changes (layout, styling, copy)
- New or refactored components that consume existing endpoints
- Bug fixes (unless the fix changes the API contract)
- Adding i18n keys

## What is FORBIDDEN without a spec

- ❌ Creating or modifying Go migrations
- ❌ Adding new Go API endpoints
- ❌ Changing the shape of an existing API response or request
- ❌ Creating new pages that require new endpoints
