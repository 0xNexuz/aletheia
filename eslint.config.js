import js from '@eslint/js';

export default [
  { ignores: ['dist/client/**', 'contract/src/managed/**', 'contract/dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', sessionStorage: 'readonly', crypto: 'readonly', fetch: 'readonly', btoa: 'readonly', atob: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', IntersectionObserver: 'readonly', FormData: 'readonly', TextEncoder: 'readonly', Response: 'readonly', URL: 'readonly', process: 'readonly', console: 'readonly', setTimeout: 'readonly', structuredClone: 'readonly' } }
  }
];
