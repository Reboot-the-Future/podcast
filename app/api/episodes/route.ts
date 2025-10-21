// app/api/episodes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tag = searchParams.get('tag');
    const status = searchParams.get('status') || 'published';

    console.log('📡 Episodes API called:', { page, limit, tag, status });

    const skip = (page - 1) * limit;

    const where: any = { status };
    
    if (tag) {
      where.tags = {
        array_contains: tag,
      };
    }

    console.log('🔍 Querying database with:', where);

    const [episodes, total] = await Promise.all([
      prisma.episode.findMany({
        where,
        orderBy: { date_published: 'desc' },
        skip,
        take: limit,
      }),
      prisma.episode.count({ where }),
    ]);

    console.log('✅ Found episodes:', episodes.length, 'Total:', total);

    const totalPages = Math.ceil(total / limit);

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
      { error: 'Failed to fetch episodes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}