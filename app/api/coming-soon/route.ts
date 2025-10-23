// app/api/coming-soon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET - Fetch coming soon section (public)
export async function GET(request: NextRequest) {
  try {
    const comingSoon = await prisma.comingSoon.findFirst({
      where: { is_visible: true },
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

// DELETE - Delete coming soon section (admin only)
export async function DELETE(request: NextRequest) {
  const auth = authenticateRequest(request);
  if (!auth) {
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

