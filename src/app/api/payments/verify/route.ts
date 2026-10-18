import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { verifyPaystackTransaction } from '@/lib/paystack';

async function handleVerification(reference: string | null | undefined) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, status: 'UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 });
    }

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json(
        { success: false, status: 'INVALID_REFERENCE', message: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    // 1. Locate Transaction in Database
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, status: 'NOT_FOUND', message: 'Transaction not found in records' },
        { status: 404 }
      );
    }

    // Security: Enforce user ownership (or Admin/Auditor role)
    if (transaction.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      return NextResponse.json(
        { success: false, status: 'FORBIDDEN', message: 'Forbidden: You do not have permission to verify this transaction' },
        { status: 403 }
      );
    }

    // Idempotency: If already verified, return cached success immediately (prevents redundant Paystack calls)
    if (transaction.status === 'SUCCESS') {
      return NextResponse.json({
        success: true,
        status: 'SUCCESS',
        message: 'Transaction already verified and settled',
        transaction: serializeBigInt(transaction),
      });
    }

    if (transaction.status === 'FAILED') {
      return NextResponse.json({
        success: false,
        status: 'FAILED',
        message: 'Transaction has failed or was cancelled',
      });
    }

    // 2. Authoritative Verification with Paystack API
    const paystackData = await verifyPaystackTransaction(reference);

    if (paystackData.status === 'failed') {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          rawWebhookResponse: JSON.stringify(paystackData),
        },
      });

      return NextResponse.json({
        success: false,
        status: 'FAILED',
        message: paystackData.gateway_response || 'Payment was cancelled or failed',
      });
    }

    if (paystackData.status !== 'success') {
      // Transaction is still pending (user is currently typing PIN on their phone)
      return NextResponse.json({
        success: false,
        status: 'PENDING',
        message: 'Waiting for customer authorization on phone',
      });
    }

    // Fraud Prevention: Strictly validate amount and currency match the recorded transaction
    const expectedAmountCents = Number(transaction.amountCents);
    if (paystackData.amount !== expectedAmountCents) {
      console.error(
        `🚨 FRAUD ALERT: Payment amount mismatch for ref ${reference}. Expected ${expectedAmountCents} cents, provider returned ${paystackData.amount} cents.`
      );
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          rawWebhookResponse: JSON.stringify({
            error: 'AMOUNT_MISMATCH',
            expected: expectedAmountCents,
            received: paystackData.amount,
            paystackData,
          }),
        },
      });

      return NextResponse.json(
        { success: false, status: 'FRAUD_DETECTED', message: 'Payment verification failed: Amount mismatch detected' },
        { status: 400 }
      );
    }

    if (paystackData.currency && paystackData.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
      return NextResponse.json(
        { success: false, status: 'CURRENCY_MISMATCH', message: 'Payment verification failed: Currency mismatch detected' },
        { status: 400 }
      );
    }

    // 3. Process Authoritative Verification within Database Transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // Atomic conditional update ensures only ONE concurrent worker can transition PENDING -> SUCCESS
      const updateResult = await tx.paymentTransaction.updateMany({
        where: { id: transaction.id, status: 'PENDING' },
        data: {
          status: 'SUCCESS',
          paystackReference: String(paystackData.id || reference),
          verifiedAt: new Date(),
          rawWebhookResponse: JSON.stringify(paystackData),
        },
      });

      if (updateResult.count === 0) {
        // Another concurrent request (e.g. webhook) already settled this payment
        return await tx.paymentTransaction.findUnique({ where: { id: transaction.id } });
      }

      // If purpose is WALLET_DEPOSIT, credit wallet and record ledger entry
      if (transaction.purpose === 'WALLET_DEPOSIT') {
        const wallet = await tx.walletAccount.findUnique({
          where: { userId: transaction.userId },
        });

        if (wallet) {
          const balanceBefore = wallet.balanceCents;
          const balanceAfter = balanceBefore + transaction.amountCents;

          await tx.walletAccount.update({
            where: { id: wallet.id },
            data: { balanceCents: balanceAfter },
          });

          await tx.walletLedgerEntry.create({
            data: {
              walletAccountId: wallet.id,
              transactionType: 'CREDIT_DEPOSIT',
              amountCents: transaction.amountCents,
              balanceBeforeCents: balanceBefore,
              balanceAfterCents: balanceAfter,
              reference: `TCPI-LEDGER-DEP-${reference}`,
              reason: `Verified deposit via Paystack ref: ${reference}`,
            },
          });
        }
      }

      return await tx.paymentTransaction.findUnique({ where: { id: transaction.id } });
    });

    return NextResponse.json({
      success: true,
      status: 'SUCCESS',
      message: 'Payment verified and authorized successfully',
      transaction: serializeBigInt(updatedTransaction),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, status: 'ERROR', message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference');
  return handleVerification(reference);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return handleVerification(body?.reference);
  } catch {
    return handleVerification(null);
  }
}
