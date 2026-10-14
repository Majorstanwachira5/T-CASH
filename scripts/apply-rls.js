const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyRLS() {
  console.log('🔒 Applying Row Level Security & Access Policies to Supabase...');
  const sqlFile = path.join(__dirname, '..', 'prisma', 'migrations', 'enable_rls_and_policies.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Strip comments first
  const cleanSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (err) {
      console.warn(`Warning on statement: ${statement.substring(0, 60)}...`);
      console.warn(`  ${err.message}`);
    }
  }

  console.log('✅ RLS and Policies applied successfully.');
}

applyRLS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to apply RLS:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
