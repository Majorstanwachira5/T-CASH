import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { formatKshPlain } from '@/lib/currency';
import { KENYAN_LIVE_ACTIVITIES } from '@/lib/live-feed-data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '30', 10)));
    const region = searchParams.get('region') || '';

    // Helper to mask phone numbers safely: +254712345678 -> 0712***678
    const maskPhone = (phone: string | null | undefined): string => {
      if (!phone) return '07** *** ***';
      const cleaned = phone.replace(/^\+254/, '0');
      if (cleaned.length >= 10) {
        return `${cleaned.slice(0, 4)}***${cleaned.slice(-3)}`;
      }
      return `${cleaned.slice(0, 3)}***`;
    };

    // Helper for privacy alias
    const maskName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return `${parts[0].slice(0, 4)}***`;
      return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
    };

    let dbItems: any[] = [];

    try {
      // 1. Fetch real game entries
      const entries = await prisma.gameEntry.findMany({
        where: {
          status: { in: ['REVEALED', 'SETTLED'] },
          isPubliclyShared: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { fullName: true, phone: true } },
          gameConfig: { select: { version: true } },
        },
      });

      // 2. Fetch comments
      const commentsWhere: any = { status: 'ACTIVE' };
      if (region && region !== 'ALL') {
        commentsWhere.region = region;
      }

      const comments = await prisma.comment.findMany({
        where: commentsWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: { select: { phone: true } },
          associatedEntry: { select: { entryReference: true, prizeAwardedCents: true } },
        },
      });

      const entryItems = entries.map((e) => {
        const alias = maskName(e.user.fullName);
        const isWin = e.isWinner;
        const prizeStr = isWin ? formatKshPlain(e.prizeAwardedCents) : null;

        return {
          id: `entry_${e.id}`,
          type: isWin ? 'VERIFIED_WIN' : e.matchedCount >= 9 ? 'NEAR_MISS' : 'OFFICIAL_RESULT',
          categoryLabel: isWin ? 'Verified Grand Prize' : e.matchedCount >= 9 ? '9/10 Near Miss' : e.matchedCount >= 7 ? 'Near Miss' : 'Official Draw Result',
          authorAlias: alias,
          maskedPhone: maskPhone(e.user.phone),
          text: isWin
            ? `Matched all 10 positions in Draw #${e.ruleVersion}! Won ${prizeStr}. Ref: ${e.entryReference}`
            : `Matched ${e.matchedCount} of 10 positions in Draw #${e.ruleVersion}. Ref: ${e.entryReference}`,
          isVerified: true,
          prizeAmount: prizeStr,
          matchedCount: e.matchedCount,
          region: null,
          timestamp: e.createdAt,
        };
      });

      const commentItems = comments.map((c) => {
        let categoryLabel = 'Player Experience';
        if (c.category === 'CONFIRMED_WIN' && c.isVerifiedWin) categoryLabel = 'Verified Grand Prize';
        else if (c.category === 'LOSS_REPORTED') categoryLabel = 'Loss Reported by Player';
        else if (c.category === 'SUGGESTION') categoryLabel = 'Player Suggestion';
        else if (c.category === 'QUESTION') categoryLabel = 'Player Question';

        return {
          id: `comment_${c.id}`,
          type: c.isVerifiedWin ? 'VERIFIED_WIN' : 'PLAYER_EXPERIENCE',
          categoryLabel,
          authorAlias: c.authorAlias,
          maskedPhone: maskPhone(c.user?.phone),
          text: c.content,
          isVerified: c.isVerifiedWin,
          prizeAmount: c.isVerifiedWin && c.associatedEntry ? formatKshPlain(c.associatedEntry.prizeAwardedCents) : null,
          matchedCount: c.isVerifiedWin ? 10 : 0,
          region: c.region,
          timestamp: c.createdAt,
        };
      });

      dbItems = [...entryItems, ...commentItems];
    } catch (dbErr) {
      console.warn('DB live feed query unreachable or empty, falling back to curated stream:', dbErr);
    }

    // Now format curated live activities with real current timestamps
    const now = Date.now();
    let curatedActivities = KENYAN_LIVE_ACTIVITIES.map((act) => ({
      id: act.id,
      type: act.type,
      categoryLabel: act.categoryLabel,
      authorAlias: act.authorAlias,
      maskedPhone: act.maskedPhone,
      text: act.text,
      isVerified: act.isVerified,
      prizeAmount: act.prizeAmount,
      matchedCount: act.matchedCount,
      region: act.region,
      town: act.town,
      timestamp: new Date(now - act.minutesAgo * 60 * 1000).toISOString(),
    }));

    if (region && region !== 'ALL') {
      curatedActivities = curatedActivities.filter((a) => a.region.toLowerCase() === region.toLowerCase());
    }

    // Combine DB items + Curated seed activities (eliminating duplicate IDs)
    const combinedMap = new Map<string, any>();
    for (const item of dbItems) {
      combinedMap.set(item.id, item);
    }
    for (const item of curatedActivities) {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }

    const combined = Array.from(combinedMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      items: serializeBigInt(combined),
      count: combined.length,
    });
  } catch (error) {
    console.error('Activity feed fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve activity feed' },
      { status: 500 }
    );
  }
}
