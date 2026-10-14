import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  await deleteSession();
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  return response;
}
