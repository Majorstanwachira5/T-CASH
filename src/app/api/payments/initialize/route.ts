import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import {
  generatePaymentReference,
  initializePaystackTransaction,
} from '@/lib/paystack';
import { paymentInitSchema } from '@/lib/validations';
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
    const parseResult = paymentInitSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amountKsh, purpose, idempotencyKey } = parseResult.data;
    const amountCents = kshToCents(amountKsh);

    // Check for existing pending transaction with same idempotency key
    const existing = await prisma.paymentTransaction.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Reusing existing initialized payment transaction',
        transaction: serializeBigInt(existing),
      });
    }

    const reference = generatePaymentReference();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
    const callbackUrl = `${appUrl}/payment/callback`;

    // 1. Create Pending Payment Record in Database
    const transaction = await prisma.paymentTransaction.create({
      data: {
        reference,
        userId: user.id,
        amountCents,
        currency: 'KES',
        status: 'PENDING',
        purpose,
        idempotencyKey,
        metadata: JSON.stringify({
          userEmail: user.email,
          purpose,
          amountKsh,
        }),
      },
    });

    // 2. Initialize Paystack Transaction
    const paystackRes = await initializePaystackTransaction({
      email: user.email,
      amountCents,
      reference,
      callbackUrl,
      metadata: {
        userId: user.id,
        transactionId: transaction.id,
        purpose,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paystackRes.data.authorization_url,
        accessCode: paystackRes.data.access_code,
        reference: transaction.reference,
        amountKsh,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    console.error('Payment initialization error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
