// eslint.config.js (CommonJS)
const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const htmlParser = require('@html-eslint/parser');
const pluginChaiFriendly = require('eslint-plugin-chai-friendly');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const { should, ...chaiGlobals } = globals.chai;

module.exports = defineConfig([
        importPlugin.flatConfigs.recommended,
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
                        'no-console': 'warn',
                        camelcase: 'off',
                        'no-unused-vars': [
                                'error',
                                {
                                        argsIgnorePattern: '^(_|.*(res|err|next|req|done|cb|callback))',
                                        varsIgnorePattern: '^(_|.*(res|err|next|req|done|cb|callback))',
                                        ignoreRestSiblings: true,
                                },
                        ],
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
                files: ['**/*.test.js'],
                plugins: { js, "chai-friendly": pluginChaiFriendly },
                languageOptions: {
                        globals: {
                                ...globals.node,
                                ...globals.mocha,
                                ...chaiGlobals,
                        },
                },
                rules: {
                        'no-unused-expressions': 'off',
                        'chai-friendly/no-unused-expressions': 'error',
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
