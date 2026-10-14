import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await prisma.gameConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, message: 'No active game configuration found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config: serializeBigInt({
        id: config.id,
        version: config.version,
        name: config.name,
        description: config.description,
        entryPriceCents: config.entryPriceCents,
        repeatCreditCents: config.repeatCreditCents,
        prizeAmountCents: config.prizeAmountCents,
        totalPositions: config.totalPositions,
        numberMin: config.numberMin,
        numberMax: config.numberMax,
        isUniqueRequired: config.isUniqueRequired,
        isPublished: config.isPublished,
        targetNumbers: config.isPublished ? JSON.parse(config.targetNumbers) : null,
        publishedAt: config.publishedAt,
      }),
    });
  } catch (error) {
    console.error('Error fetching game config:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve game configuration' },
      { status: 500 }
    );
  }
}
