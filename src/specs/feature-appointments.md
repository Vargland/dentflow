# Spec: Appointments + Google Calendar Integration

## Status
[ ] Draft | [ ] In Review | [ ] Approved | [ ] Implemented

---

## Objetivo
Permitir al odontólogo gestionar turnos en DentFlow sincronizados bidirecionalmente con su Google Calendar personal, con vistas de día, semana y mes.

---

## Flujo general

```
1. Dentista conecta su Google Calendar en Settings (OAuth)
2. DentFlow guarda refresh_token en tabla google_tokens
3. Dentista crea/edita/elimina turnos en DentFlow
4. Cada operación se refleja en su Google Calendar (Google Calendar API)
5. Vista de turnos en DentFlow muestra eventos de Google Calendar
```

---

## Contrato de datos

### Appointment (modelo Go)

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| id | string (UUID) | ✓ | PK |
| doctor_id | string | ✓ | FK users.id |
| patient_id | string \| null | — | null si paciente no está cargado |
| google_event_id | string \| null | — | ID del evento en Google Calendar |
| title | string | ✓ | Nombre del paciente o texto libre |
| start | timestamptz | ✓ | Inicio del turno |
| end | timestamptz | ✓ | Fin del turno |
| duration_minutes | int | ✓ | Default 30 |
| status | enum | ✓ | scheduled / confirmed / completed / cancelled / no_show |
| notes | string \| null | — | Notas internas |
| created_at | timestamptz | ✓ | |
| updated_at | timestamptz | ✓ | |

### GoogleToken (modelo Go)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | string (UUID) | PK |
| doctor_id | string | FK users.id, UNIQUE |
| access_token | text | Cifrado en DB |
| refresh_token | text | Cifrado en DB |
| expiry | timestamptz | Cuándo expira el access_token |
| calendar_id | string | ID del calendario (default: "primary") |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## API endpoints (Go)

### Auth de Google Calendar

```
GET  /auth/google/calendar           → inicia OAuth flow (redirect a Google)
GET  /auth/google/calendar/callback  → recibe code, guarda tokens
DELETE /api/v1/settings/calendar     → desconectar Google Calendar
GET  /api/v1/settings/calendar       → estado de conexión (connected: bool, email: string)
```

### Appointments CRUD

```
GET    /api/v1/appointments              → lista (query: start, end, patient_id)
POST   /api/v1/appointments              → crear turno + crear evento en Google Calendar
GET    /api/v1/appointments/:id          → detalle
PUT    /api/v1/appointments/:id          → editar + actualizar evento en Google Calendar
DELETE /api/v1/appointments/:id          → eliminar + eliminar evento en Google Calendar
```

### Query params de lista

| Param | Tipo | Notas |
|-------|------|-------|
| start | ISO date | Inicio del rango (requerido) |
| end | ISO date | Fin del rango (requerido) |
| patient_id | UUID | Opcional, filtra por paciente |

---

## Inputs / Validaciones

### CreateAppointmentInput

```typescript
interface CreateAppointmentInput {
  title: string           // min 1, max 200
  patientId?: string      // UUID, opcional
  start: string           // ISO datetime
  durationMinutes: number // 15 | 30 | 45 | 60 | 90 | 120
  notes?: string          // max 2000
  status: AppointmentStatus // default: 'scheduled'
}
```

### Reglas de negocio
- `end` se calcula como `start + durationMinutes`
- Si `patientId` está presente, debe existir y pertenecer al doctor
- No se pueden crear dos turnos que se superpongan (validar en backend)
- Si el doctor no tiene Google Calendar conectado → el turno se guarda solo en DB (sin sync)
- Si la sync con Google falla → el turno se guarda en DB y se devuelve warning (no error fatal)

---

## Google Calendar Integration

### OAuth Scopes requeridos
```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/userinfo.email
```

### Evento creado en Google Calendar
```json
{
  "summary": "<title>",
  "description": "<notes>\n\nPaciente: <nombre completo>\nTurno creado desde DentFlow",
  "start": { "dateTime": "<start ISO>", "timeZone": "<doctor.timezone>" },
  "end":   { "dateTime": "<end ISO>",   "timeZone": "<doctor.timezone>" },
  "colorId": "1"
}
```

### Token refresh
- El backend maneja el refresh automático del access_token usando el refresh_token
- Si el refresh falla (token revocado) → marcar conexión como inválida, notificar al frontend

---

## Frontend — Páginas y componentes

### `/appointments` — página principal

**Vistas:**
- `day` — columna de horas 00:00–23:59, slots de 30 min
- `week` — 7 columnas (lun–dom), slots de 30 min
- `month` — grilla de 5 semanas, eventos como chips

**Componentes:**
```
src/app/(dashboard)/appointments/
├── page.tsx                          ← Server Component, carga inicial
└── _components/
    ├── calendar-view.tsx             ← Client Component, maneja vistas
    ├── day-view.tsx
    ├── week-view.tsx
    ├── month-view.tsx
    ├── appointment-card.tsx          ← chip/bloque del turno
    ├── appointment-form.tsx          ← modal crear/editar
    ├── patient-search.tsx            ← autocomplete de pacientes
    └── calendar-connect-banner.tsx  ← banner si no hay Google Calendar conectado
```

### `/settings` — sección de Calendar

```
src/app/(dashboard)/settings/
├── page.tsx
└── _components/
    └── calendar-settings.tsx        ← botón conectar/desconectar Google Calendar
```

### Estados de la UI

