/**
 * DentFlow — Seed script
 * ----------------------
 * Creates 10 patients with varied clinical profiles, appointments spread
 * across today ± 30 days, and realistic evolution records.
 *
 * Usage:
 *   node scripts/seed.mjs <JWT_TOKEN> [API_URL]
 *
 * Arguments:
 *   JWT_TOKEN  — Bearer token from your browser session (see README below)
 *   API_URL    — Optional. Defaults to http://localhost:8080/api/v1
 *
 * How to get your JWT:
 *   1. Open the app in Chrome/Firefox
 *   2. Open DevTools → Application → Cookies → find "next-auth.session-token"
 *      OR open DevTools → Network → any /api request → Headers → Authorization: Bearer <token>
 *   3. Copy the token (everything after "Bearer ")
 *   4. Run: node scripts/seed.mjs eyJ...
 */

// ── Config ────────────────────────────────────────────────────────────────────

const TOKEN = process.argv[2]
const API_BASE = process.argv[3] ?? 'http://localhost:8080/api/v1'

if (!TOKEN) {
  console.error('❌  Usage: node scripts/seed.mjs <JWT_TOKEN> [API_URL]')
  process.exit(1)
}

// ── API helpers ───────────────────────────────────────────────────────────────

const api = async (method, path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }

  if (res.status === 204) return null
  return res.json()
}

const post = (path, body) => api('POST', path, body)

// ── Patients data ─────────────────────────────────────────────────────────────

const PATIENTS = [
  {
    nombre: 'María',
    apellido: 'González',
    dni: '28456123',
    fechaNacimiento: '1990-03-15',
    sexo: 'F',
    telefono: '1134567890',
    email: 'maria.gonzalez@gmail.com',
    direccion: 'Av. Corrientes 1234, CABA',
    alergias: 'Penicilina',
    antecedentes: 'Hipertensión controlada con enalapril',
    obraSocial: 'OSDE',
    nroAfiliado: '123456-01',
    medicamentos: 'Enalapril 10mg',
    notas: 'Paciente muy puntual. Prefiere turnos a la mañana.',
  },
  {
    nombre: 'Juan',
    apellido: 'Rodríguez',
    dni: '31789456',
    fechaNacimiento: '1985-07-22',
    sexo: 'M',
    telefono: '1156789012',
    email: 'juan.rodriguez@hotmail.com',
    direccion: 'Belgrano 567, Rosario',
    alergias: 'Ibuprofeno, látex',
    antecedentes: 'Diabetes tipo 2. Bruxismo severo.',
    obraSocial: 'Swiss Medical',
    nroAfiliado: '789012-02',
    medicamentos: 'Metformina 500mg, omeprazol',
    notas: 'Requiere férula de descarga. Control cada 3 meses.',
  },
  {
    nombre: 'Ana',
    apellido: 'López',
    dni: '35123789',
    fechaNacimiento: '1998-11-05',
    sexo: 'F',
    telefono: '1178901234',
    email: 'ana.lopez@yahoo.com',
    direccion: 'San Martín 890, Córdoba',
    alergias: null,
    antecedentes: null,
    obraSocial: 'Galeno',
    nroAfiliado: '345678-03',
    medicamentos: null,
    notas: 'Primera vez en odontología en muchos años. Ansiosa.',
  },
  {
    nombre: 'Carlos',
    apellido: 'Fernández',
    dni: '22345678',
    fechaNacimiento: '1972-04-18',
    sexo: 'M',
    telefono: '1190123456',
    email: 'carlos.fernandez@empresa.com',
    direccion: 'Libertador 2345, Buenos Aires',
    alergias: 'Aspirina',
    antecedentes: 'Cardiopatía isquémica. Anticoagulado con warfarina.',
    obraSocial: 'Medifé',
    nroAfiliado: '901234-04',
    medicamentos: 'Warfarina, atenolol, atorvastatina',
    notas: 'IMPORTANTE: consultar con cardiólogo antes de cirugías. INR último control: 2.3',
  },
  {
    nombre: 'Sofía',
    apellido: 'Martínez',
    dni: '40678912',
    fechaNacimiento: '2005-09-12',
    sexo: 'F',
    telefono: '1145678901',
    email: 'sofiamartinez@gmail.com',
    direccion: 'Rivadavia 456, La Plata',
    alergias: null,
    antecedentes: 'En tratamiento de ortodoncia con Dr. Pérez.',
    obraSocial: 'IOMA',
    nroAfiliado: '567890-05',
    medicamentos: null,
    notas: 'Dentición mixta. Brackets fijos desde enero 2024.',
  },
  {
    nombre: 'Roberto',
    apellido: 'Suárez',
    dni: '18234567',
    fechaNacimiento: '1965-01-30',
    sexo: 'M',
    telefono: '1167890123',
    email: 'roberto.suarez@outlook.com',
    direccion: 'Av. Santa Fe 3456, CABA',
    alergias: 'Anestésicos con vasoconstrictor',
    antecedentes: 'Hipertiroidismo. Implantes en piezas 36 y 46.',
    obraSocial: null,
    nroAfiliado: null,
    medicamentos: 'Metimazol 10mg',
    notas: 'Usar anestesia sin epinefrina. Pago en efectivo.',
  },
  {
    nombre: 'Valentina',
    apellido: 'Torres',
    dni: '37456123',
    fechaNacimiento: '2002-06-25',
    sexo: 'F',
    telefono: '1123456789',
    email: 'valen.torres@gmail.com',
    direccion: 'Mendoza 789, Tucumán',
    alergias: null,
    antecedentes: null,
    obraSocial: 'OSDE',
    nroAfiliado: '234567-07',
    medicamentos: null,
    notas: null,
  },
  {
    nombre: 'Diego',
    apellido: 'Morales',
    dni: '25678901',
    fechaNacimiento: '1980-12-08',
    sexo: 'M',
    telefono: '1189012345',
    email: 'dmorales@gmail.com',
    direccion: 'Av. Callao 1234, CABA',
    alergias: 'Eritromicina',
    antecedentes: 'HIV positivo en tratamiento con ARV. Xerostomía crónica.',
    obraSocial: 'PAMI',
    nroAfiliado: '890123-08',
    medicamentos: 'Tenofovir, emtricitabina, efavirenz',
    notas: 'Máxima confidencialidad. Control periodontal frecuente necesario.',
  },
  {
    nombre: 'Laura',
    apellido: 'Jiménez',
    dni: '33901234',
    fechaNacimiento: '1994-08-19',
    sexo: 'F',
    telefono: '1134567891',
    email: 'laura.jimenez@gmail.com',
    direccion: 'Av. del Trabajo 567, Mendoza',
    alergias: null,
    antecedentes: 'Embarazo 2° trimestre (22 semanas).',
    obraSocial: 'Swiss Medical',
    nroAfiliado: '012345-09',
    medicamentos: 'Ácido fólico, hierro',
    notas: 'Evitar Rx. Solo procedimientos de urgencia o profilaxis. Parto estimado: julio 2026.',
  },
  {
    nombre: 'Héctor',
    apellido: 'Romero',
    dni: '14123456',
    fechaNacimiento: '1950-05-03',
    sexo: 'M',
    telefono: '1156781234',
    email: null,
    direccion: 'Av. Pueyrredón 890, CABA',
    alergias: 'Penicilina, sulfas',
    antecedentes: 'EPOC severo. Osteoporosis. Prótesis total superior e inferior.',
    obraSocial: 'PAMI',
    nroAfiliado: '678901-10',
    medicamentos: 'Salbutamol inhalador, alendronate, calcio+vit D',
    notas: 'Atender en posición semisentada. Prótesis con rebases frecuentes.',
  },
]

