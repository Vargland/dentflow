const config = {
  // ESLint + Prettier on JS/TS/JSON files under src/
  'src/**/*.{js,ts,tsx,json}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],

  // Type-check on TS files (no auto-fix, just validate)
  'src/**/*.{ts,tsx}': () => 'tsc -p tsconfig.json --noEmit',
}

module.exports = config
