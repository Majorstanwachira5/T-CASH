import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'tcpi_super_secret_jwt_key_fallback_value_2026';
export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'tcpi_session';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await prisma.session.create({
    data: {
      userId,
      sessionToken: `st_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
    include: {
      user: true,
    },
  });

  const token = generateToken({
    userId: session.userId,
    email: session.user.email,
    role: session.user.role,
    sessionId: session.id,
  });

  return { session, token };
}

export async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId || !payload?.sessionId) return null;

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    if (session.user.status === 'SUSPENDED' || (session.user as any).deletedAt) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.sessionId) {
        await prisma.session.delete({ where: { id: payload.sessionId } }).catch(() => null);
      }
    }
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // Ignore error
  }
}
