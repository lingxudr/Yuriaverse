import nextVitals from 'eslint-config-next/core-web-vitals';
const config = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'audit/**', 'coverage/**'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      '@next/next/no-img-element': 'warn',
      'import/no-anonymous-default-export': 'off'
    }
  }
];
export default config;
