import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import {
  generateCryptographicNumbers,
  evaluateDraw,
  generateEntryReference,
} from '@/lib/gameEngine';
import { gamePlaySchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to enter game' },
        { status: 401 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, message: 'Your account is suspended and cannot submit entries' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = gamePlaySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentMethod, paymentReference, idempotencyKey } = parseResult.data;

    // 1. Idempotency Check: Prevent duplicate submissions
    const existingEntry = await prisma.gameEntry.findUnique({
      where: { idempotencyKey },
      include: {
        gameConfig: true,
      },
    });

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        message: 'Returning existing authorized entry (idempotent)',
        entry: serializeBigInt({
          entryReference: existingEntry.entryReference,
          generatedNumbers: JSON.parse(existingEntry.generatedNumbers),
          matchedPositions: JSON.parse(existingEntry.matchedPositions),
          matchedCount: existingEntry.matchedCount,
          isWinner: existingEntry.isWinner,
          prizeAwardedCents: existingEntry.prizeAwardedCents,
          ruleVersion: existingEntry.ruleVersion,
          createdAt: existingEntry.createdAt,
        }),
      });
    }

    // 2. Fetch Active Game Configuration
    const gameConfig = await prisma.gameConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!gameConfig) {
      return NextResponse.json(
        { success: false, message: 'No active game configuration available' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // 3. Process Authoritative Entry within a Strict Database Transaction
    const entryResult = await prisma.$transaction(async (tx) => {
      let costCents = gameConfig.entryPriceCents;
      let associatedPaymentTxId: string | null = null;

      if (paymentMethod === 'PAYSTACK') {
        if (!paymentReference) {
          throw new Error('Payment reference is required for Paystack payments');
        }

        // Verify that payment transaction exists, belongs to this user, is successful, and not already used
        const paymentTx = await tx.paymentTransaction.findUnique({
          where: { reference: paymentReference },
          include: { gameEntry: true },
        });

        if (!paymentTx) {
          throw new Error('Payment transaction record not found');
        }

        if (paymentTx.userId !== user.id) {
          throw new Error('Payment transaction belongs to another account');
        }

        if (paymentTx.status !== 'SUCCESS') {
          throw new Error('Payment transaction has not been authoritatively confirmed as successful');
        }

        if (paymentTx.gameEntry) {
          throw new Error('This payment transaction has already been used for an authorized entry');
        }

        associatedPaymentTxId = paymentTx.id;
      } else if (paymentMethod === 'WALLET' || paymentMethod === 'REPEAT_CREDIT') {
        // Check if repeat credit policy applies
        if (paymentMethod === 'REPEAT_CREDIT') {
          // Check if user has an existing entry in this config
          const pastEntriesCount = await tx.gameEntry.count({
            where: { userId: user.id, gameConfigId: gameConfig.id },
          });

          if (pastEntriesCount === 0) {
            throw new Error('Repeat credit pricing is only available after an initial standard entry');
          }
          costCents = gameConfig.repeatCreditCents;
        }

        const wallet = await tx.walletAccount.findUnique({
          where: { userId: user.id },
        });

        if (!wallet || wallet.balanceCents < costCents) {
          throw new Error(
            `Insufficient wallet balance. Required: ${Number(costCents) / 100} KES, Available: ${
              wallet ? Number(wallet.balanceCents) / 100 : 0
            } KES`
          );
        }

        const balanceBefore = wallet.balanceCents;
        const balanceAfter = balanceBefore - costCents;

        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: { balanceCents: balanceAfter },
        });

        const ledgerRef = `TCPI-LEDGER-DEBIT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await tx.walletLedgerEntry.create({
          data: {
            walletAccountId: wallet.id,
            transactionType:
              paymentMethod === 'REPEAT_CREDIT'
                ? 'DEBIT_REPEAT_CREDIT'
                : 'DEBIT_ENTRY_FEE',
            amountCents: costCents,
            balanceBeforeCents: balanceBefore,
            balanceAfterCents: balanceAfter,
            reference: ledgerRef,
            reason:
              paymentMethod === 'REPEAT_CREDIT'
                ? `Authorized repeat game entry fee for Draw #${gameConfig.version}`
                : `Authorized standard game entry fee for Draw #${gameConfig.version}`,
          },
        });
      } else {
        throw new Error('Invalid payment method selected');
      }

      // 4. Cryptographically Secure Server-Side Draw Execution
      const { numbers: generatedNumbers, entropySeedHash } =
        generateCryptographicNumbers(
          gameConfig.totalPositions,
          gameConfig.numberMin,
          gameConfig.numberMax,
          gameConfig.isUniqueRequired
        );

      // 5. Evaluate Matches Against Authoritative Target Configuration
      const { matchedIndices, matchedCount, isWinner, prizeAmountCents } =
        evaluateDraw(generatedNumbers, gameConfig);

      const entryReference = generateEntryReference();

      // 6. Persist Authoritative Game Entry
      const entry = await tx.gameEntry.create({
        data: {
          entryReference,
          userId: user.id,
          gameConfigId: gameConfig.id,
          ruleVersion: gameConfig.version,
          generatedNumbers: JSON.stringify(generatedNumbers),
          matchedCount,
          matchedPositions: JSON.stringify(matchedIndices),
          isWinner,
          prizeAwardedCents: prizeAmountCents,
          status: 'REVEALED',
          paymentTransactionId: associatedPaymentTxId,
          entropySeedHash,
          idempotencyKey,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // 7. Store Audit Result Snapshot
      await tx.gameResult.create({
        data: {
          entryId: entry.id,
          targetNumbersSnapshot: gameConfig.targetNumbers,
          userNumbersSnapshot: JSON.stringify(generatedNumbers),
          matchedIndices: JSON.stringify(matchedIndices),
        },
      });

      // 8. If winning entry, create Prize Claim for review & payout
      if (isWinner && prizeAmountCents > BigInt(0)) {
        const claimReference = `TCPI-CLM-${Date.now().toString(36).toUpperCase()}`;
        await tx.prizeClaim.create({
          data: {
            claimReference,
            entryId: entry.id,
            userId: user.id,
            amountCents: prizeAmountCents,
            status: 'PENDING_REVIEW',
            notes: `Qualifying 10-of-10 match for Draw #${gameConfig.version}`,
          },
        });

        // Create user notification
        await tx.notification.create({
          data: {
            userId: user.id,
            title: '🎉 CONGRATULATIONS! Qualifying 10-of-10 Match!',
            message: `You matched all 10 target numbers in Draw #${gameConfig.version}! Claim Ref: ${claimReference}. Prize of ${
              Number(prizeAmountCents) / 100
            } KES is awaiting verification.`,
            link: '/dashboard',
          },
        });
      }

      return {
        entry,
        generatedNumbers,
        matchedIndices,
        matchedCount,
        isWinner,
        prizeAmountCents,
        targetNumbers: JSON.parse(gameConfig.targetNumbers),
      };
    });

    return NextResponse.json({
      success: true,
      message: entryResult.isWinner
        ? '🎉 Congratulations! You achieved a qualifying match!'
        : 'Entry completed and verified.',
      entry: serializeBigInt({
        entryReference: entryResult.entry.entryReference,
        generatedNumbers: entryResult.generatedNumbers,
        targetNumbers: entryResult.targetNumbers,
        matchedIndices: entryResult.matchedIndices,
        matchedCount: entryResult.matchedCount,
        isWinner: entryResult.isWinner,
        prizeAwardedCents: entryResult.prizeAmountCents,
        ruleVersion: entryResult.entry.ruleVersion,
        createdAt: entryResult.entry.createdAt,
      }),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to authorize game entry';
    console.error('Game play error:', error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
