// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit: 10 login attempts per minute per IP+email
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 2000 });
function getClientIdentifier(request: NextRequest, email?: string | null) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const safeEmail = (email || '').toLowerCase().trim().slice(0, 200);
  return `${ip}:${safeEmail}`;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Rate limit early
    try {
      await limiter.check(getClientIdentifier(request, email), 10);
    } catch {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute and try again.' }, { status: 429 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, admin.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}