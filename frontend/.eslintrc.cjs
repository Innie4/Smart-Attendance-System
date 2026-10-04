module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    // This is a plain-JS codebase with no PropTypes convention, so prop-types
    // only reports every component's signature. Type contracts are enforced by
    // the build instead.
    'react/prop-types': 'off',
    'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['mock_contracts_test.mjs'],
      env: { node: true, browser: false },
    },
  ],
}