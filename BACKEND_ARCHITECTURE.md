# DentFlow — Backend Architecture Document

**Version:** 1.0
**Date:** 2026-04-15
**Status:** Approved

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              Next.js (Frontend only)                │
│  - React Server Components (static shell/layout)   │
│  - Client Components (all data fetching)            │
│  - Auth.js v5 (Google OAuth → issues JWT)           │
│  - NO Server Actions for data                       │
│  - NO Prisma / DB access                            │
└──────────────────────┬──────────────────────────────┘
                       │ REST /api/v1/ + JWT Bearer
┌──────────────────────▼──────────────────────────────┐
│                 Go API Server                       │
│  - chi router                                       │
│  - JWT validation (Auth.js compatible secret)       │
│  - Vertical slice modules                           │
│  - sqlc + pgx (type-safe SQL)                       │
│  - ozzo-validation                                  │
└──────────────────────┬──────────────────────────────┘
                       │ pgx native driver
┌──────────────────────▼──────────────────────────────┐
│             PostgreSQL — Neon                        │
└─────────────────────────────────────────────────────┘
```

---

## 2. Auth Flow

```
1. User clicks "Sign in with Google"
2. Auth.js (Next.js) handles Google OAuth flow
3. Auth.js issues a JWT signed with AUTH_SECRET
4. JWT stored in httpOnly cookie (managed by Auth.js)
5. Next.js Client Components read session via useSession()
6. Every API call to Go includes: Authorization: Bearer <jwt>
7. Go middleware validates JWT signature using AUTH_SECRET
8. Go extracts doctor_id (= Auth.js user.id) from JWT claims
9. All DB queries are scoped by doctor_id
```

**JWT Claims structure (Auth.js v5 default):**
```json
{
  "sub": "cuid_of_user",
  "email": "doctor@example.com",
  "name": "Dr. García",
  "iat": 1234567890,
  "exp": 1234567890
}
```

Go reads `sub` as `doctorID` for ownership scoping.

---

## 3. Frontend Changes (Next.js)

With a Go backend, Next.js becomes a **pure frontend**:

| Was | Now |
|-----|-----|
| Server Actions (mutations) | Client Components → fetch `/api/v1/` |
| Prisma in Server Components | Go API response via `useQuery` / `fetch` |
| `src/actions/*.ts` | Deleted — replaced by `src/services/*.ts` |
| `src/lib/prisma.ts` | Deleted |
| `src/lib/db/` | Deleted |

**What stays in Next.js:**
- Auth.js (Google OAuth, JWT issuance)
- All UI components
- Page routing and layouts
- i18n

**New frontend layer — `src/services/`:**
```
src/services/
├── api-client.ts          # Base fetch wrapper (attaches JWT, handles errors)
├── patients.service.ts    # Patient CRUD calls
├── evolution.service.ts   # Clinical history calls
├── appointments.service.ts
├── odontogram.service.ts
└── billing.service.ts
```

Each service follows this pattern:
```ts
/** Fetches all patients for the authenticated doctor. */
const getPatients = async (token: string): Promise<Patient[]> => {
  const res = await apiClient.get('/patients', token)
  return PatientListSchema.parse(res)
}
```

---

## 4. Go Backend Structure

```
dentflow-api/                    # Separate repo / subdirectory
├── cmd/
│   └── api/
│       └── main.go              # Entry point: server setup, DI
│
├── internal/
│   ├── middleware/
│   │   ├── auth.go              # JWT validation middleware
│   │   ├── cors.go              # CORS for Next.js origin
│   │   └── logger.go            # Request logging
│   │
│   ├── modules/
│   │   ├── patients/
│   │   │   ├── handler.go       # HTTP handlers + route registration
│   │   │   ├── service.go       # Business logic
│   │   │   ├── repository.go    # DB access via sqlc
│   │   │   └── models.go        # Request/Response structs
│   │   │
│   │   ├── evolutions/
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── models.go
│   │   │
│   │   ├── odontogram/
│   │   │   ├── handler.go
│   │   │   ├── service.go       # JSONB validation (FDI keys + states)
│   │   │   ├── repository.go
│   │   │   └── models.go
│   │   │
│   │   ├── appointments/
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── models.go
│   │   │
│   │   └── billing/
│   │       ├── handler.go
│   │       ├── service.go
│   │       ├── repository.go
│   │       └── models.go
│   │
│   ├── db/
│   │   ├── migrations/          # golang-migrate SQL files
│   │   ├── queries/             # .sql files (input for sqlc)
│   │   └── sqlc/                # Generated sqlc code (do not edit)
│   │
│   └── shared/
│       ├── errors.go            # Typed API errors
│       ├── response.go          # JSON response helpers
│       └── pagination.go        # Cursor/offset pagination
│
├── sqlc.yaml                    # sqlc config
├── go.mod
├── go.sum
├── .env
└── Makefile
```

---

## 5. API Endpoints

### Base URL: `/api/v1`
### Auth: `Authorization: Bearer <jwt>` on all endpoints

#### Patients
```
GET    /patients              → list (search, pagination)
POST   /patients              → create
GET    /patients/:id          → get by id
PUT    /patients/:id          → update
DELETE /patients/:id          → delete
```

#### Odontogram
```
GET    /patients/:id/odontogram        → get current odontogram
PUT    /patients/:id/odontogram        → save odontogram (adult)
PUT    /patients/:id/odontogram/pediatric → save pediatric odontogram
GET    /patients/:id/odontogram/history   → version history
```

#### Evolutions (Clinical History)
```
GET    /patients/:id/evolutions        → list
POST   /patients/:id/evolutions        → create
PUT    /patients/:id/evolutions/:eid   → update
DELETE /patients/:id/evolutions/:eid   → delete
```

#### Appointments
```
GET    /appointments                   → list (date range filter)
POST   /appointments                   → create
GET    /appointments/:id               → get
PUT    /appointments/:id               → update
DELETE /appointments/:id               → delete
GET    /appointments/day/:date         → get by day (YYYY-MM-DD)
```

#### Billing
```
GET    /billing/stats                  → monthly summary
GET    /billing/pending                → unpaid evolutions
POST   /budgets                        → create budget
GET    /budgets/:id                    → get budget
PUT    /budgets/:id                    → update budget
```

#### Settings
```
GET    /settings/profile               → get profile
PUT    /settings/profile               → update profile
```

---

## 6. Module Pattern

Every module follows the same 4-layer structure:

### handler.go — HTTP layer
```go
// PatientHandler handles HTTP requests for the patients module.
type PatientHandler struct {
    service PatientService
}

