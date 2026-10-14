import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await prisma.walletAccount.findUnique({
      where: { userId: user.id },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    const payments = await prisma.paymentTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      balanceCents: wallet?.balanceCents ? wallet.balanceCents.toString() : '0',
      currency: wallet?.currency || 'KES',
      ledger: serializeBigInt(wallet?.ledgerEntries || []),
      recentPayments: serializeBigInt(payments),
    });
  } catch (error) {
    console.error('Wallet transactions fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wallet transactions' },
      { status: 500 }
    );
  }
}
