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

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        wallet: true,
        _count: {
          select: {
            entries: true,
            payments: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users: serializeBigInt(users),
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAuthUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { userId, action, reason, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    if (action === 'SUSPEND') {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          suspensionReason: reason || 'Administrative suspension',
        },
      });

      // Audit log
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'SUSPEND_USER',
          targetType: 'User',
          targetId: userId,
          details: JSON.stringify({ reason }),
        },
      });

      return NextResponse.json({ success: true, message: 'User suspended', user: serializeBigInt(updated) });
    } else if (action === 'REACTIVATE') {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          suspensionReason: null,
        },
      });

      // Audit log
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'REACTIVATE_USER',
          targetType: 'User',
          targetId: userId,
          details: JSON.stringify({ reason: reason || 'Account reactivated by admin' }),
        },
      });

      return NextResponse.json({ success: true, message: 'User reactivated', user: serializeBigInt(updated) });
    } else if (action === 'CHANGE_ROLE' && role) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'UPDATE_USER_ROLE',
          targetType: 'User',
          targetId: userId,
          details: JSON.stringify({ newRole: role }),
        },
      });

      return NextResponse.json({ success: true, message: 'Role updated', user: serializeBigInt(updated) });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}
