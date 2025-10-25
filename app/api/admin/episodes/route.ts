import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

function isExternalHttpUrl(url?: string | null): boolean {
  if (!url) return true; // empty is allowed, validate only when provided
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

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [episodes, total] = await Promise.all([
      prisma.episode.findMany({
        orderBy: { date_published: 'desc' },
        skip,
        take: limit,
      }),
      prisma.episode.count(),
    ]);

    return NextResponse.json({
      episodes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    return NextResponse.json({ 
      error: 'Failed to fetch episodes',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      slug,
      date_published,
      excerpt,
      content,
      duration,
      tags,
      hero_image_url,
      thumb_image_url,
      audio_url,
      spotify_url,
      apple_url,
      webplayer_url,
      buzzsprout_episode_id,
      is_hero,
      status,
    } = body;

    if (!title || !slug || !date_published || !excerpt || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (is_hero) {
      await prisma.episode.updateMany({
        where: { is_hero: true },
        data: { is_hero: false },
      });
    }

    // Validate URLs if provided
    const urlFields = { hero_image_url, thumb_image_url, audio_url, spotify_url, apple_url, webplayer_url };
    for (const [key, value] of Object.entries(urlFields)) {
      if (value && !isExternalHttpUrl(String(value))) {
        return NextResponse.json(
          { error: `Invalid URL for ${key}. Must be a public http/https URL and not an internal address.` },
          { status: 400 }
        );
      }
    }

    const episode = await prisma.episode.create({
      data: {
        title,
        slug,
        date_published: new Date(date_published),
        excerpt,
        content,
        duration,
        tags: tags || [],
        hero_image_url,
        thumb_image_url,
        audio_url,
        spotify_url,
        apple_url,
        webplayer_url,
        buzzsprout_episode_id,
        is_hero: is_hero || false,
        status: status || 'draft',
      },
    });

    return NextResponse.json(episode, { status: 201 });
  } catch (error: any) {
    console.error('Error creating episode:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Episode with this slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to create episode' }, { status: 500 });
  }
}