| Estado | UI |
|--------|-----|
| Sin Google Calendar conectado | Banner amarillo con botón "Conectar Google Calendar" |
| Cargando turnos | Skeleton del calendario |
| Sin turnos en el período | Mensaje "No hay turnos" + botón "Nuevo turno" |
| Turno con paciente | Chip azul con nombre del paciente |
| Turno sin paciente | Chip gris con título libre |
| Sync fallida | Toast warning (el turno se guardó en DentFlow) |
| Token revocado | Banner rojo "Reconectá tu Google Calendar" |

---

## DB — Nuevas migraciones (Go)

### 000003_appointments.up.sql
```sql
CREATE TABLE appointments (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doctor_id         TEXT        NOT NULL,
  patient_id        TEXT        REFERENCES patients(id) ON DELETE SET NULL,
  google_event_id   TEXT,
  title             TEXT        NOT NULL,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER     NOT NULL DEFAULT 30,
  status            TEXT        NOT NULL DEFAULT 'scheduled',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX idx_appointments_start_time ON appointments (doctor_id, start_time);
```

### 000004_google_tokens.up.sql
```sql
CREATE TABLE google_tokens (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doctor_id     TEXT        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  expiry        TIMESTAMPTZ NOT NULL,
  calendar_id   TEXT        NOT NULL DEFAULT 'primary',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## i18n — Claves nuevas

```json
"appointments": {
  "title": "Appointments / Turnos",
  "newAppointment": "New appointment",
  "views": { "day": "Day", "week": "Week", "month": "Month" },
  "form": {
    "title": "Title",
    "titlePlaceholder": "Patient name or description",
    "patient": "Patient (optional)",
    "patientPlaceholder": "Search patient...",
    "date": "Date",
    "time": "Time",
    "duration": "Duration",
    "notes": "Notes",
    "status": "Status",
    "save": "Save",
    "saving": "Saving...",
    "cancel": "Cancel",
    "delete": "Delete appointment"
  },
  "status": {
    "scheduled": "Scheduled",
    "confirmed": "Confirmed",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "no_show": "No show"
  },
  "calendar": {
    "connectBanner": "Connect Google Calendar to sync your appointments",
    "connect": "Connect Google Calendar",
    "connected": "Google Calendar connected",
    "disconnect": "Disconnect",
    "syncWarning": "Appointment saved but could not sync to Google Calendar"
  },
  "empty": "No appointments",
  "emptyHint": "Click 'New appointment' to add one"
}
```

---

## Timezone

- Al registrarse, el frontend detecta `Intl.DateTimeFormat().resolvedOptions().timeZone` y lo envía al backend como parte del registro
- Se guarda en la tabla `user_settings` (ver DB más abajo)
- El dentista lo puede cambiar desde Settings
- Todos los datetimes se guardan en UTC en la DB
- El frontend convierte UTC → timezone del usuario para mostrar usando **date-fns-tz**
- Google Calendar recibe los eventos con el timezone del usuario (`timeZone` en el evento)

**Librerías:**
- `date-fns` — manipulación de fechas
- `date-fns-tz` — conversión UTC ↔ IANA timezone

```ts
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'

// Mostrar: UTC → timezone del doctor
const local = toZonedTime(utcDate, doctor.timezone)

// Enviar al backend: timezone del doctor → UTC
const utc = fromZonedTime(localInput, doctor.timezone)
```

### user_settings (nueva tabla, 000005)

```sql
CREATE TABLE user_settings (
  doctor_id   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone    TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Endpoint:**
```
GET  /api/v1/settings        → devuelve { timezone, calendarConnected }
PUT  /api/v1/settings        → { timezone: string }
```

**Frontend — flujo de registro:**
1. Al hacer submit del form de registro, el frontend lee `Intl.DateTimeFormat().resolvedOptions().timeZone`
2. Lo envía junto con email/name/password: `POST /auth/register` con campo `timezone`
3. El backend guarda el timezone en `user_settings` al crear el usuario

---

## Variables de entorno nuevas

```
# Frontend (.env)
GOOGLE_CALENDAR_CLIENT_ID=...       # puede ser el mismo que GOOGLE_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET=...   # puede ser el mismo que GOOGLE_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI=https://tu-api.railway.app/auth/google/calendar/callback

# Backend (.env)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://tu-api.railway.app/auth/google/calendar/callback
ENCRYPTION_KEY=...   # 32 bytes hex, para cifrar tokens en DB
```

---

## Casos de borde

- Turno sin paciente → se crea igual, `patient_id` es NULL
- Turno solapado → el backend devuelve 409 con mensaje claro
- Google Calendar desconectado → turno se guarda solo en DB
- Token revocado por el usuario en Google → el backend detecta el error 401 de Google y marca la conexión como inválida
- Cambio de timezone → todos los tiempos se guardan en UTC, se muestran en el timezone del browser
- Dentista borra el evento en Google Calendar directamente → DentFlow no lo detecta (out of scope para MVP)
- Paciente eliminado → `patient_id` pasa a NULL en el turno (ON DELETE SET NULL)

---

## Settings — nueva sección Timezone

En `/settings`, nueva sección con un select de IANA timezones (lista completa via `Intl.supportedValuesOf('timeZone')`). Al guardar → `PUT /api/v1/settings` → el backend actualiza `user_settings.timezone`.

---

## Out of scope (MVP)

- Sync inversa (eventos creados en Google Calendar → DentFlow)
- Drag & drop para mover turnos
- Recordatorios automáticos por email
- Recordatorio WhatsApp automático (el botón manual va en v1.1)
- Múltiples calendarios por doctor
- Vista de agenda imprimible
- Odontograma pediátrico
