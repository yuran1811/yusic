import { defineConfig } from 'tsdown';

export default [
  defineConfig({
    deps: { neverBundle: ['bun'] },
    dts: { tsgo: true },
    entry: ['src/index.ts'],
    minify: true,
  }),
];
