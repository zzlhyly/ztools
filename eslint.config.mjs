import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import vueparser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  js.configs.recommended,

  {
    ignores: [
      'src/auto-imports.d.ts',
      'src/components.d.ts',
      'dist/**',
      'src-tauri/**',
      'node_modules/**',
    ],
  },

  // TS files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'preserve-caught-error': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',  // TypeScript handles this
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Vue files
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueparser,
      parserOptions: { parser: tsparser, ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        ...globals.browser, ...globals.node,
        defineProps: 'readonly', defineEmits: 'readonly', defineExpose: 'readonly', withDefaults: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/require-prop-types': 'warn',
    },
  },
]
