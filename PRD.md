# DentFlow — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-15  
**Status:** Draft

---

## 1. Overview

DentFlow es una aplicación web SaaS para odontólogos independientes. Cada odontólogo tiene su propia cuenta aislada donde gestiona su práctica completa: pacientes, turnos, historial clínico, odontograma, pagos y facturación.

**Stack:** Next.js 15 App Router · PostgreSQL (Neon) · Prisma ORM · Auth.js v5 · Tailwind CSS · shadcn/ui · i18next (ES/EN)

---

## 2. Users

| Rol | Descripción |
|-----|-------------|
| `DENTIST` | Odontólogo. Accede solo a sus propios datos. |
| `ADMIN` | Superadmin de la plataforma (gestión interna, no visible al dentista). |

Un dentista = una cuenta. No hay clínicas multi-usuario en v1.

---

## 3. Modules

### 3.1 Authentication
- Login con Google OAuth (Auth.js v5)
- Whitelist de emails autorizados via `ALLOWED_EMAILS`
- Sesión JWT, protección de rutas via middleware
- Redirect a `/patients` post-login

---

### 3.2 Patients (Pacientes)

**Lista de pacientes**
- Búsqueda por nombre, apellido o DNI
- Ordenamiento por apellido
- Paginación
- Botón "New patient"

**Ficha del paciente** — tabs:
1. **Info** — datos personales
2. **Odontogram** — odontograma interactivo
3. **History** — historial de visitas
4. **Billing** — resumen financiero

**Datos personales:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| nombre | text | ✓ |
| apellido | text | ✓ |
| DNI | text | — |
| fecha de nacimiento | date | — |
| edad (calculada) | — | — |
| dirección | text | — |
| teléfono | text | — |
| email | text | — |
| obra social | text | — |
| nro. afiliado | text | — |
| alergias | textarea | — |
| medicamentos actuales | textarea | — |
| antecedentes médicos | textarea | — |
| notas | textarea | — |

---

### 3.3 Odontogram (Odontograma)

- **Dentición adulta** (FDI, 32 dientes: 11-18, 21-28, 31-38, 41-48)
- **Dentición temporaria** (FDI, 20 dientes: 51-55, 61-65, 71-75, 81-85)
- Toggle entre ambas denticiones
- **5 superficies por diente** clickeables: Vestibular, Lingual/Palatino, Mesial, Distal, Oclusal/Incisal
- **Estados por superficie:**
  - Sano (blanco)
  - Caries (rojo)
  - Obturado (azul)
  - Extracción indicada (rojo con X)
  - Extraído (gris con X)
  - Corona (amarillo)
  - Implante (verde)
  - Endodoncia (violeta, punto central)
  - Fractura (naranja)
- Estado se aplica superficie por superficie (no diente entero)
- Guardado como JSONB en DB
- Vista de resumen: lista de dientes afectados por estado
- Historial de versiones del odontograma (con fecha)

---

### 3.4 Clinical History (Historial de visitas)

Cada visita registra:
| Campo | Tipo | Requerido |
|-------|------|-----------|
| fecha | datetime | ✓ (default: hoy) |
| descripción / notas clínicas | textarea | ✓ |
| dientes tratados | array FDI | — |
| tratamiento realizado | text | — |
| próxima visita sugerida | date | — |
| importe cobrado | decimal | — |
| estado de pago | enum: pendiente / pagado / parcial | — |
| método de pago | enum: efectivo / transferencia / obra social / tarjeta | — |

- Lista de visitas en orden cronológico inverso (más reciente primero)
- Cada visita es expandible (accordion)
- Editable y eliminable

---

### 3.5 Appointments (Turnos)

**Vista calendario:**
- Vista mensual y semanal
- Vista del día con slots horarios
- Drag & drop para mover turnos
- Color por estado del turno

**Vista lista:**
- Turnos del día actual (default)
- Filtro por fecha / paciente / estado

**Datos del turno:**
| Campo | Tipo | Requerido |
|-------|------|-----------|
| paciente | FK Patient | ✓ |
| fecha y hora | datetime | ✓ |
| duración | number (minutos) | ✓ (default: 30) |
| motivo / tratamiento | text | — |
| estado | enum: scheduled / confirmed / completed / cancelled / no-show | ✓ |
| notas | textarea | — |

**Recordatorios:**
- Email automático al paciente (24hs antes)
- WhatsApp manual (botón que abre wa.me con mensaje pre-armado)
- Template de mensaje configurable por el odontólogo

---

### 3.6 Billing (Facturación y Pagos)

**Por visita** (ya cubierto en historial)

**Dashboard financiero:**
- Total cobrado en el mes
- Total pendiente de cobro
- Desglose por método de pago
- Desglose por obra social

**Presupuestos:**
- Crear presupuesto para un paciente
- Ítems: tratamiento + importe + diente
- Estado: borrador / enviado / aceptado / rechazado
- PDF exportable

