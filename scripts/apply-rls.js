const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env manually
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

// Strip sslmode from connection string so we can supply ssl options manually
function getConnString() {
  let url = process.env.DATABASE_URL || '';
  url = url.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
  return url;
}

function newClient() {
  return new Client({
    connectionString: getConnString(),
    ssl: { rejectUnauthorized: false },
  });
}

async function runStatement(sql, label) {
  const client = newClient();
  await client.connect();
  try {
    await client.query(sql);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log(`  ⚠️  Already applied (skipped): ${label}`);
    } else {
      console.warn(`  ⚠️  Warning on: ${label}`);
      console.warn(`     ${err.message}`);
    }
  } finally {
    await client.end();
  }
}

async function applyRLS() {
  console.log('\n🔒 Applying Row Level Security & Access Policies to Supabase...\n');

  const tables = [
    'AdminAuditLog', 'Comment', 'CommentReport', 'GameConfig',
    'GameEntry', 'GameResult', 'Notification', 'PaymentTransaction',
    'PaymentWebhookEvent', 'PrizeClaim', 'Session', 'User',
    'WalletAccount', 'WalletLedgerEntry',
  ];

  // Step 1: Enable RLS on all tables
  console.log('--- Enabling RLS ---');
  for (const table of tables) {
    await runStatement(
      `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
      `ENABLE RLS: ${table}`
    );
  }

  // Step 2: Force RLS
  console.log('\n--- Forcing RLS ---');
  for (const table of tables) {
    await runStatement(
      `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`,
      `FORCE RLS: ${table}`
    );
  }

  // Step 3: Revoke anon write access on financial tables
  console.log('\n--- Revoking anon write access ---');
  const financialTables = ['PaymentTransaction', 'WalletAccount', 'WalletLedgerEntry', 'PrizeClaim', 'GameEntry'];
  for (const table of financialTables) {
    await runStatement(
      `REVOKE INSERT, UPDATE, DELETE ON "${table}" FROM anon;`,
      `REVOKE anon write: ${table}`
    );
  }

  // Step 4: Full-access policy for postgres (service role)
  console.log('\n--- Applying service-role full-access policies ---');
  for (const table of tables) {
    await runStatement(
      `DO $$ BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_policies
           WHERE tablename = '${table}' AND policyname = 'service_role_full_access'
         ) THEN
           CREATE POLICY service_role_full_access ON "${table}"
             TO postgres USING (true) WITH CHECK (true);
         END IF;
       END $$;`,
      `SERVICE_ROLE POLICY: ${table}`
    );
  }

  console.log('\n✅ RLS and Policies applied successfully!\n');
}

applyRLS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed to apply RLS:', err.message);
    process.exit(1);
  });
