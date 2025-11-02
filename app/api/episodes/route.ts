// app/api/episodes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Enforce safe pagination bounds
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const MAX_LIMIT = 100;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : 10;

    const tag = searchParams.get('tag');

    // Public endpoint must only return published episodes available now
    const where: any = {
      status: 'published',
      date_published: { lte: new Date() },
    };

    if (tag && typeof tag === 'string') {
      // Basic sanity check for tag length
      const safeTag = tag.trim().slice(0, 50);
      if (safeTag) {
        where.tags = { array_contains: safeTag };
      }
    }

    const skip = (page - 1) * limit;

    const [episodes, total] = await Promise.all([
      prisma.episode.findMany({
        where,
        orderBy: { date_published: 'desc' },
        skip,
        take: limit,
      }),
      prisma.episode.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      episodes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}