**Obras sociales:**
- Registrar prestaciones por obra social
- Importe de la obra social vs. diferencia a cobrar al paciente

---

### 3.7 Settings (Configuración)

- Datos del perfil del odontólogo (nombre, teléfono, dirección del consultorio)
- Horario de atención (días y horas)
- Duración default de turnos
- Template de recordatorio (email y WhatsApp)
- Idioma (ES / EN)
- Configuración de obra sociales habituales

---

## 4. Design Principles

- **Mobile-first**: todas las vistas deben funcionar en pantallas desde 375px
- **Offline-friendly**: los formularios deben tener validación client-side antes de enviar
- **Fast**: Server Components por default, Client Components solo donde se necesite interactividad
- **Accessible**: ARIA labels, focus visible, contraste WCAG AA
- **i18n**: todos los textos via `t()`, archivos en `src/locales/en/` y `src/locales/es/`

---

## 5. Data Model (Prisma)

```prisma
model User {
  id            String        @id @default(cuid())
  name          String?
  email         String?       @unique
  emailVerified DateTime?
  image         String?
  role          Role          @default(DENTIST)
  profile       Profile?
  patients      Patient[]
  evolutions    Evolution[]
  appointments  Appointment[]
  budgets       Budget[]
  createdAt     DateTime      @default(now())
}

model Profile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  phone           String?
  address         String?
  workingHours    Json?    // { mon: {from: "09:00", to: "18:00"}, ... }
  appointmentDuration Int  @default(30)
  reminderTemplate    String? @db.Text
  whatsappTemplate    String? @db.Text
}

model Patient {
  id              String        @id @default(cuid())
  nombre          String
  apellido        String
  dni             String?
  fechaNacimiento DateTime?
  telefono        String?
  email           String?
  direccion       String?
  obraSocial      String?
  nroAfiliado     String?
  alergias        String?       @db.Text
  medicamentos    String?       @db.Text
  antecedentes    String?       @db.Text
  notas           String?       @db.Text
  odontograma     Json?         // adult FDI surfaces
  odontogramaPediatrico Json?   // pediatric FDI surfaces
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  evolutions      Evolution[]
  appointments    Appointment[]
  budgets         Budget[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Evolution {
  id              String      @id @default(cuid())
  fecha           DateTime    @default(now())
  descripcion     String      @db.Text
  tratamiento     String?
  dientes         Int[]
  importe         Decimal?    @db.Decimal(10,2)
  pagado          PaymentStatus @default(PENDING)
  metodoPago      PaymentMethod?
  proximaVisita   DateTime?
  patientId       String
  patient         Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Appointment {
  id          String            @id @default(cuid())
  fecha       DateTime
  duracion    Int               @default(30)
  motivo      String?
  notas       String?           @db.Text
  estado      AppointmentStatus @default(SCHEDULED)
  patientId   String
  patient     Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model Budget {
  id          String       @id @default(cuid())
  estado      BudgetStatus @default(DRAFT)
  items       Json         // [{tratamiento, diente, importe}]
  total       Decimal      @db.Decimal(10,2)
  patientId   String
  patient     Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum Role { DENTIST ADMIN }
enum PaymentStatus { PENDING PAID PARTIAL }
enum PaymentMethod { CASH TRANSFER INSURANCE CARD }
enum AppointmentStatus { SCHEDULED CONFIRMED COMPLETED CANCELLED NO_SHOW }
enum BudgetStatus { DRAFT SENT ACCEPTED REJECTED }
```

---

## 6. Routes

```
/                          → redirect to /patients
/login                     → Google OAuth login
/patients                  → patient list
/patients/new              → new patient form
/patients/[id]             → patient detail (tabs: info / odontogram / history / billing)
/patients/[id]/edit        → edit patient
/appointments              → calendar + list view
/appointments/new          → new appointment
/billing                   → financial dashboard
/settings                  → user settings
```

---

## 7. MVP Scope (v1)

| Feature | MVP | v2 |
|---------|-----|----|
| Auth (Google OAuth) | ✓ | |
| Patient CRUD | ✓ | |
| Odontogram (adulto) | ✓ | |
| Odontogram (pediátrico) | | ✓ |
| Clinical history | ✓ | |
| Appointments (calendar) | ✓ | |
| Appointment reminders (WhatsApp manual) | ✓ | |
| Appointment reminders (email auto) | | ✓ |
| Basic billing (per visit) | ✓ | |
| Financial dashboard | | ✓ |
| Budgets / presupuestos | | ✓ |
| Insurance management | | ✓ |
| Settings / profile | ✓ | |
| i18n ES/EN | ✓ | |
| Mobile-first | ✓ | |
| PDF export | | ✓ |

---

## 8. Engineering Protocol

- **Spec-Driven**: ninguna feature se codea sin spec aprobada en `src/specs/`
- **No `any`** — usar `unknown` + type guards
- **Zod** para validación de inputs
- **Server Components** por default
- **Feature branches** — nunca pushear a `main`
- Lint + typecheck antes de cada commit
