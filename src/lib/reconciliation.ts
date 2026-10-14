import { prisma } from './prisma';
import { verifyPaystackTransaction } from './paystack';

export interface ReconciliationResult {
  timestamp: string;
  scannedCount: number;
  resolvedSuccessCount: number;
  resolvedFailedCount: number;
  discrepanciesCount: number;
  details: Array<{
    reference: string;
    action: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
  }>;
}

/**
 * Runs an idempotent, auditable reconciliation between local database and Paystack.
 */
export async function runPaymentReconciliation(adminUserId?: string): Promise<ReconciliationResult> {
  const cutoffTime = new Date(Date.now() - 2 * 60 * 1000); // Only inspect transactions older than 2 minutes

  const pendingTransactions = await prisma.paymentTransaction.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoffTime },
    },
    take: 50,
  });

  const details: ReconciliationResult['details'] = [];
  let resolvedSuccessCount = 0;
  let resolvedFailedCount = 0;
  let discrepanciesCount = 0;

  for (const tx of pendingTransactions) {
    try {
      const paystackData = await verifyPaystackTransaction(tx.reference);

      if (paystackData.status === 'success') {
        const expectedCents = Number(tx.amountCents);
        if (paystackData.amount !== expectedCents) {
          discrepanciesCount++;
          details.push({
            reference: tx.reference,
            action: 'FLAG_DISCREPANCY',
            previousStatus: tx.status,
            newStatus: 'FAILED',
            reason: `Amount mismatch: expected ${expectedCents}, got ${paystackData.amount}`,
          });

          await prisma.paymentTransaction.update({
            where: { id: tx.id },
            data: {
              status: 'FAILED',
              rawWebhookResponse: JSON.stringify({ error: 'RECONCILIATION_AMOUNT_MISMATCH', paystackData }),
            },
          });
          continue;
        }

        // Atomically settle
        const updateResult = await prisma.$transaction(async (dbTx) => {
          const res = await dbTx.paymentTransaction.updateMany({
            where: { id: tx.id, status: 'PENDING' },
            data: {
              status: 'SUCCESS',
              paystackReference: String(paystackData.id || tx.reference),
              verifiedAt: new Date(),
              rawWebhookResponse: JSON.stringify(paystackData),
            },
          });

          if (res.count > 0 && tx.purpose === 'WALLET_DEPOSIT') {
            const wallet = await dbTx.walletAccount.findUnique({ where: { userId: tx.userId } });
            if (wallet) {
              const balanceBefore = wallet.balanceCents;
              const balanceAfter = balanceBefore + tx.amountCents;

              await dbTx.walletAccount.update({
                where: { id: wallet.id },
                data: { balanceCents: balanceAfter },
              });

              await dbTx.walletLedgerEntry.create({
                data: {
                  walletAccountId: wallet.id,
                  transactionType: 'CREDIT_DEPOSIT',
                  amountCents: tx.amountCents,
                  balanceBeforeCents: balanceBefore,
                  balanceAfterCents: balanceAfter,
                  reference: `TCPI-LEDGER-DEP-${tx.reference}`,
                  reason: `Deposit settled via auto-reconciliation: ${tx.reference}`,
                },
              });
            }
          }

          return res.count;
        });

        if (updateResult > 0) {
          resolvedSuccessCount++;
          details.push({
            reference: tx.reference,
            action: 'SETTLE_SUCCESS',
            previousStatus: 'PENDING',
            newStatus: 'SUCCESS',
            reason: 'Authoritatively confirmed by Paystack during reconciliation',
          });
        }
      } else if (paystackData.status === 'failed' || paystackData.status === 'abandoned') {
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'FAILED',
            rawWebhookResponse: JSON.stringify(paystackData),
          },
        });
        resolvedFailedCount++;
        details.push({
          reference: tx.reference,
          action: 'MARK_FAILED',
          previousStatus: 'PENDING',
          newStatus: 'FAILED',
          reason: `Provider indicated status: ${paystackData.status}`,
        });
      }
    } catch (err: unknown) {
      console.warn(`Reconciliation check failed for ref ${tx.reference}:`, err instanceof Error ? err.message : err);
    }
  }

  // Audit log the reconciliation run
  if (adminUserId && (resolvedSuccessCount > 0 || resolvedFailedCount > 0 || discrepanciesCount > 0)) {
    await prisma.adminAuditLog.create({
      data: {
        adminId: adminUserId,
        action: 'RUN_PAYMENT_RECONCILIATION',
        targetType: 'PaymentTransaction',
        details: JSON.stringify({
          scannedCount: pendingTransactions.length,
          resolvedSuccessCount,
          resolvedFailedCount,
          discrepanciesCount,
        }),
      },
    });
  }

  return {
    timestamp: new Date().toISOString(),
    scannedCount: pendingTransactions.length,
    resolvedSuccessCount,
    resolvedFailedCount,
    discrepanciesCount,
    details,
  };
}
