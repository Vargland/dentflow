# Spec-Driven Development — DentFlow

## Regla fundamental

**Ninguna feature se codea sin spec aprobada.**

El orden es siempre:

```
1. spec/         → define el contrato
2. validación    → el contrato es revisado y aprobado
3. código        → UI + DB + Actions
```

---

## Estructura de una spec

Cada feature tiene su propio archivo en `src/specs/`:

```
src/specs/
├── README.md                  ← este archivo
├── feature-google-calendar.md
├── feature-odontogram-v2.md
└── ...
```

### Template

```md
# Spec: <Nombre de la Feature>

## Status
[ ] Draft | [ ] In Review | [ ] Approved | [ ] Implemented

## Objetivo
Una línea: qué problema resuelve esta feature.

## Contrato de datos

### Inputs
- Qué recibe (FormData, params, contexto de sesión)
- Tipos exactos de cada campo

### Outputs
- Qué devuelve (shape del objeto, errores posibles)

### Validaciones (Zod)
- Reglas de negocio que se validan antes de tocar la DB

## Server Actions / API
- Nombre de cada action o endpoint
- Firma TypeScript
- Casos de error esperados

## DB (Prisma)
- Modelos afectados
- Campos nuevos o modificados
- Relaciones

## UI
- Componentes involucrados (Server vs Client)
- Estados de la UI (loading, error, empty, success)
- i18n: claves nuevas necesarias en en/es

## Casos de borde
- Lista de edge cases a tener en cuenta

## Out of scope (MVP)
- Lo que explícitamente NO se hace en esta iteración
```

---

## Reglas de validación

Una spec está **aprobada** cuando:

1. El contrato de datos tiene tipos completos (sin `any`)
2. Las validaciones Zod están definidas campo por campo
3. Los casos de borde están identificados
4. El scope MVP está acotado
5. El desarrollador (o Claude) confirmó: *"spec aprobada, podemos codear"*

---

## Lo que NO se hace sin spec

- Crear o modificar tablas en Prisma
- Crear Server Actions nuevas
- Crear páginas o componentes nuevos
- Agregar rutas al router
