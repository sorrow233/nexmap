module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    settings: {
        react: {
            version: 'detect'
        }
    },
    plugins: ['react', 'react-hooks', 'react-refresh'],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended'
    ],
    ignorePatterns: [
        'dist/',
        'dist-extension/',
        'node_modules/'
    ],
    globals: {
        __APP_BUILD_TIMESTAMP__: 'readonly',
        ClipboardItem: 'readonly'
    },
    rules: {
        'no-unused-vars': 'off',
        'no-empty': 'off',
        'no-constant-condition': 'off',
        'no-useless-escape': 'off',
        'no-control-regex': 'off',
        'no-mixed-spaces-and-tabs': 'off',
        'no-case-declarations': 'off',
        'no-useless-catch': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/display-name': 'off',
        'react/no-unescaped-entities': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': 'off'
    },
    overrides: [
        {
            files: ['*.js', '*.mjs', 'scripts/**/*.{js,mjs}', '*.config.js'],
            env: {
                node: true,
                es2022: true
            }
        },
        {
            files: ['functions/**/*.js'],
            env: {
                worker: true,
                es2022: true
            }
        },
        {
            files: ['browser-extension/**/*.{js,jsx}'],
            env: {
                browser: true,
                webextensions: true,
                es2022: true
            }
        }
    ]
};
