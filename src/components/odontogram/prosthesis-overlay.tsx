'use client'

import { MARK } from '@/constants/odontogram'

// ── Layout constants (must match ToothRow) ────────────────────────────────────

/** Width and height of each tooth SVG (px). */
const TOOTH_SIZE = 40

/** gap-1 in Tailwind = 4px between teeth. */
const GAP = 4

/** Extra padding-top added to ToothRow to make room for the bracket. */
export const PROSTHESIS_ROW_PADDING_TOP = 10

/** How far above the tooth the bracket arm reaches (px, relative to row top). */
const BRACKET_Y = 4

/** How far down from the bracket arm the side legs drop. */
const BRACKET_LEG = 6

/** Horizontal margin beyond the tooth edge on each side. */
const BRACKET_MARGIN = 3

/** Prosthesis stroke colour. */
const COLOR = '#E24B4A'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Given an ordered list of tooth FDI numbers for this row and the set of FDIs
 * that carry a prosthesis mark, return the consecutive groups (by position in
 * the row, not by FDI value) that should be connected by a single bracket.
 *
 * Non-consecutive FDIs produce separate single-tooth groups.
 *
 * @param rowFdis       - Ordered FDI numbers for this row (left to right).
 * @param prosthesisFdis - FDI numbers that have the prosthesis mark.
 * @returns Array of groups; each group is an array of row indices.
 */
const buildGroups = (rowFdis: readonly number[], prosthesisFdis: Set<number>): number[][] => {
  const groups: number[][] = []

  let current: number[] = []

  for (let idx = 0; idx < rowFdis.length; idx++) {
    if (!prosthesisFdis.has(rowFdis[idx])) {
      if (current.length > 0) {
        groups.push(current)

        current = []
      }

      continue
    }

    if (current.length > 0 && idx !== current[current.length - 1] + 1) {
      groups.push(current)

      current = []
    }

    current.push(idx)
  }

  if (current.length > 0) groups.push(current)

  return groups
}

/**
 * X centre of a tooth at a given column index within the row.
 *
 * @param colIndex - Zero-based column position in the row.
 */
const toothCenterX = (colIndex: number): number => colIndex * (TOOTH_SIZE + GAP) + TOOTH_SIZE / 2

// ── Component ─────────────────────────────────────────────────────────────────

interface ProsthesisOverlayProps {
  /** Ordered FDI numbers for this arch row (left to right). */
  rowFdis: readonly number[]
  /** Full teeth state — used to find which FDIs carry a prosthesis mark. */
  teethWithMark: Set<number>
  /** Which prosthesis type to render. */
  markType: typeof MARK.FIXED_PROSTHESIS | typeof MARK.REMOVABLE_PROSTHESIS
  /** Total pixel width of the row container. Derived from rowFdis.length. */
  rowWidth: number
}

/**
 * Absolute-positioned SVG overlay that draws prosthesis brackets above the
 * teeth in a ToothRow.
 *
 * Consecutive teeth sharing the same prosthesis mark are connected by a single
 * bracket. Non-consecutive teeth each get their own bracket.
 *
 * Fixed prosthesis  → solid line.
 * Removable prosthesis → dashed line.
 *
 * @param rowFdis      - Ordered FDI numbers for this row.
 * @param teethWithMark - Set of FDI numbers that carry the prosthesis mark.
 * @param markType     - Which prosthesis type.
 * @param rowWidth     - Total pixel width of the row container.
 */
const ProsthesisOverlay = ({
  rowFdis,
  teethWithMark,
  markType,
  rowWidth,
}: ProsthesisOverlayProps) => {
  const groups = buildGroups(rowFdis, teethWithMark)

  if (groups.length === 0) return null

  const isDashed = markType === MARK.REMOVABLE_PROSTHESIS

  const strokeProps = {
    stroke: COLOR,
    strokeWidth: 2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    ...(isDashed ? { strokeDasharray: '6 3' } : {}),
  }

  const svgHeight = PROSTHESIS_ROW_PADDING_TOP + TOOTH_SIZE

  return (
    <svg
      width={rowWidth}
      height={svgHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {groups.map(group => {
        const firstIdx = group[0]

        const lastIdx = group[group.length - 1]

        const xLeft = toothCenterX(firstIdx) - TOOTH_SIZE / 2 - BRACKET_MARGIN

        const xRight = toothCenterX(lastIdx) + TOOTH_SIZE / 2 + BRACKET_MARGIN

        const yArm = BRACKET_Y

        const yLeg = BRACKET_Y + BRACKET_LEG

        const key = group.join('-')

        return (
          <g key={key}>
            {/* Top horizontal arm */}
            <line x1={xLeft} y1={yArm} x2={xRight} y2={yArm} {...strokeProps} />
            {/* Left leg */}
            <line x1={xLeft} y1={yArm} x2={xLeft} y2={yLeg} {...strokeProps} />
            {/* Right leg */}
            <line x1={xRight} y1={yArm} x2={xRight} y2={yLeg} {...strokeProps} />
          </g>
        )
      })}
    </svg>
  )
}

export default ProsthesisOverlay
