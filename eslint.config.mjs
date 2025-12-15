// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2025–present Mykyta Nosov

import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/vendor/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/coverage/**',
            '**/.yarn/**',
            './contracts/docs',
        ],
    },
    js.configs.recommended,
    {
        files: ['**/*.cjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
    {
        files: ['scripts/**/*.{js,cjs,mjs}'],
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['packages/**/**/*.{js,jsx}'],
        languageOptions: {
            globals: { ...globals.browser },
        },
    },
];
