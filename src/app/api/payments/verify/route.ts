import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { verifyPaystackTransaction } from '@/lib/paystack';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { reference } = await req.json();
    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    // 1. Locate Transaction in Database
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found in records' },
        { status: 404 }
      );
    }

    // Idempotency: If already verified, return cached success
    if (transaction.status === 'SUCCESS') {
      return NextResponse.json({
        success: true,
        message: 'Transaction already verified and settled',
        transaction: serializeBigInt(transaction),
      });
    }

    // 2. Authoritative Verification with Paystack API
    const paystackData = await verifyPaystackTransaction(reference);

    if (paystackData.status !== 'success') {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          rawWebhookResponse: JSON.stringify(paystackData),
        },
      });

      return NextResponse.json(
        { success: false, message: 'Payment provider indicated transaction failed' },
        { status: 400 }
      );
    }

    // 3. Process Authoritative Verification within Database Transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const settledTx = await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          paystackReference: String(paystackData.id || reference),
          verifiedAt: new Date(),
          rawWebhookResponse: JSON.stringify(paystackData),
        },
      });

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

      return settledTx;
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and authorized successfully',
      transaction: serializeBigInt(updatedTransaction),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
