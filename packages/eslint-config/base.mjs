import turbo from 'eslint-plugin-turbo';
import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import prettierEslint from 'eslint-config-prettier';

export default tsEslint.config(
  {
    ignores: ['public', 'node_modules', 'build', 'dist']
  },
  turbo.configs['flat/recommended'],
  prettierEslint,
  jsEslint.configs.recommended,
  ...tsEslint.configs.recommended,
);
