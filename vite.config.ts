/// <reference types="vitest" />
import os from 'node:os';
import path from 'node:path';
import { filament } from '@filament/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';

const coverageRunId = `${process.pid}-${Date.now()}`;
const coverageReportsDirectory = path.join(
  os.tmpdir(),
  'promo-simulator-ui-coverage-report',
  coverageRunId
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    process.env.VITEST ? null : checker({ typescript: true }),
    react(),
    filament({ enableCSSLayer: true }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    exclude: ['@filament/atomic-styles'],
  },
  server: {
    // [SATYAM COPY] points at the 8010 backend copy, not the original 8008
    proxy: {
      '/itaap-digitalit-promosimulator-coreservice': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      },
    },
  },
  ssr: {
    noExternal: ['@filament', '@filament-icons'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      clean: false,
      cleanOnRerun: false,
      reportsDirectory: coverageReportsDirectory,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.css.ts',
        'src/global-styles.css.ts',
        'src/mocks/**',
        'src/types/rbac.ts',
        'src/types/simulation.ts'
      ],
      all: true,
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
  },
});
