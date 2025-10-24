// app/api/settings/public/route.ts
// Public endpoint to fetch trailer (no auth required)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const trailer = await prisma.trailer.findFirst({
      orderBy: { created_at: 'desc' },
      select: { audio_url: true },
    });

    return NextResponse.json({
      trailer_audio_url: trailer?.audio_url || '',
    });
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trailer' },
      { status: 500 }
    );
  }
}