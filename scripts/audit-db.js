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

async function runAudit() {
  console.log('=== DATABASE SECURITY AUDIT ===\n');

  // 1. Check RLS status on all tables in public schema
  console.log('--- 1. ROW LEVEL SECURITY (RLS) STATUS ---');
  const rlsStatus = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `;
  console.table(rlsStatus);

  // 2. Check existing policies
  console.log('\n--- 2. EXISTING POLICIES ---');
  const policies = await prisma.$queryRaw`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public';
  `;
  console.table(policies);

  // 3. Check table constraints (Foreign Keys & Checks)
  console.log('\n--- 3. TABLE CONSTRAINTS ---');
  const constraints = await prisma.$queryRaw`
    SELECT conname, contype, conrelid::regclass::text as table_name
    FROM pg_constraint 
    WHERE connamespace = 'public'::regnamespace
    ORDER BY contype, conname;
  `;
  console.table(constraints);

  // 4. Check permissions granted to anon and authenticated roles
  console.log('\n--- 4. ROLE GRANTS (anon, authenticated) ---');
  const grants = await prisma.$queryRaw`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
    ORDER BY grantee, table_name, privilege_type;
  `;
  console.table(grants);

  await prisma.$disconnect();
}

runAudit().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