// ── Clinical evolutions ───────────────────────────────────────────────────────

const EVOLUTIONS = {
  González: [
    { descripcion: 'Limpieza y pulido dental. Placa leve supragingival. Se indica hilo dental diario y técnica de Bass.', dientes: [], importe: 8000, pagado: true, diasAtras: 45 },
    { descripcion: 'Obturación clase II en pieza 16 con composite. Caries interproximal mesial. Anestesia sin incidentes.', dientes: [16], importe: 15000, pagado: true, diasAtras: 30 },
    { descripcion: 'Control post-operatorio pieza 16. Evolución favorable. Sin sensibilidad.', dientes: [16], importe: 0, pagado: true, diasAtras: 15 },
    { descripcion: 'Diagnóstico pieza 26: caries oclusal profunda próxima a pulpa. Se solicita Rx periapical. Se planifica endodoncia preventiva.', dientes: [26], importe: 3000, pagado: false, diasAtras: 5 },
  ],
  Rodríguez: [
    { descripcion: 'Primera consulta. Periodontitis crónica generalizada moderada. Raspado y alisado radicular cuadrante superior derecho.', dientes: [14, 15, 16, 17], importe: 22000, pagado: true, diasAtras: 90 },
    { descripcion: 'Raspado y alisado radicular cuadrante superior izquierdo.', dientes: [24, 25, 26, 27], importe: 22000, pagado: true, diasAtras: 75 },
    { descripcion: 'Raspado y alisado radicular cuadrante inferior derecho.', dientes: [44, 45, 46, 47], importe: 22000, pagado: false, diasAtras: 60 },
    { descripcion: 'Entrega de férula de descarga nocturna. Indicaciones de uso. Control en 3 semanas.', dientes: [], importe: 35000, pagado: true, diasAtras: 20 },
    { descripcion: 'Control periodontal. Mejoría significativa. Profundidad de sondaje reducida. Se continúa mantenimiento.', dientes: [], importe: 5000, pagado: true, diasAtras: 7 },
  ],
  López: [
    { descripcion: 'Primera consulta. Múltiples caries. Plan de tratamiento elaborado. Se comienza por urgencias: pieza 46 caries profunda con pulpitis reversible.', dientes: [46], importe: 4000, pagado: true, diasAtras: 60 },
    { descripcion: 'Endodoncia pieza 46. Tres conductos. Medicación con hidróxido de calcio. Primera sesión.', dientes: [46], importe: 28000, pagado: false, diasAtras: 45 },
    { descripcion: 'Endodoncia pieza 46 segunda sesión. Obturación con gutapercha. Rx confirma conductos sellados.', dientes: [46], importe: 0, pagado: false, diasAtras: 30 },
    { descripcion: 'Corona metal-porcelana pieza 46. Impresión y provisorio colocado.', dientes: [46], importe: 45000, pagado: false, diasAtras: 10 },
  ],
  Fernández: [
    { descripcion: 'Consulta de urgencia. Fractura pieza 21 por caída. Tratamiento conservador: restauración con composite y carilla directa.', dientes: [21], importe: 25000, pagado: true, diasAtras: 120 },
    { descripcion: 'Extracción pieza 48 (3° molar inferior derecho). Retención parcial. Cirugía con colgajo. Post-op sin complicaciones. Sutura reabsorbible.', dientes: [48], importe: 30000, pagado: true, diasAtras: 90 },
    { descripcion: 'Limpieza semestral. Sangrado gingival al sondaje. Se refuerza higiene. Control de anticoagulación: INR dentro de rango.', dientes: [], importe: 9000, pagado: true, diasAtras: 30 },
  ],
  Martínez: [
    { descripcion: 'Selladores de fosas y fisuras en piezas permanentes. Profilaxis previa. Buen comportamiento de la paciente.', dientes: [16, 26, 36, 46], importe: 12000, pagado: true, diasAtras: 180 },
    { descripcion: 'Control de ortodoncia. Ajuste de arco y cambio de ligaduras. Higiene regular, se indica irrigador oral.', dientes: [], importe: 15000, pagado: true, diasAtras: 60 },
    { descripcion: 'Control de ortodoncia. Extracción de piezas 14 y 24 para crear espacio. Derivación al cirujano. Post-extracción sin complicaciones.', dientes: [14, 24], importe: 15000, pagado: false, diasAtras: 30 },
  ],
  Suárez: [
    { descripcion: 'Control de implante pieza 36. Osteointegración completa. Colocación de corona sobre implante definitiva (metal-cerámica).', dientes: [36], importe: 80000, pagado: true, diasAtras: 200 },
    { descripcion: 'Control de implante pieza 46. Igual procedimiento. Corona definitiva cementada.', dientes: [46], importe: 80000, pagado: true, diasAtras: 150 },
    { descripcion: 'Limpieza con ultrasonido periimplantaria. Sin signos de periimplantitis. Buen mantenimiento.', dientes: [36, 46], importe: 12000, pagado: true, diasAtras: 30 },
    { descripcion: 'Diagnóstico: pieza 11 con recesión gingival clase II Miller. Se planifica injerto de tejido conectivo.', dientes: [11], importe: 5000, pagado: false, diasAtras: 7 },
  ],
  Torres: [
    { descripcion: 'Primera consulta. Boca sana. Limpieza y fluorización. Sin caries. Excelente higiene oral.', dientes: [], importe: 7000, pagado: true, diasAtras: 30 },
  ],
  Morales: [
    { descripcion: 'Control periodontal trimestral. Gingivitis por xerostomía. Se indica enjuague de clorhexidina al 0.12% y saliva artificial. Raspado supragingival.', dientes: [], importe: 15000, pagado: true, diasAtras: 90 },
    { descripcion: 'Obturación clase V piezas 13 y 23 con composite (erosión cervical por xerostomía). Sin incidentes.', dientes: [13, 23], importe: 18000, pagado: true, diasAtras: 60 },
    { descripcion: 'Control periodontal. Mejoría con enjuagues. Se continúa mantenimiento. Derivación a médico clínico por aumento de xerostomía.', dientes: [], importe: 8000, pagado: false, diasAtras: 15 },
  ],
  Jiménez: [
    { descripcion: 'Consulta de urgencia: dolor pieza 37. Pulpitis irreversible. Se decide postergar tratamiento endodóntico por embarazo. Medicación paliativa con paracetamol. Control semanal.', dientes: [37], importe: 5000, pagado: true, diasAtras: 20 },
    { descripcion: 'Control embarazo semana 24. Gingivitis del embarazo leve. Limpieza suave con curetas manuales. Sin anestesia. Indicaciones de higiene reforzada.', dientes: [], importe: 8000, pagado: true, diasAtras: 7 },
  ],
  Romero: [
    { descripcion: 'Rebase prótesis superior con material de rebase blando. Adaptación aceptable. Instrucciones de higiene protética.', dientes: [], importe: 20000, pagado: true, diasAtras: 180 },
    { descripcion: 'Rebase prótesis inferior. Mayor dificultad por pérdida ósea severa. Se evalúa implantes en zona anterior mandibular para overdenture.', dientes: [], importe: 20000, pagado: true, diasAtras: 90 },
    { descripcion: 'Úlcera traumática por prótesis inferior. Ajuste de flange distal. Indicación de enjuague con manzanilla y gel de clorhexidina.', dientes: [], importe: 5000, pagado: true, diasAtras: 20 },
    { descripcion: 'Control de úlcera: curación completa. Prótesis bien adaptada. Próximo control en 3 meses.', dientes: [], importe: 3000, pagado: false, diasAtras: 5 },
  ],
}

