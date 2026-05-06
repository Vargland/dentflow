# Spec: Odontogram Annotation Schemes

## Status
[x] Draft | [x] In Review | [x] Approved | [ ] Implemented

---

## Objetivo

Permitir al odontólogo elegir el esquema de anotación clínica que usa en su práctica.
El esquema `international` es el actual (sin cambios). El esquema `argentina` introduce
colores distintos, marcas multi-diente (prótesis fija y removible) y una representación
visual diferente para endodoncia.

El esquema preferido se guarda en `user_settings` y se aplica automáticamente al abrir
cualquier odontograma. Al cambiar de esquema en el odontograma, se recarga el estado
desde la API (no se borra).

---

## Contrato de datos

### AnnotationScheme

```typescript
type AnnotationScheme = 'international' | 'argentina'
```

### MarkType (extendido)

```typescript
type MarkType =
  | 'cavity'
  | 'filled'
  | 'crown'
  | 'extraction'
  | 'rootcanal'
  | 'extracted'
  | 'fixed_prosthesis'      // nuevo — sólo esquema argentina
  | 'removable_prosthesis'  // nuevo — sólo esquema argentina
```

### ToothState (sin cambios de forma)

```typescript
type ToothState = {
  mark: MarkType | null
  surfaces: Record<Surface, MarkType | null>
}
```

### OdontogramState (sin cambios de forma)

```typescript
// Sigue siendo: Record<number, ToothState>
```

### Colores por esquema

#### international (sin cambios)

| Marca | Color |
|---|---|
| cavity | `#E24B4A` |
| filled | `#185FA5` |
| crown | `#BA7517` |
| extraction | `#5F5E5A` |
| rootcanal | `#639922` |
| extracted | `#B4B2A9` |

#### argentina

| Marca | Color |
|---|---|
| cavity | `#185FA5` |
| filled | `#E24B4A` |
| crown | `#E24B4A` |
| extraction | `#185FA5` |
| rootcanal | `#E24B4A` (letra E pequeña en SVG) |
| extracted | `#E24B4A` |
| fixed_prosthesis | `#E24B4A` — overlay externo, línea continua |
| removable_prosthesis | `#E24B4A` — overlay externo, línea discontinua |

---

## API Endpoints (Go)

### Cambio en endpoint existente — GET /api/v1/settings

Agrega `annotationScheme` al response:

```
GET /api/v1/settings
```

**Response (extendido):**
```json
{
  "timezone": "America/Argentina/Buenos_Aires",
  "doctorName": "...",
  "clinicAddress": "...",
  "clinicPhone": "...",
  "emailLanguage": "es",
  "calendarConnected": false,
  "annotationScheme": "international"
}
```

### Cambio en endpoint existente — PUT /api/v1/settings

Agrega `annotationScheme` al request body:

```
PUT /api/v1/settings
```

**Request body (extendido):**
```json
{
  "timezone": "America/Argentina/Buenos_Aires",
  "doctorName": "...",
  "annotationScheme": "argentina"
}
```

**Validación Go:** `annotationScheme` debe ser `"international"` o `"argentina"`. Si se omite o es inválido, defaultea a `"international"`.

### Endpoint de odontograma sin cambios

```
GET /patients/:patientId/odontogram  — sin cambios
PUT /patients/:patientId/odontogram  — acepta fixed_prosthesis y removable_prosthesis en mark
```

El backend acepta el JSONB como texto libre — los nuevos valores de `mark` se persisten sin cambio de schema.

---

## DB Migrations (Go)

### 000007_annotation_scheme.up.sql

```sql
ALTER TABLE user_settings
  ADD COLUMN annotation_scheme TEXT NOT NULL DEFAULT 'international';
```

### 000007_annotation_scheme.down.sql

```sql
ALTER TABLE user_settings DROP COLUMN annotation_scheme;
```

---

## UI

### Settings page — nueva sección

Agregar un selector de esquema en `/settings` debajo del timezone:

```
src/app/(dashboard)/settings/
└── _components/
    └── settings-form.tsx  ← agregar SchemeSelector
```

Usa el componente `SchemeSelector` existente en `src/components/odontogram/scheme-selector.tsx`.
Al guardar settings → `PUT /api/v1/settings` con `annotationScheme`.

