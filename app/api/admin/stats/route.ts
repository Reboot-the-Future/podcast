import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [totalEpisodes, published, heroEpisodes, recentEpisodes] = await Promise.all([
      prisma.episode.count(),
      prisma.episode.count({ where: { status: 'published' } }),
      prisma.episode.count({ where: { is_hero: true } }),
      prisma.episode.findMany({
        orderBy: { date_published: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          date_published: true,
          is_hero: true,
          status: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalEpisodes,
      published,
      heroEpisodes,
      recentEpisodes,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
