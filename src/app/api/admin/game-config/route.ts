import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { updateGameConfigSchema } from '@/lib/validations';
import { kshToCents } from '@/lib/currency';

export async function GET() {
  try {
    const admin = await getAuthUser();
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'AUDITOR')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const configs = await prisma.gameConfig.findMany({
      orderBy: { version: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
    });

    const formatted = configs.map((c) => ({
      ...c,
      targetNumbers: JSON.parse(c.targetNumbers),
    }));

    return NextResponse.json({ success: true, configs: serializeBigInt(formatted) });
  } catch (error) {
    console.error('Admin game config fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAuthUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = updateGameConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Validate number ranges
    for (const n of data.targetNumbers) {
      if (n < data.numberMin || n > data.numberMax) {
        return NextResponse.json(
          {
            success: false,
            message: `Target number ${n} is outside allowed range (${data.numberMin} - ${data.numberMax})`,
          },
          { status: 400 }
        );
      }
    }

    if (data.isUniqueRequired) {
      const set = new Set(data.targetNumbers);
      if (set.size !== data.targetNumbers.length) {
        return NextResponse.json(
          { success: false, message: 'Target numbers must all be unique when unique rule is enabled' },
          { status: 400 }
        );
      }
    }

    // Get current max version
    const latest = await prisma.gameConfig.findFirst({
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version || 0) + 1;

    // If new config is active, deactivate others
    if (data.isActive) {
      await prisma.gameConfig.updateMany({
        data: { isActive: false },
      });
    }

    const created = await prisma.gameConfig.create({
      data: {
        version: nextVersion,
        name: data.name,
        description: data.description,
        entryPriceCents: kshToCents(data.entryPriceKsh),
        repeatCreditCents: kshToCents(data.repeatCreditKsh),
        prizeAmountCents: kshToCents(data.prizeAmountKsh),
        totalPositions: 10,
        numberMin: data.numberMin,
        numberMax: data.numberMax,
        isUniqueRequired: data.isUniqueRequired,
        targetNumbers: JSON.stringify(data.targetNumbers),
        isPublished: data.isPublished,
        isActive: data.isActive,
        publishedAt: data.isPublished ? new Date() : null,
        createdByAdminId: admin.id,
      },
    });

    // Record immutable audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'PUBLISH_GAME_CONFIG',
        targetType: 'GameConfig',
        targetId: created.id,
        details: JSON.stringify({
          version: nextVersion,
          targetNumbers: data.targetNumbers,
          entryPriceKsh: data.entryPriceKsh,
          prizeAmountKsh: data.prizeAmountKsh,
          isPublished: data.isPublished,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Game Draw #${nextVersion} created and configured successfully`,
      config: serializeBigInt({
        ...created,
        targetNumbers: data.targetNumbers,
      }),
    });
  } catch (error) {
    console.error('Game config update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create config' }, { status: 500 });
  }
}
