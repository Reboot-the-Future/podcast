import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth) {
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
    return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth) {
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