import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  eslint.configs.recommended,
  {
    files: [
      'src/**/*.ts',           // Only engine source files
      'Game/src/**/*.ts'       // Only game source files
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules
    }
  },
  {
    ignores: [
      'dist/',                 // Built files
      'Game/dist/',           // Game built files
      '**/*.js',              // JavaScript files
      '**/*.mjs',             // ES modules
      'node_modules/',        // Dependencies
      'Game/node_modules/',   // Game dependencies
      'Game/lib/',            // Game lib folder
      '**/*.d.ts',            // Declaration files
      'Game/Assets/',         // Asset files
      'flake.nix',            // Nix files
      'flake.lock'            // Lock files
    ]
  }
];
