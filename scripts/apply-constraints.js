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

async function applyConstraints() {
  console.log('🛡️ Adding financial & game CHECK constraints to PostgreSQL tables...');
  const sqlFile = path.join(__dirname, '..', 'prisma', 'migrations', 'add_check_constraints.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Check constraints successfully added!');
}

applyConstraints()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to add constraints:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
