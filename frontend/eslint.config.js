import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // These legitimately export helpers alongside components (or, for
    // src/prerender/, instead of components). The rule only protects the dev
    // HMR boundary; the prerender entry runs in Node at build time, where Fast
    // Refresh does not exist, so it cannot break there.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/auth/**/*.{ts,tsx}', 'src/pages/app/analytics/**/*.{ts,tsx}', 'src/theme/**/*.{ts,tsx}', 'src/prerender/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
