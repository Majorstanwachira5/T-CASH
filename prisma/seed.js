const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting T CPI comprehensive database seed...');

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

  console.log(`✅ Admin verified: ${adminUser.email}`);

  // 2. Seed Official Game Config #1
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

  // 3. Seed Diverse Kenyan Players
  const defaultPlayerPassword = await bcrypt.hash('PlayerSecurePass123!', 10);

  const kenyanPlayersData = [
    { email: 'wanjiku.kamau@tcpi.co.ke', phone: '+254712345678', fullName: 'Wanjiku Kamau', region: 'Nairobi', balanceCents: 50000 },
    { email: 'faith.mwangi@tcpi.co.ke', phone: '+254712849104', fullName: 'Faith Mwangi', region: 'Rift Valley', balanceCents: 5000000 },
    { email: 'dennis.mutua@tcpi.co.ke', phone: '+254722310492', fullName: 'Dennis Mutua', region: 'Nairobi', balanceCents: 5000000 },
    { email: 'collins.wanyonyi@tcpi.co.ke', phone: '+254741209384', fullName: 'Collins Wanyonyi', region: 'Western', balanceCents: 25000 },
    { email: 'mercy.chebet@tcpi.co.ke', phone: '+254790442115', fullName: 'Mercy Chebet', region: 'Rift Valley', balanceCents: 15000 },
    { email: 'brian.otieno@tcpi.co.ke', phone: '+254722877990', fullName: 'Brian Otieno', region: 'Coast', balanceCents: 20000 },
    { email: 'geoffrey.koech@tcpi.co.ke', phone: '+254725811340', fullName: 'Geoffrey Koech', region: 'Rift Valley', balanceCents: 5000000 },
    { email: 'grace.achieng@tcpi.co.ke', phone: '+254715690321', fullName: 'Grace Achieng', region: 'Nyanza', balanceCents: 30000 },
    { email: 'samuel.njoroge@tcpi.co.ke', phone: '+254728123490', fullName: 'Samuel Njoroge', region: 'Central', balanceCents: 45000 },
    { email: 'timothy.barasa@tcpi.co.ke', phone: '+254718992019', fullName: 'Timothy Barasa', region: 'Western', balanceCents: 18000 },
    { email: 'halima.hassan@tcpi.co.ke', phone: '+254720471938', fullName: 'Halima Hassan', region: 'Coast', balanceCents: 22000 },
    { email: 'kelvin.kiprop@tcpi.co.ke', phone: '+254701938210', fullName: 'Kelvin Kiprop', region: 'Eastern', balanceCents: 5000000 },
    { email: 'joan.cherono@tcpi.co.ke', phone: '+254705384918', fullName: 'Joan Cherono', region: 'Rift Valley', balanceCents: 12000 },
    { email: 'evans.ombati@tcpi.co.ke', phone: '+254798918204', fullName: 'Evans Ombati', region: 'Nyanza', balanceCents: 35000 },
    { email: 'beatrice.wambui@tcpi.co.ke', phone: '+254708019384', fullName: 'Beatrice Wambui', region: 'Central', balanceCents: 28000 },
    { email: 'duncan.kiprono@tcpi.co.ke', phone: '+254743182901', fullName: 'Duncan Kiprono', region: 'Rift Valley', balanceCents: 5000000 },
    { email: 'sharon.moraa@tcpi.co.ke', phone: '+254791220912', fullName: 'Sharon Moraa', region: 'Rift Valley', balanceCents: 5000000 },
    { email: 'peter.kamande@tcpi.co.ke', phone: '+254726771440', fullName: 'Peter Kamande', region: 'Central', balanceCents: 5000000 },
    { email: 'judith.akinyi@tcpi.co.ke', phone: '+254742880192', fullName: 'Judith Akinyi', region: 'Nyanza', balanceCents: 5000000 },
    { email: 'victor.otieno@tcpi.co.ke', phone: '+254744991204', fullName: 'Victor Otieno', region: 'Nyanza', balanceCents: 5000000 },
  ];

  const createdUsers = [];

  for (const p of kenyanPlayersData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        fullName: p.fullName,
        phone: p.phone,
        status: 'ACTIVE',
      },
      create: {
        email: p.email,
        phone: p.phone,
        fullName: p.fullName,
        role: 'USER',
        status: 'ACTIVE',
        passwordHash: defaultPlayerPassword,
      },
    });

    await prisma.walletAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balanceCents: BigInt(p.balanceCents),
        currency: 'KES',
      },
    });

    createdUsers.push({ ...user, region: p.region });
  }

  console.log(`✅ Seeded ${createdUsers.length} diverse Kenyan players with wallets`);

  // 4. Seed Verified Grand Prize Game Entries & Near Misses
  const faithUser = createdUsers.find((u) => u.email === 'faith.mwangi@tcpi.co.ke');
  const dennisUser = createdUsers.find((u) => u.email === 'dennis.mutua@tcpi.co.ke');
  const collinsUser = createdUsers.find((u) => u.email === 'collins.wanyonyi@tcpi.co.ke');
  const mercyUser = createdUsers.find((u) => u.email === 'mercy.chebet@tcpi.co.ke');
  const geoffreyUser = createdUsers.find((u) => u.email === 'geoffrey.koech@tcpi.co.ke');

  // Faith 10/10 Grand Prize Win
  let faithWinEntry = null;
  if (faithUser) {
    faithWinEntry = await prisma.gameEntry.upsert({
      where: { entryReference: 'TCPI-WIN-8491' },
      update: {},
      create: {
        entryReference: 'TCPI-WIN-8491',
        userId: faithUser.id,
        gameConfigId: gameConfig.id,
        ruleVersion: 1,
        generatedNumbers: JSON.stringify(targetNumbers),
        matchedCount: 10,
        matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        isWinner: true,
        prizeAwardedCents: BigInt(5000000), // KSh 50,000
        status: 'SETTLED',
        entropySeedHash: 'sha256_audit_seed_faith_8491_draw1',
        idempotencyKey: 'idemp_faith_win_8491',
        isPubliclyShared: true,
      },
    });
  }

  // Dennis 10/10 Grand Prize Win
  let dennisWinEntry = null;
  if (dennisUser) {
    dennisWinEntry = await prisma.gameEntry.upsert({
      where: { entryReference: 'TCPI-WIN-3104' },
      update: {},
      create: {
        entryReference: 'TCPI-WIN-3104',
        userId: dennisUser.id,
        gameConfigId: gameConfig.id,
        ruleVersion: 1,
        generatedNumbers: JSON.stringify(targetNumbers),
        matchedCount: 10,
        matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        isWinner: true,
        prizeAwardedCents: BigInt(5000000),
        status: 'SETTLED',
        entropySeedHash: 'sha256_audit_seed_dennis_3104_draw1',
        idempotencyKey: 'idemp_dennis_win_3104',
        isPubliclyShared: true,
      },
    });
  }

  // Collins 9/10 Near Miss
  if (collinsUser) {
    await prisma.gameEntry.upsert({
      where: { entryReference: 'TCPI-ENT-COL-901' },
      update: {},
      create: {
        entryReference: 'TCPI-ENT-COL-901',
        userId: collinsUser.id,
        gameConfigId: gameConfig.id,
        ruleVersion: 1,
        generatedNumbers: JSON.stringify([7, 14, 21, 33, 42, 50, 99, 77, 88, 99]),
        matchedCount: 9,
        matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 7, 8, 9]),
        isWinner: false,
        prizeAwardedCents: BigInt(0),
        status: 'REVEALED',
        entropySeedHash: 'sha256_audit_seed_collins_901',
        idempotencyKey: 'idemp_collins_901',
        isPubliclyShared: true,
      },
    });
  }

  // Mercy 9/10 Near Miss
  if (mercyUser) {
    await prisma.gameEntry.upsert({
      where: { entryReference: 'TCPI-ENT-MER-902' },
      update: {},
      create: {
        entryReference: 'TCPI-ENT-MER-902',
        userId: mercyUser.id,
        gameConfigId: gameConfig.id,
        ruleVersion: 1,
        generatedNumbers: JSON.stringify([7, 14, 21, 33, 42, 50, 63, 77, 12, 99]),
        matchedCount: 9,
        matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 9]),
        isWinner: false,
        prizeAwardedCents: BigInt(0),
        status: 'REVEALED',
        entropySeedHash: 'sha256_audit_seed_mercy_902',
        idempotencyKey: 'idemp_mercy_902',
        isPubliclyShared: true,
      },
    });
  }

  // Geoffrey 10/10 Grand Prize Win
  let geoffreyWinEntry = null;
  if (geoffreyUser) {
    geoffreyWinEntry = await prisma.gameEntry.upsert({
      where: { entryReference: 'TCPI-WIN-8113' },
      update: {},
      create: {
        entryReference: 'TCPI-WIN-8113',
        userId: geoffreyUser.id,
        gameConfigId: gameConfig.id,
        ruleVersion: 1,
        generatedNumbers: JSON.stringify(targetNumbers),
        matchedCount: 10,
        matchedPositions: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
        isWinner: true,
        prizeAwardedCents: BigInt(5000000),
        status: 'SETTLED',
        entropySeedHash: 'sha256_audit_seed_geoffrey_8113_draw1',
        idempotencyKey: 'idemp_geoffrey_win_8113',
        isPubliclyShared: true,
      },
    });
  }

  console.log('✅ Seeded grand prize winners and near-miss draw entries');

  // 5. Seed Vibrant Authentic Player Community Comments
  const commentsToSeed = [
    {
      userEmail: 'faith.mwangi@tcpi.co.ke',
      authorAlias: 'Faith M. (0712***849)',
      content: 'Wueh!! Still can’t believe it! Matched all 10 numbers in Draw #1 and my 50k landed on M-PESA via Paystack in minutes. T CPI is 100% genuine!',
      category: 'CONFIRMED_WIN',
      region: 'Rift Valley',
      isVerifiedWin: true,
      associatedEntryId: faithWinEntry ? faithWinEntry.id : null,
    },
    {
      userEmail: 'collins.wanyonyi@tcpi.co.ke',
      authorAlias: 'Collins W. (0741***209)',
      content: 'Aii nilikua nimefika 9 out of 10! Box number 7 ndio iliruka kidogo. Hii KSh 2 repeat credit imenisaidia kuingia mara tatu tena.',
      category: 'LOSS_REPORTED',
      region: 'Western',
      isVerifiedWin: false,
    },
    {
      userEmail: 'dennis.mutua@tcpi.co.ke',
      authorAlias: 'Dennis M. (0722***310)',
      content: 'Westlands tuko ndani! Verified win confirmed. M-PESA prompt was instant and the admin audit trail is completely transparent.',
      category: 'CONFIRMED_WIN',
      region: 'Nairobi',
      isVerifiedWin: true,
      associatedEntryId: dennisWinEntry ? dennisWinEntry.id : null,
    },
    {
      userEmail: 'mercy.chebet@tcpi.co.ke',
      authorAlias: 'Mercy C. (0790***442)',
      content: 'The reveal animation is so addictive! You watch each box flip one by one. Matched 9/10 earlier today, round 2 tuko tayari!',
      category: 'PLAYER_EXPERIENCE',
      region: 'Rift Valley',
      isVerifiedWin: false,
    },
    {
      userEmail: 'brian.otieno@tcpi.co.ke',
      authorAlias: 'Brian O. (0722***877)',
      content: 'Coast in the building! Paystack deposit takes literally 3 seconds. Very transparent odds and CSPRNG audit.',
      category: 'PLAYER_EXPERIENCE',
      region: 'Coast',
      isVerifiedWin: false,
    },
    {
      userEmail: 'geoffrey.koech@tcpi.co.ke',
      authorAlias: 'Geoffrey K. (0725***811)',
      content: 'Asante sana T CPI! 50,000 received directly in my Safaricom M-PESA. Kericho town is celebrating tonight!',
      category: 'CONFIRMED_WIN',
      region: 'Rift Valley',
      isVerifiedWin: true,
      associatedEntryId: geoffreyWinEntry ? geoffreyWinEntry.id : null,
    },
    {
      userEmail: 'grace.achieng@tcpi.co.ke',
      authorAlias: 'Grace A. (0715***690)',
      content: 'Kisumu players mko wapi? Just matched 8 numbers in sequential order. Entering again right now with repeat credit.',
      category: 'PLAYER_EXPERIENCE',
      region: 'Nyanza',
      isVerifiedWin: false,
    },
    {
      userEmail: 'samuel.njoroge@tcpi.co.ke',
      authorAlias: 'Samuel N. (0728***123)',
      content: 'Suggestion: Could you add sound effects when each box turns gold? That suspense on the last box is crazy!',
      category: 'SUGGESTION',
      region: 'Central',
      isVerifiedWin: false,
    },
    {
      userEmail: 'timothy.barasa@tcpi.co.ke',
      authorAlias: 'Timothy B. (0718***992)',
      content: 'Matched 9 out of 10! Only missed #5. The fact that repeat entries only cost KSh 2 makes this fair compared to others.',
      category: 'LOSS_REPORTED',
      region: 'Western',
      isVerifiedWin: false,
    },
    {
      userEmail: 'kelvin.kiprop@tcpi.co.ke',
      authorAlias: 'Kelvin K. (0701***938)',
      content: 'Boom! 50k landed safely. Machakos winner here! Make sure your M-PESA name matches your profile name for instant payout.',
      category: 'CONFIRMED_WIN',
      region: 'Eastern',
      isVerifiedWin: true,
    },
    {
      userEmail: 'halima.hassan@tcpi.co.ke',
      authorAlias: 'Halima H. (0720***471)',
      content: 'Question: How often are the target numbers updated for new draw versions? Loving Draw #1 so far!',
      category: 'QUESTION',
      region: 'Coast',
      isVerifiedWin: false,
    },
    {
      userEmail: 'evans.ombati@tcpi.co.ke',
      authorAlias: 'Evans O. (0798***918)',
      content: 'Nimepata 9/10 mara mbili leo! Very close. The wallet system is super convenient, no need to enter PIN every single round.',
      category: 'PLAYER_EXPERIENCE',
      region: 'Nyanza',
      isVerifiedWin: false,
    },
    {
      userEmail: 'sharon.moraa@tcpi.co.ke',
      authorAlias: 'Sharon M. (0791***220)',
      content: '50k in my wallet and withdrawn to M-PESA! Nakuru ladies we are winning! Thank you T CPI admin team.',
      category: 'CONFIRMED_WIN',
      region: 'Rift Valley',
      isVerifiedWin: true,
    },
    {
      userEmail: 'peter.kamande@tcpi.co.ke',
      authorAlias: 'Peter K. (0726***771)',
      content: 'Thika road winner! 10/10 jackpot. The SHA-256 hash check confirmed my draw was generated before reveal. Solid system.',
      category: 'CONFIRMED_WIN',
      region: 'Central',
      isVerifiedWin: true,
    },
    {
      userEmail: 'judith.akinyi@tcpi.co.ke',
      authorAlias: 'Judith A. (0742***880)',
      content: 'Siaya county proud winner! Matched all 10 positions. Disbursed within 10 minutes. Good luck to everyone playing today!',
      category: 'CONFIRMED_WIN',
      region: 'Nyanza',
      isVerifiedWin: true,
    },
    {
      userEmail: 'victor.otieno@tcpi.co.ke',
      authorAlias: 'Victor O. (0744***991)',
      content: 'Just cashed out KSh 50,000 to M-PESA. Real transparency, no delays. 10/10 combination matched cleanly!',
      category: 'CONFIRMED_WIN',
      region: 'Nyanza',
      isVerifiedWin: true,
    },
    {
      userEmail: 'joan.cherono@tcpi.co.ke',
      authorAlias: 'Joan C. (0705***384)',
      content: 'Bomet people let’s go! Matched 8/10. Ready for the next attempt. KSh 2 repeat credit is a game changer.',
      category: 'PLAYER_EXPERIENCE',
      region: 'Rift Valley',
      isVerifiedWin: false,
    },
  ];

  for (const c of commentsToSeed) {
    const user = createdUsers.find((u) => u.email === c.userEmail);
    if (!user) continue;

    // Check if duplicate comment exists
    const existing = await prisma.comment.findFirst({
      where: {
        userId: user.id,
        content: c.content,
      },
    });

    if (!existing) {
      await prisma.comment.create({
        data: {
          userId: user.id,
          authorAlias: c.authorAlias,
          content: c.content,
          category: c.category,
          region: c.region,
          status: 'ACTIVE',
          isVerifiedWin: c.isVerifiedWin,
          associatedEntryId: c.associatedEntryId || null,
        },
      });
    }
  }

  console.log(`✅ Seeded ${commentsToSeed.length} authentic community comments`);

  // 6. Initial Audit Log
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
        seededPlayers: kenyanPlayersData.length,
        seededComments: commentsToSeed.length,
      }),
    },
  });

  console.log('🚀 T CPI comprehensive seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
