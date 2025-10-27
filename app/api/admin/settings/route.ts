// app/api/admin/settings/route.ts
// Protected admin endpoint for trailer settings management

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

function isValidTrailerUrl(url: string): boolean {
  // Allow empty string (to remove trailer)
  if (!url || url.trim() === '') return true;
  
  // Allow relative URLs (e.g., /uploads/trailer.mp3)
  if (url.startsWith('/')) return true;
  
  // Validate absolute http/https URLs
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const hostname = u.hostname.toLowerCase();
    if (process.env.NODE_ENV === 'production') {
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (blockedHosts.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// GET - Fetch trailer settings (admin only)
export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const trailer = await prisma.trailer.findFirst({
      orderBy: { created_at: 'desc' },
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

// PUT - Update trailer settings (admin only)
export async function PUT(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { trailer_audio_url } = body;

    if (trailer_audio_url === undefined || trailer_audio_url === null) {
      return NextResponse.json(
        { error: 'Missing trailer_audio_url' },
        { status: 400 }
      );
    }

    if (trailer_audio_url && !isValidTrailerUrl(trailer_audio_url)) {
      return NextResponse.json(
        { error: 'Invalid trailer_audio_url. Must be a public http/https URL or a relative path (e.g., /uploads/file.mp3).' },
        { status: 400 }
      );
    }

    const existingTrailer = await prisma.trailer.findFirst({
      orderBy: { created_at: 'desc' },
    });

    let trailer;
    if (existingTrailer) {
      trailer = await prisma.trailer.update({
        where: { id: existingTrailer.id },
        data: { audio_url: trailer_audio_url },
      });
    } else {
      trailer = await prisma.trailer.create({
        data: { audio_url: trailer_audio_url },
      });
    }

    return NextResponse.json({
      success: true,
      trailer_audio_url: trailer.audio_url,
    });
  } catch (error) {
    console.error('Error saving trailer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save trailer', details: errorMessage },
      { status: 500 }
    );
  }
}