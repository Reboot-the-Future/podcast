// app/api/admin/episodes/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

function isExternalHttpUrl(url?: string | null): boolean {
  if (!url) return true; // empty is allowed
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(request); // ✅ ensure awaited
  if (!auth || auth.role !== 'admin') {
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
  if (!auth || auth.role !== 'admin') {
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

    // Validate any URL-like fields provided on update
    const { hero_image_url, thumb_image_url, audio_url, spotify_url, apple_url, webplayer_url } = body || {};
    const urlFields = { hero_image_url, thumb_image_url, audio_url, spotify_url, apple_url, webplayer_url };
    for (const [key, value] of Object.entries(urlFields)) {
      if (value && !isExternalHttpUrl(String(value))) {
        return NextResponse.json(
          { error: `Invalid URL for ${key}. Must be a public http/https URL and not an internal address.` },
          { status: 400 }
        );
      }
    }

    // Normalize tags similarly to POST
    const normalizeTags = (value: any): string[] => {
      try {
        let arr: any[] = [];
        if (Array.isArray(value)) arr = value;
        else if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) arr = parsed; else arr = String(value).split(/[\,\u060C;，、\n]+/);
          } catch { arr = String(value).split(/[\,\u060C;，、\n]+/); }
        }
        const seen = new Set<string>();
        const out: string[] = [];
        for (const t of arr) {
          if (typeof t !== 'string') continue;
          const s = t.trim().slice(0, 50);
          const k = s.toLowerCase();
          if (s && !seen.has(k)) { seen.add(k); out.push(s); }
          if (out.length >= 20) break;
        }
        return out;
      } catch { return []; }
    };
    const safeTags = body && 'tags' in body ? normalizeTags(body.tags) : undefined;

    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...body,
        ...(safeTags ? { tags: safeTags } : {}),
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
  if (!auth || auth.role !== 'admin') {
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
