import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { formatKshPlain } from '@/lib/currency';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(40, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
    const region = searchParams.get('region') || '';

    // Fetch real game entries (authorized draws)
    const entries = await prisma.gameEntry.findMany({
      where: {
        status: { in: ['REVEALED', 'SETTLED'] },
        isPubliclyShared: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { fullName: true } },
        gameConfig: { select: { version: true } },
      },
    });

    // Fetch genuine player comments
    const commentsWhere: any = { status: 'ACTIVE' };
    if (region && region !== 'ALL') {
      commentsWhere.region = region;
    }

    const comments = await prisma.comment.findMany({
      where: commentsWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        associatedEntry: { select: { entryReference: true, prizeAwardedCents: true } },
      },
    });

    // Helper for privacy alias
    const maskName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return `${parts[0].slice(0, 4)}***`;
      return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
    };

    // Transform entries into uniform activity feed items
    const entryItems = entries.map((e) => {
      const alias = maskName(e.user.fullName);
      const isWin = e.isWinner;
      const prizeStr = isWin ? formatKshPlain(e.prizeAwardedCents) : null;

      return {
        id: `entry_${e.id}`,
        type: isWin ? 'VERIFIED_WIN' : 'OFFICIAL_RESULT',
        categoryLabel: isWin ? 'Verified Win' : e.matchedCount >= 7 ? 'Near Miss' : 'Official Draw Result',
        authorAlias: alias,
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

    // Transform comments into uniform activity feed items
    const commentItems = comments.map((c) => {
      let categoryLabel = 'Player Experience';
      if (c.category === 'CONFIRMED_WIN' && c.isVerifiedWin) categoryLabel = 'Verified Win';
      else if (c.category === 'LOSS_REPORTED') categoryLabel = 'Loss Reported by Player';
      else if (c.category === 'SUGGESTION') categoryLabel = 'Player Suggestion';
      else if (c.category === 'QUESTION') categoryLabel = 'Player Question';

      return {
        id: `comment_${c.id}`,
        type: c.isVerifiedWin ? 'VERIFIED_WIN' : 'PLAYER_EXPERIENCE',
        categoryLabel,
        authorAlias: c.authorAlias,
        text: c.content,
        isVerified: c.isVerifiedWin,
        prizeAmount: c.isVerifiedWin && c.associatedEntry ? formatKshPlain(c.associatedEntry.prizeAwardedCents) : null,
        region: c.region,
        timestamp: c.createdAt,
      };
    });

    // Combine and sort chronologically (most recent first)
    const combined = [...entryItems, ...commentItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      items: serializeBigInt(combined),
    });
  } catch (error) {
    console.error('Activity feed fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve activity feed' },
      { status: 500 }
    );
  }
}
