import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const admin = await getAuthUser();
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'AUDITOR')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const payments = await prisma.paymentTransaction.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { reference: { contains: search, mode: 'insensitive' } },
                  { paystackReference: { contains: search, mode: 'insensitive' } },
                  { user: { email: { contains: search, mode: 'insensitive' } } },
                ],
              }
            : {},
          status ? { status: status as any } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        gameEntry: { select: { id: true, entryReference: true, isWinner: true } },
      },
    });

    return NextResponse.json({
      success: true,
      payments: serializeBigInt(payments),
    });
  } catch (error) {
    console.error('Admin payments fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch payments' }, { status: 500 });
  }
}
