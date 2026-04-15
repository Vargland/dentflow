/**
 * Page-level param and searchParam types for patient routes.
 */

/** Dynamic route params for /patients/[id] pages. */
export type PatientPageParams = {
  params: Promise<{ id: string }>
}

/** Search params for the /patients list page. */
export type PatientListSearchParams = {
  searchParams: Promise<{ q?: string }>
}