// RegisterRoutes registers all patient routes on the given router.
func (h *PatientHandler) RegisterRoutes(r chi.Router) {
    r.Get("/", h.List)
    r.Post("/", h.Create)
    r.Get("/{id}", h.GetByID)
    r.Put("/{id}", h.Update)
    r.Delete("/{id}", h.Delete)
}
```

### service.go — Business logic
```go
// PatientService defines the business logic contract for patients.
type PatientService interface {
    List(ctx context.Context, doctorID string, params ListParams) ([]Patient, error)
    Create(ctx context.Context, doctorID string, req CreatePatientRequest) (Patient, error)
    GetByID(ctx context.Context, doctorID string, id string) (Patient, error)
    Update(ctx context.Context, doctorID string, id string, req UpdatePatientRequest) (Patient, error)
    Delete(ctx context.Context, doctorID string, id string) error
}
```

### repository.go — DB access
```go
// PatientRepository defines the database contract for patients.
type PatientRepository interface {
    FindAll(ctx context.Context, doctorID string, params ListParams) ([]db.Patient, error)
    FindByID(ctx context.Context, doctorID string, id string) (db.Patient, error)
    Create(ctx context.Context, params db.CreatePatientParams) (db.Patient, error)
    Update(ctx context.Context, params db.UpdatePatientParams) (db.Patient, error)
    Delete(ctx context.Context, doctorID string, id string) error
}
```

### models.go — Request/Response structs
```go
// CreatePatientRequest is the request body for creating a patient.
// All fields match the TypeScript CreatePatientInput interface in src/typing/services/patient.interface.ts
type CreatePatientRequest struct {
    Nombre         string  `json:"nombre" validate:"required"`
    Apellido       string  `json:"apellido" validate:"required"`
    DNI            *string `json:"dni,omitempty"`
    FechaNacimiento *string `json:"fechaNacimiento,omitempty"`
    Telefono       *string `json:"telefono,omitempty"`
    Email          *string `json:"email,omitempty"`
    Direccion      *string `json:"direccion,omitempty"`
}
```

---

## 7. Odontogram JSONB Validation

The odontogram is stored as `JSONB` in PostgreSQL. Go **must** validate:

```go
// ValidFDIAdult contains all valid adult FDI tooth numbers.
var ValidFDIAdult = map[int]bool{
    11: true, 12: true, 13: true, 14: true, 15: true, 16: true, 17: true, 18: true,
    21: true, 22: true, 23: true, 24: true, 25: true, 26: true, 27: true, 28: true,
    31: true, 32: true, 33: true, 34: true, 35: true, 36: true, 37: true, 38: true,
    41: true, 42: true, 43: true, 44: true, 45: true, 46: true, 47: true, 48: true,
}

