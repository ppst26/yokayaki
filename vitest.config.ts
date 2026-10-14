import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': path.resolve(__dirname, 'test/mocks/server-only.ts'),
    },
  },
});
