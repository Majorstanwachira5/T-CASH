import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAuthUser();
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'AUDITOR')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const claims = await prisma.prizeClaim.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        entry: {
          select: {
            entryReference: true,
            ruleVersion: true,
            generatedNumbers: true,
            matchedCount: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      claims: serializeBigInt(claims),
    });
  } catch (error) {
    console.error('Prize claims fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch claims' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAuthUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { claimId, action, payoutMethod, payoutReference, rejectionReason, notes } =
      await req.json();

    if (!claimId) {
      return NextResponse.json({ success: false, message: 'Claim ID required' }, { status: 400 });
    }

    const claim = await prisma.prizeClaim.findUnique({
      where: { id: claimId },
      include: { user: true },
    });

    if (!claim) {
      return NextResponse.json({ success: false, message: 'Claim not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const updated = await prisma.prizeClaim.update({
        where: { id: claimId },
        data: {
          status: 'APPROVED',
          approvedByAdminId: admin.id,
          approvedAt: new Date(),
          notes: notes || 'Prize claim approved after verification',
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'APPROVE_PRIZE_CLAIM',
          targetType: 'PrizeClaim',
          targetId: claimId,
          details: JSON.stringify({ claimReference: claim.claimReference, amountCents: claim.amountCents.toString() }),
        },
      });

      return NextResponse.json({ success: true, message: 'Claim approved', claim: serializeBigInt(updated) });
    } else if (action === 'RECORD_PAYOUT') {
      if (!payoutReference) {
        return NextResponse.json({ success: false, message: 'Payout reference is required' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const c = await tx.prizeClaim.update({
          where: { id: claimId },
          data: {
            status: 'PAID',
            payoutMethod: payoutMethod || 'MPESA',
            payoutReference,
            paidAt: new Date(),
            notes: notes || `Payout processed: ${payoutReference}`,
          },
        });

        // Credit to user's wallet as audited payout or record as settled external payout
        await tx.notification.create({
          data: {
            userId: claim.userId,
            title: '💸 Prize Payout Dispatched!',
            message: `Your prize of ${Number(claim.amountCents) / 100} KES has been paid via ${payoutMethod || 'MPESA'}. Reference: ${payoutReference}`,
            link: '/dashboard',
          },
        });

        await tx.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'DISPATCH_PRIZE_PAYOUT',
            targetType: 'PrizeClaim',
            targetId: claimId,
            details: JSON.stringify({ payoutReference, payoutMethod, amountCents: claim.amountCents.toString() }),
          },
        });

        return c;
      });

      return NextResponse.json({ success: true, message: 'Payout recorded', claim: serializeBigInt(updated) });
    } else if (action === 'REJECT') {
      const updated = await prisma.prizeClaim.update({
        where: { id: claimId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Failed verification checks',
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'REJECT_PRIZE_CLAIM',
          targetType: 'PrizeClaim',
          targetId: claimId,
          details: JSON.stringify({ rejectionReason }),
        },
      });

      return NextResponse.json({ success: true, message: 'Claim rejected', claim: serializeBigInt(updated) });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Prize claim update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update prize claim' }, { status: 500 });
  }
}
