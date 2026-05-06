# Spec: Evolution — Custom Date & Paid Toggle

## Status
[ ] Draft | [ ] In Review | [ ] Approved | [ ] Implemented

## Goal
Allow the dentist to set a custom appointment date when creating an evolution,
and to toggle the paid status both on creation and after the fact.

---

## Data contract

### Changes to CREATE (POST /patients/:id/evolutions)

Add two optional fields to the request body:

```typescript
interface CreateEvolutionInput {
  descripcion: string
  dientes?: number[]
  importe?: number
  pagado?: boolean   // already exists — must now be wired in the form
  fecha?: string     // ISO 8601 date string (e.g. "2026-05-06"); defaults to NOW() server-side
}
```

### Changes to UPDATE (PUT /patients/:id/evolutions/:eid)

Add `fecha` and `pagado` to the updatable fields:

```typescript
type UpdateEvolutionInput = Partial<{
  descripcion: string
  dientes: number[]
  importe: number
  pagado: boolean    // already in DB/handler — confirm it is wired end-to-end
  fecha: string      // ISO 8601 date string
}>
```

### Response (Evolution) — no changes
The `Evolution` interface already contains both `fecha` and `pagado`. No shape change.

---

## API Endpoints (Go)

### POST /api/v1/patients/:id/evolutions
- **Change:** Accept `fecha` (optional string → parsed as time.Time, defaults to `time.Now()`)
  and `pagado` (optional bool, defaults to `false`).
- **Validation:** If `fecha` is provided, it must be a valid date (not in the future is NOT
  enforced — dentist may backfill old records).

### PUT /api/v1/patients/:id/evolutions/:eid
- **Change:** Accept `fecha` (optional) and `pagado` (optional).
- Both fields added to `COALESCE` update query.

### DB Migrations
**None required.** Both `fecha` and `pagado` already exist in the `evolutions` table.
Only the SQL queries and Go handler need updating.

#### Query changes (internal/db/queries/evolutions.sql)

**CreateEvolution** — add `fecha` param with fallback to `NOW()`:
```sql
INSERT INTO evolutions (patient_id, doctor_id, descripcion, dientes, importe, pagado, fecha)
VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
RETURNING *;
```

**UpdateEvolution** — add `fecha` to COALESCE set:
```sql
UPDATE evolutions SET
    descripcion = COALESCE(sqlc.narg('descripcion'), descripcion),
    dientes     = COALESCE(sqlc.narg('dientes'),     dientes),
    importe     = COALESCE(sqlc.narg('importe'),     importe),
    pagado      = COALESCE(sqlc.narg('pagado'),      pagado),
    fecha       = COALESCE(sqlc.narg('fecha'),       fecha)
WHERE id = sqlc.arg('id') AND doctor_id = sqlc.arg('doctor_id')
RETURNING *;
```

---

## UI

### Components

| File | Type | Change |
|------|------|--------|
| `src/app/(dashboard)/patients/[id]/_components/evolution-list.tsx` | Client | Add date picker + paid checkbox to new-record form; add paid toggle button to each card |
| `src/typing/services/evolution.interface.ts` | Types | Add `fecha?: string` to `CreateEvolutionInput`; add `fecha?: string` and `pagado?: boolean` to `UpdateEvolutionInput` |
| `src/services/evolution.service.ts` | Service | Pass `fecha` and `pagado` in create/update calls |

### New-record form additions
1. **Date field** — `<Input type="date">` pre-filled with today's date. Label: "Fecha del turno".
2. **Paid checkbox** — `<Checkbox>` defaulting to unchecked. Label: "Pagado".

### Existing card additions
1. **Paid toggle** — a small button/badge on each card that immediately calls
   `PUT /evolutions/:eid` with `{ pagado: !ev.pagado }`. Shows green "Pagado" or
   orange "Pendiente". No confirmation dialog needed.

### UI states
- **Saving paid toggle:** button shows a spinner; reverts on error with a toast.
- **Date input:** uses native `<input type="date">`; no external date-picker library.

---

## i18n keys required

### en/common.json
```json
"records.appointmentDate": "Appointment date",
"records.markPaid": "Mark as paid",
"records.markPending": "Mark as pending"
```

### es/common.json
```json
"records.appointmentDate": "Fecha del turno",
"records.markPaid": "Marcar como pagado",
"records.markPending": "Marcar como pendiente"
```

---

## Edge cases
- `fecha` sent as empty string → treat as absent (use `NOW()`).
- `importe` is null but `pagado` is toggled to true → allowed (record can be marked paid
  without an amount).
- Paid toggle while another toggle is in flight for the same card → disable button while saving.
- Date in the past → allowed (backfilling old records is the main use case).

---

## Out of scope (MVP)
- Bulk paid/unpaid marking.
- Payment history or partial payments.
- Filtering/sorting evolutions by paid status or date.
