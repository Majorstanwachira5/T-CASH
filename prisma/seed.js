const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting T CPI database seed...');

  // 1. Create or update Default Admin
  const adminPasswordHash = await bcrypt.hash('AdminSecurePassword123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tcpi.co.ke' },
    update: {
      fullName: 'T CPI Lead Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@tcpi.co.ke',
      phone: '+254700000001',
      fullName: 'T CPI Lead Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: adminPasswordHash,
    },
  });

  // Ensure admin has a wallet
  await prisma.walletAccount.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      balanceCents: BigInt(0),
      currency: 'KES',
    },
  });

  console.log(`✅ Admin created: ${adminUser.email}`);

  // 2. Create or update Demo Player
  const playerPasswordHash = await bcrypt.hash('PlayerPassword123!', 10);
  const demoPlayer = await prisma.user.upsert({
    where: { email: 'player@tcpi.co.ke' },
    update: {
      fullName: 'Wanjiku Kamau',
      role: 'USER',
      status: 'ACTIVE',
      passwordHash: playerPasswordHash,
    },
    create: {
      email: 'player@tcpi.co.ke',
      phone: '+254712345678',
      fullName: 'Wanjiku Kamau',
      role: 'USER',
      status: 'ACTIVE',
      passwordHash: playerPasswordHash,
    },
  });

  // Ensure demo player has initial wallet with KSh 500 (50,000 cents)
  const initialBalance = BigInt(50000);
  const playerWallet = await prisma.walletAccount.upsert({
    where: { userId: demoPlayer.id },
    update: { balanceCents: initialBalance },
    create: {
      userId: demoPlayer.id,
      balanceCents: initialBalance,
      currency: 'KES',
    },
  });

  // Create initial ledger entry
  await prisma.walletLedgerEntry.upsert({
    where: { reference: 'TCPI-LEDGER-INIT-001' },
    update: {},
    create: {
      walletAccountId: playerWallet.id,
      transactionType: 'CREDIT_DEPOSIT',
      amountCents: initialBalance,
      balanceBeforeCents: BigInt(0),
      balanceAfterCents: initialBalance,
      reference: 'TCPI-LEDGER-INIT-001',
      reason: 'Welcome bonus credit for demo testing',
    },
  });

  console.log(`✅ Demo player created: ${demoPlayer.email} with KSh 500 balance`);

  // 3. Create or update Second Player (Brian O.)
  const player2Hash = await bcrypt.hash('Player2SecurePassword123!', 10);
  const demoPlayer2 = await prisma.user.upsert({
    where: { email: 'brian.otieno@tcpi.co.ke' },
    update: {},
    create: {
      email: 'brian.otieno@tcpi.co.ke',
      phone: '+254722998877',
      fullName: 'Brian Otieno',
      role: 'USER',
      status: 'ACTIVE',
      passwordHash: player2Hash,
    },
  });
  await prisma.walletAccount.upsert({
    where: { userId: demoPlayer2.id },
    update: {},
    create: { userId: demoPlayer2.id, balanceCents: BigInt(20000), currency: 'KES' },
  });

  // 4. Create Official Game Config
  const targetNumbers = [7, 14, 21, 33, 42, 50, 63, 77, 88, 99];
  const gameConfig = await prisma.gameConfig.upsert({
    where: { version: 1 },
    update: {
      name: 'T CPI Official Draw #1',
      description: 'Ten Mystery Number Ordered Match Draw',
      entryPriceCents: BigInt(10000),   // KSh 100.00
      repeatCreditCents: BigInt(200),    // KSh 2.00
      prizeAmountCents: BigInt(5000000), // KSh 50,000.00
      totalPositions: 10,
      numberMin: 1,
      numberMax: 99,
      isUniqueRequired: false,
      targetNumbers: JSON.stringify(targetNumbers),
      isPublished: true,
      isActive: true,
      publishedAt: new Date(),
      createdByAdminId: adminUser.id,
    },
    create: {
      version: 1,
      name: 'T CPI Official Draw #1',
      description: 'Ten Mystery Number Ordered Match Draw',
      entryPriceCents: BigInt(10000),   // KSh 100.00
      repeatCreditCents: BigInt(200),    // KSh 2.00
      prizeAmountCents: BigInt(5000000), // KSh 50,000.00
      totalPositions: 10,
      numberMin: 1,
      numberMax: 99,
      isUniqueRequired: false,
      targetNumbers: JSON.stringify(targetNumbers),
      isPublished: true,
      isActive: true,
      publishedAt: new Date(),
      createdByAdminId: adminUser.id,
    },
  });

  console.log(`✅ Game Config #1 seeded with targets: ${targetNumbers.join(', ')}`);

  // 5. Seed an authorized game entry for Wanjiku
  const wanjikuEntry = await prisma.gameEntry.upsert({
    where: { entryReference: 'TCPI-ENT-SAMPLE-001' },
    update: {},
    create: {
      entryReference: 'TCPI-ENT-SAMPLE-001',
      userId: demoPlayer.id,
      gameConfigId: gameConfig.id,
      ruleVersion: 1,
      generatedNumbers: JSON.stringify([7, 14, 21, 33, 42, 50, 63, 77, 12, 45]),
      matchedCount: 8,
      matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7]),
      isWinner: false,
      prizeAwardedCents: BigInt(0),
      status: 'REVEALED',
      entropySeedHash: 'sample_entropy_seed_hash_audit_001',
      idempotencyKey: 'sample_idemp_key_001',
    },
  });

  // 6. Seed Player Community Comments (Authentic feedback & loss experience)
  const commentCount = await prisma.comment.count();
  if (commentCount === 0) {
    await prisma.comment.createMany({
      data: [
        {
          userId: demoPlayer.id,
          authorAlias: 'Wanjiku K.',
          content: 'Matched 8 numbers in Draw #1! Very exciting reveal animation. Entering again with the KSh 2 repeat credit.',
          category: 'LOSS_REPORTED',
          region: 'Nairobi',
          status: 'ACTIVE',
          isVerifiedWin: false,
          associatedEntryId: wanjikuEntry.id,
        },
        {
          userId: demoPlayer2.id,
          authorAlias: 'Brian O.',
          content: 'The M-PESA Paystack integration is super fast. Wallet was credited within 5 seconds.',
          category: 'PLAYER_EXPERIENCE',
          region: 'Coast',
          status: 'ACTIVE',
          isVerifiedWin: false,
        },
        {
          userId: demoPlayer.id,
          authorAlias: 'Wanjiku K.',
          content: 'Suggestion: Could we see an countdown timer for upcoming draws on the mobile screen?',
          category: 'SUGGESTION',
          region: 'Nairobi',
          status: 'ACTIVE',
          isVerifiedWin: false,
        },
      ],
    });
    console.log('✅ Seeded initial player community comments');
  }

  // 7. Initial Audit Log
  await prisma.adminAuditLog.create({
    data: {
      adminId: adminUser.id,
      action: 'SYSTEM_INITIALIZATION',
      targetType: 'GameConfig',
      targetId: gameConfig.id,
      details: JSON.stringify({
        version: gameConfig.version,
        targetNumbers,
        entryPriceKsh: 100,
        prizeAmountKsh: 50000,
      }),
    },
  });

  console.log('🚀 T CPI database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
