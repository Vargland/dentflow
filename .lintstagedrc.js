const config = {
  // ESLint + Prettier on JS/TS files under src/ (JSON excluded — no ESLint config for JSON)
  'src/**/*.{js,ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],

  // Prettier only on JSON files (no ESLint)
  'src/**/*.json': ['prettier --write'],

  // Type-check on TS files (no auto-fix, just validate)
  'src/**/*.{ts,tsx}': () => 'tsc -p tsconfig.json --noEmit',
}

module.exports = config
