import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import {
  generatePaymentReference,
  chargePaystackMpesa,
  formatKenyanPhone,
} from '@/lib/paystack';
import { kshToCents } from '@/lib/currency';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'Account is suspended' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { phone, amountKsh = 100, purpose = 'GAME_ENTRY', idempotencyKey } = body;

    if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid M-PESA phone number' },
        { status: 400 }
      );
    }

    const formattedPhone = formatKenyanPhone(phone);
    const amountCents = kshToCents(amountKsh);
    const reference = generatePaymentReference();

    // 1. Create Pending Payment Record in Database
    const transaction = await prisma.paymentTransaction.create({
      data: {
        reference,
        userId: user.id,
        amountCents,
        currency: 'KES',
        status: 'PENDING',
        purpose,
        idempotencyKey: idempotencyKey || `direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        metadata: JSON.stringify({
          userEmail: user.email,
          phone: formattedPhone,
          purpose,
          amountKsh,
        }),
      },
    });

    // 2. Trigger Paystack Direct M-PESA STK Push
    const chargeRes = await chargePaystackMpesa({
      email: user.email,
      phone: formattedPhone,
      amountCents,
      reference,
      metadata: {
        userId: user.id,
        transactionId: transaction.id,
        purpose,
        phone: formattedPhone,
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      status: chargeRes.data?.status || 'pay_offline',
      displayText:
        chargeRes.data?.display_text ||
        `M-PESA prompt sent to ${formattedPhone}. Please enter your PIN on your phone.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to prompt M-PESA payment';
    console.error('M-PESA charge error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
