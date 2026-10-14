const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFile = path.join(backupDir, `tcpi-backup-${timestamp}.json`);
  console.log(`📦 Starting database backup to ${backupFile}...`);

  const tables = [
    'user',
    'session',
    'walletAccount',
    'walletLedgerEntry',
    'gameConfig',
    'gameEntry',
    'gameResult',
    'paymentTransaction',
    'paymentWebhookEvent',
    'prizeClaim',
    'notification',
    'adminAuditLog',
    'comment',
    'commentReport',
  ];

  const dump = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    tables: {},
  };

  for (const table of tables) {
    console.log(`  -> Exporting table ${table}...`);
    const records = await prisma[table].findMany();
    // Serialize BigInt values
    dump.tables[table] = JSON.parse(
      JSON.stringify(records, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
    console.log(`     Saved ${records.length} records.`);
  }

  const jsonContent = JSON.stringify(dump, null, 2);
  const checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');
  dump.sha256 = checksum;

  fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2), 'utf-8');
  console.log(`✅ Backup successfully created! File: ${backupFile}`);
  console.log(`   SHA256: ${checksum}`);

  await prisma.$disconnect();
  return backupFile;
}

if (require.main === module) {
  createBackup().catch((e) => {
    console.error('Backup failed:', e);
    process.exit(1);
  });
}

module.exports = { createBackup };
