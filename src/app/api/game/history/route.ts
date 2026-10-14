import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const entries = await prisma.gameEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        gameConfig: {
          select: {
            version: true,
            name: true,
            targetNumbers: true,
            prizeAmountCents: true,
          },
        },
        prizeClaim: {
          select: {
            claimReference: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    const formatted = entries.map((e) => ({
      id: e.id,
      entryReference: e.entryReference,
      ruleVersion: e.ruleVersion,
      gameName: e.gameConfig.name,
      targetNumbers: JSON.parse(e.gameConfig.targetNumbers),
      generatedNumbers: JSON.parse(e.generatedNumbers),
      matchedPositions: JSON.parse(e.matchedPositions),
      matchedCount: e.matchedCount,
      isWinner: e.isWinner,
      prizeAwardedCents: e.prizeAwardedCents,
      status: e.status,
      entropySeedHash: e.entropySeedHash,
      createdAt: e.createdAt,
      prizeClaim: e.prizeClaim,
    }));

    return NextResponse.json({
      success: true,
      entries: serializeBigInt(formatted),
    });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve entry history' },
      { status: 500 }
    );
  }
}