// ── Appointment templates per patient ─────────────────────────────────────────

const APPOINTMENT_TEMPLATES = [
  { title: 'Limpieza dental', duration: 60 },
  { title: 'Endodoncia', duration: 90 },
  { title: 'Obturación composite', duration: 45 },
  { title: 'Extracción dentaria', duration: 60 },
  { title: 'Control y revisión', duration: 30 },
  { title: 'Radiografía panorámica', duration: 30 },
  { title: 'Blanqueamiento dental', duration: 90 },
  { title: 'Consulta inicial', duration: 45 },
  { title: 'Colocación de corona', duration: 60 },
  { title: 'Control de ortodoncia', duration: 30 },
  { title: 'Raspado y alisado radicular', duration: 60 },
  { title: 'Cirugía periodontal', duration: 120 },
  { title: 'Selladores de fosas', duration: 45 },
  { title: 'Urgencia dental', duration: 30 },
  { title: 'Control post-operatorio', duration: 20 },
]

// Clinic hours: slots available (hour, minute in local time)
const TIME_SLOTS = [
  [8, 30], [9, 0], [9, 30], [10, 0], [10, 30], [11, 0], [11, 30],
  [14, 0], [14, 30], [15, 0], [15, 30], [16, 0], [16, 30], [17, 0],
]

