import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { writeFile } from 'fs/promises';
import { authenticateRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Simple rate limiter: 10 requests/min per IP for uploads
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 1000 });
function getClientIdentifier(request: NextRequest) {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
  return `${sanitized}-${timestamp}-${randomStr}${ext}`;
}

export async function POST(request: NextRequest) {
  // Rate limit
  try {
    await limiter.check(getClientIdentifier(request), 10);
  } catch {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Verify authentication
  const user = authenticateRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await ensureUploadDir();

    const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = (formData.get('type') as string) || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type: only allow audio uploads
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/aac',
      'audio/flac'
    ];
    const allowedExt = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
    if (!allowedTypes.includes(file.type) && !allowedExt.test(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP3, WAV, OGG, or M4A are allowed.' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate filename and save
    const filename = generateFilename(file.name);
    const filepath = path.join(UPLOAD_DIR, filename);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Optional: DELETE endpoint to remove uploaded files
export async function DELETE(request: NextRequest) {
  // Verify authentication
  const user = authenticateRequest(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename required' },
        { status: 400 }
      );
    }

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filepath = path.join(UPLOAD_DIR, safeName);

    try {
      await fs.unlink(filepath);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}