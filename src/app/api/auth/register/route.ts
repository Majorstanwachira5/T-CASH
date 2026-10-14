import { NextResponse } from 'next/server';
import { prisma, serializeBigInt } from '@/lib/prisma';
import { hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    const rateCheck = checkRateLimit(`register_${ipAddress ?? 'unknown-ip'}`, { limit: 5, windowSeconds: 60 });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, fullName, phone, password } = parseResult.data;

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email or phone number already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and wallet in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          fullName,
          phone: phone || null,
          passwordHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      });

      // Initialize wallet account (with 0 initial balance, or bonus if promotional)
      await tx.walletAccount.create({
        data: {
          userId: user.id,
          balanceCents: BigInt(0),
          currency: 'KES',
        },
      });

      return user;
    });

    // Create session
    const { token } = await createSession(newUser.id, userAgent, ipAddress);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: serializeBigInt({
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      }),
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred during registration' },
      { status: 500 }
    );
  }
}
