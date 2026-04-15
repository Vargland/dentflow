import type { Evolution } from '@/typing/services/evolution.interface'

/**
 * Props for the EvolutionList component.
 */
export type EvolutionListProps = {
  patientId: string
  evolutions: Evolution[]
  /** JWT Bearer token forwarded from the session. */
  token: string
}
