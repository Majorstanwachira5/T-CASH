import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'AUDITOR')) {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const [
      totalUsers,
      totalEntries,
      winningEntries,
      successfulPayments,
      pendingPayments,
      failedPayments,
      recentEntries,
      recentPayments,
      recentAudits,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.gameEntry.count(),
      prisma.gameEntry.count({ where: { isWinner: true } }),
      prisma.paymentTransaction.findMany({ where: { status: 'SUCCESS' } }),
      prisma.paymentTransaction.count({ where: { status: 'PENDING' } }),
      prisma.paymentTransaction.count({ where: { status: 'FAILED' } }),
      prisma.gameEntry.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.paymentTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { fullName: true, email: true } } },
      }),
    ]);

    // Financial calculations strictly in integer minor cents
    const grossCollectedCents = successfulPayments.reduce(
      (acc, tx) => acc + tx.amountCents,
      BigInt(0)
    );

    // Outstanding prize liabilities (claims with PENDING_REVIEW or APPROVED but not yet PAID)
    const pendingClaims = await prisma.prizeClaim.findMany({
      where: { status: { in: ['PENDING_REVIEW', 'APPROVED'] } },
    });
    const prizeLiabilityCents = pendingClaims.reduce(
      (acc, c) => acc + c.amountCents,
      BigInt(0)
    );

    const paidClaims = await prisma.prizeClaim.findMany({
      where: { status: 'PAID' },
    });
    const totalPrizePaidCents = paidClaims.reduce(
      (acc, c) => acc + c.amountCents,
      BigInt(0)
    );

    return NextResponse.json({
      success: true,
      stats: serializeBigInt({
        totalUsers,
        totalEntries,
        winningEntries,
        successfulPaymentsCount: successfulPayments.length,
        pendingPaymentsCount: pendingPayments,
        failedPaymentsCount: failedPayments,
        grossCollectedCents,
        prizeLiabilityCents,
        totalPrizePaidCents,
      }),
      recentEntries: serializeBigInt(recentEntries),
      recentPayments: serializeBigInt(recentPayments),
      recentAudits: serializeBigInt(recentAudits),
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch admin overview' },
      { status: 500 }
    );
  }
}