// ValidToothStates contains all valid surface states.
var ValidToothStates = map[string]bool{
    "healthy": true, "cavity": true, "filled": true,
    "extraction": true, "extracted": true, "crown": true,
    "implant": true, "rootcanal": true, "fracture": true,
}

// ValidSurfaces contains all valid tooth surfaces.
var ValidSurfaces = map[string]bool{
    "M": true, "D": true, "O": true, "V": true, "L": true,
}
```

---

## 8. Error Response Format

All errors return consistent JSON:

```json
{
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Patient with id cuid123 not found",
    "status": 404
  }
}
```

Standard error codes:
```
UNAUTHORIZED          401
FORBIDDEN             403
NOT_FOUND             404
VALIDATION_ERROR      422
INTERNAL_ERROR        500
```

---

## 9. Pre-commit Hooks (Go)

```makefile
# Makefile
pre-commit:
    go fmt ./...
    go vet ./...
    staticcheck ./...
    go test ./... -race -count=1
```

Git hook runs `make pre-commit` before every commit.

Branching: `feature/be-<description>` (e.g. `feature/be-patients-crud`)

---

## 10. Environment Variables

```env
# Go API
PORT=8080
DATABASE_URL=postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require
AUTH_SECRET=same-secret-as-nextjs   # shared for JWT validation
ALLOWED_ORIGINS=http://localhost:3000,https://dentflow.vercel.app
```

---

## 11. Deployment

```
Vercel        → Next.js frontend
Railway / Fly.io → Go API (Docker container)
Neon          → PostgreSQL (shared between both)
```

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api ./cmd/api

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/api .
EXPOSE 8080
CMD ["./api"]
```

---

## 12. Critical Rules (Go)

| Rule | Detail |
|------|--------|
| No `panic` | Handle all errors explicitly, return them up the stack |
| No `interface{}` / `any` | Use concrete structs always |
| Context everywhere | All DB calls receive `context.Context` as first param |
| Ownership check | Every mutation verifies `doctor_id` matches JWT claim |
| HTTP status codes | Use correct codes — never return 200 on error |
| All code in English | Variables, comments, docs — English only |
| Comments | GoDoc format on every exported symbol |
| No manual DB changes | All schema changes via golang-migrate files |
| Spec-first | No endpoint without approved spec in `src/specs/` |
