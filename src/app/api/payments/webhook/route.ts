import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/paystack';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-paystack-signature') || '';
    const rawBody = await req.text();

    // 1. Signature Verification
    // In mock mode or dev without secret, allow testing; in production, enforce strictly.
    const isVerified =
      process.env.PAYSTACK_MOCK_MODE === 'true' ||
      verifyWebhookSignature(rawBody, signature);

    if (!isVerified) {
      console.warn('⚠️ Rejected unauthorized webhook with invalid signature');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = String(event.id || `${event.event}_${event.data?.reference || Date.now()}`);
    const eventType = event.event || 'unknown';
    const reference = event.data?.reference;

    // 2. Idempotency Check in PaymentWebhookEvent
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.isProcessed) {
      return NextResponse.json({ message: 'Event already processed' }, { status: 200 });
    }

    // 3. Process Charge Success Event
    if (eventType === 'charge.success' && reference) {
      await prisma.$transaction(async (tx) => {
        // Record event
        await tx.paymentWebhookEvent.upsert({
          where: { eventId },
          update: { isProcessed: true },
          create: {
            eventId,
            eventType,
            reference,
            signature,
            payload: rawBody,
            isProcessed: true,
          },
        });

        // Update payment transaction if not yet marked as SUCCESS
        const paymentTx = await tx.paymentTransaction.findUnique({
          where: { reference },
        });

        if (paymentTx && paymentTx.status !== 'SUCCESS') {
          await tx.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: {
              status: 'SUCCESS',
              paystackReference: String(event.data?.id || reference),
              verifiedAt: new Date(),
              rawWebhookResponse: rawBody,
            },
          });

          // If deposit, credit wallet
          if (paymentTx.purpose === 'WALLET_DEPOSIT') {
            const wallet = await tx.walletAccount.findUnique({
              where: { userId: paymentTx.userId },
            });

            if (wallet) {
              const balanceBefore = wallet.balanceCents;
              const balanceAfter = balanceBefore + paymentTx.amountCents;

              await tx.walletAccount.update({
                where: { id: wallet.id },
                data: { balanceCents: balanceAfter },
              });

              await tx.walletLedgerEntry.create({
                data: {
                  walletAccountId: wallet.id,
                  transactionType: 'CREDIT_DEPOSIT',
                  amountCents: paymentTx.amountCents,
                  balanceBeforeCents: balanceBefore,
                  balanceAfterCents: balanceAfter,
                  reference: `TCPI-WH-DEP-${reference}`,
                  reason: `Deposit settled via webhook: ${reference}`,
                },
              });
            }
          }
        }
      });
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { message: 'Webhook processing error' },
      { status: 500 }
    );
  }
}
