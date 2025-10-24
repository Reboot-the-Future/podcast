// app/api/admin/episodes/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request); // ✅ ensure awaited
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const episode = await prisma.episode.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json(episode);
  } catch (error) {
    console.error('Error fetching episode:', error);
    return NextResponse.json({ error: 'Failed to fetch episode' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const episodeId = parseInt(params.id);

    if (body.is_hero) {
      await prisma.episode.updateMany({
        where: { is_hero: true, id: { not: episodeId } },
        data: { is_hero: false },
      });
    }

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...body,
        date_published: body.date_published
          ? new Date(body.date_published)
          : undefined,
      },
    });

    return NextResponse.json(episode);
  } catch (error: any) {
    console.error('Error updating episode:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update episode' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.episode.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Episode deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting episode:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete episode' }, { status: 500 });
  }
}
