/**
 * Unit tests for surface hit-testing in tooth-canvas.tsx.
 *
 * These tests exercise the pure geometric functions without a DOM or canvas.
 * The canvas is 30×30 logical pixels with the following surface layout:
 *
 *   V (top trapezoid):   (0,0)→(30,0)→(21,9)→(9,9)
 *   P (bot trapezoid):   (9,21)→(21,21)→(30,30)→(0,30)
 *   M (left trapezoid):  (0,0)→(9,9)→(9,21)→(0,30)
 *   D (right trapezoid): (30,0)→(30,30)→(21,21)→(21,9)
 *   O (center square):   x=9 y=9 w=12 h=12
 *
 * Run with:  npx ts-node --esm src/.../tooth-canvas.test.ts
 * Or include in a Jest/Vitest project — the file uses describe/it/expect
 * shaped for both runners.
 */

import { hitTestSurface } from './tooth-geometry'

// ── Minimal test harness (used when no framework is present) ──────────────────

type TestFn = () => void

interface TestSuite {
  name: string
  tests: Array<{ name: string; fn: TestFn }>
}

const suites: TestSuite[] = []

let currentSuite: TestSuite | null = null

/** Declare a test suite. */
const describe = (name: string, fn: () => void) => {
  currentSuite = { name, tests: [] }

  suites.push(currentSuite)

  fn()

  currentSuite = null
}

/** Declare an individual test case. */
const it = (name: string, fn: TestFn) => {
  if (!currentSuite) throw new Error('it() called outside describe()')

  currentSuite.tests.push({ name, fn })
}

/** Simple assertion. */
const expect = <T>(actual: T) => ({
  toBe: (expected: T) => {
    if (actual !== expected) {
      throw new Error(`Expected ${String(expected)}, got ${String(actual)}`)
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error(`Expected null, got ${String(actual)}`)
    }
  },
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('hitTestSurface — O (center square)', () => {
  it('exact center returns O', () => {
    expect(hitTestSurface(15, 15)).toBe('O')
  })

  it('top-left of center square (9,9) returns O', () => {
    expect(hitTestSurface(9, 9)).toBe('O')
  })

  it('bottom-right of center square (21,21) returns O', () => {
    expect(hitTestSurface(21, 21)).toBe('O')
  })

  it('slightly inside center returns O', () => {
    expect(hitTestSurface(10, 10)).toBe('O')
  })
})

describe('hitTestSurface — V (top trapezoid)', () => {
  it('top-center point returns V', () => {
    expect(hitTestSurface(15, 2)).toBe('V')
  })

  it('top-left corner (0,0) returns V', () => {
    expect(hitTestSurface(0, 0)).toBe('V')
  })

  it('top-right corner (30,0) returns V', () => {
    expect(hitTestSurface(30, 0)).toBe('V')
  })

  it('mid-top area returns V', () => {
    expect(hitTestSurface(15, 4)).toBe('V')
  })
})

describe('hitTestSurface — P (bottom trapezoid)', () => {
  it('bottom-center point returns P', () => {
    expect(hitTestSurface(15, 28)).toBe('P')
  })

  it('bottom-left corner (0,30) returns P', () => {
    expect(hitTestSurface(0, 30)).toBe('P')
  })

  it('bottom-right corner (30,30) returns P', () => {
    expect(hitTestSurface(30, 30)).toBe('P')
  })
})

describe('hitTestSurface — M (left trapezoid)', () => {
  it('left-center point returns M', () => {
    expect(hitTestSurface(2, 15)).toBe('M')
  })

  it('left-top corner area returns M', () => {
    // Point just below (0,0)–(9,9) edge, left side
    expect(hitTestSurface(1, 5)).toBe('M')
  })

  it('left-bottom area returns M', () => {
    expect(hitTestSurface(2, 25)).toBe('M')
  })
})

describe('hitTestSurface — D (right trapezoid)', () => {
  it('right-center point returns D', () => {
    expect(hitTestSurface(28, 15)).toBe('D')
  })

  it('right-top corner area returns D', () => {
    expect(hitTestSurface(29, 5)).toBe('D')
  })

  it('right-bottom area returns D', () => {
    expect(hitTestSurface(28, 25)).toBe('D')
  })
})

describe('hitTestSurface — edge / boundary cases', () => {
  it('center of each quadrant returns the right surface', () => {
    // Top strip → V
    expect(hitTestSurface(15, 3)).toBe('V')

    // Bottom strip → P
    expect(hitTestSurface(15, 27)).toBe('P')

    // Left strip → M
    expect(hitTestSurface(3, 15)).toBe('M')

    // Right strip → D
    expect(hitTestSurface(27, 15)).toBe('D')
  })
})

// ── Runner ────────────────────────────────────────────────────────────────────

/**
 * Runs all registered test suites and prints results to stdout.
 * Called automatically when this file is executed directly.
 */
const runAll = () => {
  let passed = 0

  let failed = 0

  for (const suite of suites) {
    console.warn(`\n  ${suite.name}`)

    for (const test of suite.tests) {
      try {
        test.fn()

        console.warn(`    ✓ ${test.name}`)

        passed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        console.error(`    ✗ ${test.name}\n      ${msg}`)

        failed++
      }
    }
  }

  const total = passed + failed

  console.warn(`\n  ${passed}/${total} tests passed${failed > 0 ? ` (${failed} failed)` : ''}`)

  if (failed > 0) process.exit(1)
}

runAll()
