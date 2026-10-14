import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/prisma';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: serializeBigInt({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      balanceCents: user.wallet?.balanceCents ?? 0,
    }),
  });
}
