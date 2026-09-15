#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables if available
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Auto-fallback: If DIRECT_URL is missing, derive it from DATABASE_URL
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  console.log('[deploy-migrate] DIRECT_URL not set; auto-deriving from DATABASE_URL...');
  process.env.DIRECT_URL = process.env.DATABASE_URL
    .replace(':6543', ':5432')
    .replace('?pgbouncer=true', '')
    .replace('&pgbouncer=true', '');
}

const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');

console.log('[deploy-migrate] Applying Prisma migrations...');
try {
  execSync(`npx prisma migrate deploy --schema "${schemaPath}"`, {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[deploy-migrate] Database migrations applied successfully.');
} catch (error) {
  console.error('[deploy-migrate] Error applying migrations:', error.message);
  process.exit(1);
}