### Odontogram — esquema inicial desde settings

- El componente `Odontogram` recibe `initialScheme: AnnotationScheme` como prop
- La página que renderiza el odontograma (`page.tsx` Server Component) lee el esquema del settings del usuario y lo pasa como prop
- Al montar, el hook arranca en el esquema del doctor — no siempre en `international`

### Cambio de esquema en el odontograma — recarga desde API

- Al cambiar el esquema en el selector del odontograma, en lugar de limpiar el estado local, se hace un `GET /patients/:id/odontogram` para recargar el estado persitido
- El esquema nuevo se aplica visualmente sobre los datos recargados
- Si hay cambios sin guardar (`dirty = true`), mostrar el diálogo de confirmación antes de cambiar

### Componentes involucrados

```
src/components/odontogram/
├── odontogram.tsx               ← recibe initialScheme prop, recarga al cambiar esquema
└── use-odontogram-state.ts      ← applySchemeChange hace GET en lugar de limpiar

src/app/(dashboard)/settings/
└── _components/
    └── settings-form.tsx        ← agrega SchemeSelector

src/services/
└── settings.service.ts          ← agregar annotationScheme al tipo y al PUT
```

### i18n — Claves nuevas

```json
// en/common.json — dentro de "settings"
"annotationScheme": "Annotation scheme",
"annotationSchemeDescription": "Default scheme used when opening the odontogram"

// es/common.json — dentro de "settings"
"annotationScheme": "Esquema de anotacion",
"annotationSchemeDescription": "Esquema por defecto al abrir el odontograma"
```

Las claves del selector (`schemeSelector.*`) ya existen en `odontogram.*` — se reusan.

---

## Casos de borde

- Doctor sin settings guardados → defaultea a `international` (mismo default que hoy)
- `annotationScheme` con valor desconocido en DB → Go defaultea a `international`
- Cambio de esquema con dirty = true → diálogo de confirmación antes de recargar
- Cambio de esquema con dirty = false → recarga directa sin diálogo
- Error en GET del odontograma al cambiar esquema → toast de error, no cambia el esquema

---

## Renderizado de prótesis (overlay externo)

Las marcas `fixed_prosthesis` y `removable_prosthesis` NO pintan el interior del diente.
Se renderizan como un SVG overlay encima del `ToothRow`, usando `position: relative/absolute`.

### Reglas de renderizado

- **Un diente solo** → corchete completo (línea superior + laterales, sin base)
- **Dientes consecutivos** → un corchete continuo que abarca todo el grupo
- **Dientes no consecutivos** → grupos separados, cada grupo con su propio corchete
- El corchete va por **encima** del arco superior y por **debajo** del arco inferior
- `fixed_prosthesis` → línea continua roja (`#E24B4A`, strokeWidth 2)
- `removable_prosthesis` → línea discontinua roja (`#E24B4A`, strokeDasharray "6 3", strokeWidth 2)

### Implementación SVG

El `ToothRow` se envuelve en `position: relative`. El overlay es un `<svg>` con
`position: absolute, inset: 0, pointerEvents: none` que dibuja el corchete encima.

Para calcular la posición X de cada diente: `(toothIndex * (TOOTH_SIZE + GAP)) + TOOTH_SIZE/2`
donde `TOOTH_SIZE = 40` y `GAP = 4` (gap-1 = 4px).

El corchete para un grupo de dientes [i..j]:
- Línea horizontal superior: de `x_i - MARGIN` a `x_j + MARGIN`, a `y = -6`
- Línea vertical izquierda: de `(x_i - MARGIN, -6)` a `(x_i - MARGIN, -2)`
- Línea vertical derecha: de `(x_j + MARGIN, -6)` a `(x_j + MARGIN, -2)`

El `ToothRow` añade `paddingTop: 8px` para dar espacio al corchete superior.

### Leyenda

Muestra el tipo de línea en lugar de un cuadrado de color:
- Prótesis fija: `────` línea continua roja
- Prótesis removible: `- - -` línea discontinua roja

---

## Out of scope (MVP)

- Esquema por paciente (siempre es preferencia del doctor)
- Más de 2 esquemas
- Esquemas personalizables
