import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  fixedExtension: true,
  dts: true,
  sourcemap: true,
  clean: true,
});
