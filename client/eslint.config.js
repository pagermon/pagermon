// eslint.config.js (CommonJS)
const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const htmlParser = require('@html-eslint/parser');
const globals = require('globals');

module.exports = defineConfig([
        {
                files: ['**/*.js'],
                plugins: { js },
                extends: ['js/recommended'],
                languageOptions: {
                        ecmaVersion: 2022,
                        sourceType: 'script',
                        globals: {
                                ...globals.node,
                        },
                },
                rules: {
                        'no-console': 'off',
                        camelcase: 'warn',
                        'no-unused-vars': 'error',
                        'no-undef': 'warn',
                        'no-var': 'error',
                        'prefer-const': [
                                'error',
                                {
                                        destructuring: 'any',
                                        ignoreReadBeforeAssign: false,
                                },
                        ],
                        'prefer-arrow-callback': 'warn',
                },
        },
        {
                files: ['**/*.html', '**/*.ejs'],
                plugins: { '@html-eslint': htmlPlugin },
                languageOptions: { parser: htmlParser },
                ...htmlPlugin.configs['flat/recommended'],
                // Optional: eigene HTML-Regeln
                rules: {
                        ...htmlPlugin.configs['flat/recommended'].rules,
                        '@html-eslint/indent': 'error',
                },
        },
        prettierRecommended,
]);
