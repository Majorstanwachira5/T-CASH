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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { authorAlias: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true, fullName: true, status: true } },
          reports: { select: { id: true, reason: true, createdAt: true } },
          associatedEntry: { select: { entryReference: true, isWinner: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      comments: serializeBigInt(comments),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Admin comments fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAuthUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { commentId, action, moderationNotes } = await req.json();

    if (!commentId || !action) {
      return NextResponse.json({ success: false, message: 'Comment ID and action are required' }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ success: false, message: 'Comment not found' }, { status: 404 });
    }

    let newStatus: 'ACTIVE' | 'HIDDEN' = 'ACTIVE';
    if (action === 'HIDE') newStatus = 'HIDDEN';
    else if (action === 'RESTORE') newStatus = 'ACTIVE';
    else if (action === 'DELETE') {
      await prisma.comment.delete({ where: { id: commentId } });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'DELETE_COMMENT',
          targetType: 'Comment',
          targetId: commentId,
          details: JSON.stringify({ authorAlias: comment.authorAlias, snippet: comment.content.slice(0, 60) }),
        },
      });

      return NextResponse.json({ success: true, message: 'Comment permanently removed.' });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        status: newStatus,
        moderatedByAdminId: admin.id,
        moderationNotes: moderationNotes || `Status updated to ${newStatus} by admin`,
        moderatedAt: new Date(),
      },
    });

    // Record in immutable audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: `MODERATE_COMMENT_${action}`,
        targetType: 'Comment',
        targetId: commentId,
        details: JSON.stringify({
          previousStatus: comment.status,
          newStatus,
          notes: moderationNotes,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Comment status updated to ${newStatus}`,
      comment: serializeBigInt(updated),
    });
  } catch (error) {
    console.error('Admin comment moderation error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update comment status' }, { status: 500 });
  }
}
