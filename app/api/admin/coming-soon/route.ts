// app/api/admin/coming-soon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET - Fetch coming soon section (admin only)
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const comingSoon = await prisma.comingSoon.findFirst({
      orderBy: { updated_at: 'desc' }
    });

    return NextResponse.json({ comingSoon });
  } catch (error) {
    console.error('Error fetching coming soon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coming soon section' },
      { status: 500 }
    );
  }
}

// POST/PUT - Create or update coming soon section (admin only)
export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
  const body = await request.json();
    
    const { title, description, is_visible } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check if coming soon section already exists
    const existing = await prisma.comingSoon.findFirst();
    
    let comingSoon;
    if (existing) {
      // Update existing
      comingSoon = await prisma.comingSoon.update({
        where: { id: existing.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          is_visible: Boolean(is_visible),
        }
      });
    } else {
      // Create new
      comingSoon = await prisma.comingSoon.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          is_visible: Boolean(is_visible),
        }
      });
    }
    return NextResponse.json({ comingSoon });
  } catch (error) {
    console.error('Coming Soon API: Error saving coming soon:', error);
    return NextResponse.json(
      { error: 'Failed to save coming soon section' },
      { status: 500 }
    );
  }
}

// DELETE - Delete coming soon section (admin only)
export async function DELETE(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.comingSoon.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting coming soon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coming soon section' },
      { status: 500 }
    );
  }
}