// ── Utilities ─────────────────────────────────────────────────────────────────

const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)]

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

/** Build an ISO UTC string for a given local date at a given hour/minute (Argentina TZ UTC-3). */
const toUTC = (date, hour, minute) => {
  const d = new Date(date)
  // Argentina is UTC-3 (no DST)
  const utcHour = hour + 3
  d.setUTCHours(utcHour, minute, 0, 0)
  return d.toISOString()
}

/** Add minutes to an ISO UTC string. */
const addMinutes = (iso, mins) => new Date(new Date(iso).getTime() + mins * 60000).toISOString()

/** Add days to today. */
const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

/** Subtract days from today. */
const subDays = (days) => addDays(-days)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Status logic ──────────────────────────────────────────────────────────────

/**
 * Determine appointment status based on date offset.
 * Past appointments are mostly completed, some cancelled.
 * Today's are scheduled or in-progress.
 * Future are all scheduled.
 */
const appointmentStatus = (dayOffset) => {
  if (dayOffset < -1) {
    const r = Math.random()
    if (r < 0.75) return 'completed'
    if (r < 0.90) return 'cancelled'
    return 'completed'
  }
  return 'scheduled'
}

// ── Main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  console.log(`\n🦷  DentFlow Seed Script`)
  console.log(`📡  API: ${API_BASE}\n`)

  // 1. Create patients
  console.log('👥  Creating patients...')
  const createdPatients = []

  for (const p of PATIENTS) {
    try {
      const created = await post('/patients', p)
      createdPatients.push({ ...created, apellido: p.apellido })
      console.log(`   ✅  ${p.apellido}, ${p.nombre}`)
      await sleep(100)
    } catch (err) {
      console.error(`   ❌  ${p.apellido}: ${err.message}`)
    }
  }

  console.log(`\n📋  Created ${createdPatients.length} patients\n`)

  // 2. Create evolutions for each patient
  console.log('📝  Adding clinical evolutions...')

  for (const patient of createdPatients) {
    const evs = EVOLUTIONS[patient.apellido] ?? []

    for (const ev of evs) {
      const fecha = subDays(ev.diasAtras)

      try {
        await post(`/patients/${patient.id}/evolutions`, {
          descripcion: ev.descripcion,
          dientes: ev.dientes,
          importe: ev.importe,
          pagado: ev.pagado,
          fecha: fecha.toISOString().split('T')[0],
        })
        await sleep(80)
      } catch (err) {
        console.error(`   ❌  Evolution for ${patient.apellido}: ${err.message}`)
      }
    }

    console.log(`   ✅  ${patient.apellido} — ${evs.length} evolutions`)
  }

  // 3. Generate appointments across 60 days (30 past + today + 30 future)
  console.log('\n📅  Generating appointments...')

  // Build a map of used slots per day to avoid overlaps: day → Set of "hh:mm"
  const usedSlots = {}

  const getAvailableSlot = (dayOffset) => {
    const key = dayOffset
    if (!usedSlots[key]) usedSlots[key] = new Set()
    const available = TIME_SLOTS.filter(([h, m]) => !usedSlots[key].has(`${h}:${m}`))
    if (available.length === 0) return null
    const slot = randomFrom(available)
    usedSlots[key].add(`${slot[0]}:${slot[1]}`)
    return slot
  }

  // Each patient gets ~4-6 appointments spread across the range
  const totalAppts = { created: 0, failed: 0 }

  for (const patient of createdPatients) {
    // Pick random days for this patient: 2 past, today/near, 2-3 future
    const dayOffsets = [
      ...shuffle([-25, -18, -14, -10, -7, -5, -3, -2, -1]).slice(0, 3),  // past
      ...shuffle([0, 1, 2]).slice(0, 1),                                    // today/tomorrow
      ...shuffle([3, 5, 7, 10, 14, 17, 21, 25, 28]).slice(0, 2),           // future
    ]

    for (const dayOffset of dayOffsets) {
      // Skip weekends
      const date = addDays(dayOffset)
      const dow = date.getDay()
      if (dow === 0 || dow === 6) continue

      const slot = getAvailableSlot(dayOffset)
      if (!slot) continue

      const template = randomFrom(APPOINTMENT_TEMPLATES)
      const status = appointmentStatus(dayOffset)
      const startTime = toUTC(date, slot[0], slot[1])
      const endTime = addMinutes(startTime, template.duration)

      try {
        await post('/appointments', {
          patient_id: patient.id,
          title: template.title,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: template.duration,
          status,
          notes: null,
          allow_overlap: true,
        })
        totalAppts.created++
        await sleep(80)
      } catch (err) {
        totalAppts.failed++
        console.error(`   ❌  Appt for ${patient.apellido} on day ${dayOffset}: ${err.message}`)
      }
    }

    console.log(`   ✅  ${patient.apellido}`)
  }

  // 4. Add some "no patient" appointments (blocked time, admin, etc.)
  const BLOCKED = [
    { title: 'Reunión con el equipo', duration: 60 },
    { title: 'Almuerzo / descanso', duration: 90 },
    { title: 'Capacitación implantología', duration: 120 },
    { title: 'Administración', duration: 30 },
  ]

  for (let i = 0; i < 8; i++) {
    const dayOffset = randomFrom([-2, -1, 0, 1, 2, 3, 5, 7, 10])
    const date = addDays(dayOffset)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue

    const slot = getAvailableSlot(dayOffset)
    if (!slot) continue

    const t = randomFrom(BLOCKED)
    const status = appointmentStatus(dayOffset)
    const startTime = toUTC(date, slot[0], slot[1])

    try {
      await post('/appointments', {
        patient_id: null,
        title: t.title,
        start_time: startTime,
        end_time: addMinutes(startTime, t.duration),
        duration_minutes: t.duration,
        status,
        notes: null,
        allow_overlap: true,
      })
      totalAppts.created++
      await sleep(80)
    } catch {
      // ignore
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n✅  Seed complete!`)
  console.log(`   Patients:     ${createdPatients.length}`)
  console.log(`   Appointments: ${totalAppts.created} created, ${totalAppts.failed} failed`)
  console.log(`\n🚀  Open http://localhost:3000/dashboard to see the result\n`)
}

main().catch(err => {
  console.error('\n💥  Fatal error:', err.message)
  process.exit(1)
})
