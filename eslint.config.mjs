import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [{ ignores: ['node_modules/**','.next/**','work/**','public/mediapipe/**','next-env.d.ts'] }, ...compat.extends('next/core-web-vitals','next/typescript'), { rules: { '@typescript-eslint/no-unused-vars': 'warn' } }];
