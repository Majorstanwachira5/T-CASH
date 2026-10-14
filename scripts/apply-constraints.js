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

async function applyConstraints() {
  console.log('\n🛡️  Applying financial & game CHECK constraints to Supabase...\n');

  const client = new Client({
    connectionString: getConnString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const constraints = [
    {
      name: 'check_wallet_balance_non_negative',
      sql: `ALTER TABLE "WalletAccount" ADD CONSTRAINT check_wallet_balance_non_negative CHECK ("balanceCents" >= 0);`,
      label: 'WalletAccount: balanceCents >= 0',
    },
    {
      name: 'check_payment_amount_positive',
      sql: `ALTER TABLE "PaymentTransaction" ADD CONSTRAINT check_payment_amount_positive CHECK ("amountCents" > 0);`,
      label: 'PaymentTransaction: amountCents > 0',
    },
    {
      name: 'check_ledger_amount_non_negative',
      sql: `ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_amount_non_negative CHECK ("amountCents" >= 0);`,
      label: 'WalletLedgerEntry: amountCents >= 0',
    },
    {
      name: 'check_ledger_balance_before_non_negative',
      sql: `ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_balance_before_non_negative CHECK ("balanceBeforeCents" >= 0);`,
      label: 'WalletLedgerEntry: balanceBeforeCents >= 0',
    },
    {
      name: 'check_ledger_balance_after_non_negative',
      sql: `ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT check_ledger_balance_after_non_negative CHECK ("balanceAfterCents" >= 0);`,
      label: 'WalletLedgerEntry: balanceAfterCents >= 0',
    },
    {
      name: 'check_prize_amount_positive',
      sql: `ALTER TABLE "PrizeClaim" ADD CONSTRAINT check_prize_amount_positive CHECK ("amountCents" > 0);`,
      label: 'PrizeClaim: amountCents > 0',
    },
    {
      name: 'check_game_entry_price_non_negative',
      sql: `ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_entry_price_non_negative CHECK ("entryPriceCents" >= 0);`,
      label: 'GameConfig: entryPriceCents >= 0',
    },
    {
      name: 'check_game_repeat_credit_non_negative',
      sql: `ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_repeat_credit_non_negative CHECK ("repeatCreditCents" >= 0);`,
      label: 'GameConfig: repeatCreditCents >= 0',
    },
    {
      name: 'check_game_prize_amount_non_negative',
      sql: `ALTER TABLE "GameConfig" ADD CONSTRAINT check_game_prize_amount_non_negative CHECK ("prizeAmountCents" >= 0);`,
      label: 'GameConfig: prizeAmountCents >= 0',
    },
  ];

  for (const c of constraints) {
    try {
      const exists = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1`,
        [c.name]
      );
      if (exists.rows.length > 0) {
        console.log(`  ⚠️  Already exists (skipped): ${c.label}`);
      } else {
        await client.query(c.sql);
        console.log(`  ✅ ${c.label}`);
      }
    } catch (err) {
      console.warn(`  ⚠️  Warning: ${c.label} — ${err.message}`);
    }
  }

  await client.end();
  console.log('\n✅ Check constraints successfully applied!\n');
}

applyConstraints()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed to apply constraints:', err.message);
    process.exit(1);
  });
