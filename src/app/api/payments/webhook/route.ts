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
    const eventType = event.event || 'unknown';
    const reference = event.data?.reference;
    // Deterministic eventId: NEVER uses Date.now() so webhook retries are properly recognized
    const eventId = String(event.id || `${eventType}_${reference || 'unknown'}`);

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
        // Record event idempotently
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

        // Locate existing payment transaction
        const paymentTx = await tx.paymentTransaction.findUnique({
          where: { reference },
        });

        if (paymentTx && paymentTx.status === 'PENDING') {
          // Fraud Prevention: Validate expected amount and currency
          const expectedAmountCents = Number(paymentTx.amountCents);
          const receivedAmountCents = Number(event.data?.amount);

          if (receivedAmountCents !== expectedAmountCents) {
            console.error(
              `🚨 WEBHOOK FRAUD ALERT: Amount mismatch on ref ${reference}. Expected ${expectedAmountCents}, received ${receivedAmountCents}`
            );
            await tx.paymentTransaction.update({
              where: { id: paymentTx.id },
              data: {
                status: 'FAILED',
                rawWebhookResponse: rawBody,
              },
            });
            return;
          }

          if (event.data?.currency && event.data.currency.toUpperCase() !== paymentTx.currency.toUpperCase()) {
            console.error(`🚨 WEBHOOK ALERT: Currency mismatch on ref ${reference}.`);
            return;
          }

          // Atomic conditional update ensures only ONE concurrent worker can transition PENDING -> SUCCESS
          const updateResult = await tx.paymentTransaction.updateMany({
            where: { id: paymentTx.id, status: 'PENDING' },
            data: {
              status: 'SUCCESS',
              paystackReference: String(event.data?.id || reference),
              verifiedAt: new Date(),
              rawWebhookResponse: rawBody,
            },
          });

          if (updateResult.count === 0) {
            // Already settled concurrently by user callback
            return;
          }

          // If deposit, credit wallet and record ledger entry with harmonized deterministic reference
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

              // Harmonized reference matches verify route: TCPI-LEDGER-DEP-${reference}
              await tx.walletLedgerEntry.create({
                data: {
                  walletAccountId: wallet.id,
                  transactionType: 'CREDIT_DEPOSIT',
                  amountCents: paymentTx.amountCents,
                  balanceBeforeCents: balanceBefore,
                  balanceAfterCents: balanceAfter,
                  reference: `TCPI-LEDGER-DEP-${reference}`,
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
