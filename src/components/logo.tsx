import { cn } from '@/lib/utils'

interface LogoProps {
  /** Extra classes for the wrapping svg element. */
  className?: string
}

/**
 * DentFlow brand logo — tooth icon + logotype.
 * Uses currentColor so it inherits the parent's text color.
 */
export const Logo = ({ className }: LogoProps) => (
  <svg
    width="160"
    height="44"
    viewBox="0 0 220 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="DentFlow"
    className={cn('text-blue-600 dark:text-blue-400', className)}
  >
    {/* Tooth icon */}
    <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10 C10 10, 8 22, 12 30 C14 34, 16 40, 18 46 C19 48, 22 48, 23 45 C24 42, 24 38, 26 36 C28 38, 28 42, 29 45 C30 48, 33 48, 34 46 C36 40, 38 34, 40 30 C44 22, 42 10, 32 10 C29 10, 27 12, 26 13 C25 12, 23 10, 20 10 Z" />
    </g>

    {/* Spark */}
    <path d="M45 12 L47 16 L51 18 L47 20 L45 24 L43 20 L39 18 L43 16 Z" fill="currentColor" />

    {/* Logotype */}
    <text x="60" y="38" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="600">
      <tspan fill="currentColor">Dent</tspan>
      <tspan fill="currentColor" opacity="0.6">
        Flow
      </tspan>
    </text>
  </svg>
)
