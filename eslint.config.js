import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default ts.config({ignores:['**/dist/**','node_modules/**','public/**','.local/**','playwright-report/**','test-results/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.{ts,tsx,js}'],languageOptions:{globals:{...globals.node,...globals.browser}},rules:{'@typescript-eslint/no-explicit-any':'error'}},{files:['apps/web/src/**/*.{ts,tsx}'],plugins:{'react-hooks':hooks},rules:hooks.configs.recommended.rules});
