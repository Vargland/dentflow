import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import stylistic from '@stylistic/eslint-plugin'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import reactRefresh from 'eslint-plugin-react-refresh'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  {
    plugins: {
      '@stylistic': stylistic,
      'simple-import-sort': simpleImportSort,
      'react-refresh': reactRefresh,
    },

    rules: {
      // ── Core ──────────────────────────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-len': [
        'error',
        {
          code: 120,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreComments: true,
          ignoreUrls: true,
        },
      ],
      'max-params': ['error', { max: 3 }],
      'no-underscore-dangle': ['error', { allow: ['_chatlio'] }],
      'object-curly-spacing': ['error', 'always'],
      // ── Architecture: no Server Actions. Use Route Handlers in src/app/api/*.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExpressionStatement[directive="use server"]',
          message:
            'Server Actions are forbidden. Next.js must stay pure frontend — use a Route Handler under src/app/api/ instead.',
        },
      ],
      'id-length': [
        'error',
        {
          min: 3,
          exceptions: ['i', 'j', 'id', 'to', 'fd', 'cn', 'ev'],
          properties: 'never',
        },
      ],

      // ── TypeScript ────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: true, classes: true, variables: true },
      ],

      // ── React ─────────────────────────────────────────────────────────────
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Stylistic ─────────────────────────────────────────────────────────
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'any', prev: 'case', next: 'case' },
        { blankLine: 'any', prev: 'case', next: 'default' },
      ],

      // ── Import sort ───────────────────────────────────────────────────────
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. CSS / assets
            ['^.+\\.css$', '^assets/'],
            // 2. External packages
            ['^react', '^next', '^@?\\w'],
            // 3. Internal — ordered by domain
            [
              '^@/typing',
              '^@/lib',
              '^@/components/ui',
              '^@/components',
              '^@/',
            ],
            // 4. Relative imports
            ['^\\.\\./', '^\\./', '^\\./'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },

  // ── Disable padding rule in barrel/index files ────────────────────────────
  {
    files: ['**/index.ts', '**/index.tsx'],
    rules: {
      '@stylistic/padding-line-between-statements': 'off',
    },
  },

  // ── Next.js page / layout files must use `export default async function` ──
  // The React arrow-function rule and react-refresh rule conflict with Next.js page conventions
  // (pages export `metadata` alongside the default component, which is required by Next.js).
  {
    files: ['src/app/**/page.tsx', 'src/app/**/layout.tsx', 'src/app/**/route.ts'],
    rules: {
      'react/function-component-definition': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },

  // ── shadcn/ui generated files — relax strict rules ───────────────────────
  {
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-use-before-define': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])

export default eslintConfig
