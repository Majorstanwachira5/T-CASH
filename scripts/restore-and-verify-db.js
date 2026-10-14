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

async function verifyBackup(backupFilePath) {
  console.log(`🔍 Verifying backup integrity: ${backupFilePath}`);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const raw = fs.readFileSync(backupFilePath, 'utf-8');
  const data = JSON.parse(raw);

  const storedSha = data.sha256;
  const clone = { ...data };
  delete clone.sha256;
  const computedSha = crypto.createHash('sha256').update(JSON.stringify(clone, null, 2)).digest('hex');

  console.log(`   Stored SHA-256:   ${storedSha}`);
  console.log(`   Computed SHA-256: ${computedSha}`);

  if (storedSha !== computedSha) {
    throw new Error('❌ Checksum mismatch! Backup file may be corrupted or tampered.');
  }

  console.log('✅ Checksum matches perfectly.');
  console.log(`   Snapshot created at: ${data.timestamp}`);
  console.log('   Table records summary:');
  for (const [table, rows] of Object.entries(data.tables)) {
    console.log(`    - ${table}: ${rows.length} rows`);
  }

  return true;
}

if (require.main === module) {
  const backupDir = path.join(__dirname, '..', 'backups');
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    console.error('No backup files found in backups/');
    process.exit(1);
  }
  const latestBackup = path.join(backupDir, files[0]);
  verifyBackup(latestBackup)
    .then(() => {
      console.log('✅ Restoration verification test passed!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Verification failed:', err.message);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { verifyBackup };
