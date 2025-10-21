// app/api/admin/settings/route.ts
// Protected admin endpoint for settings management

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get default settings
function getDefaultSettings() {
  return {
    trailer_audio_url: "",
    radio_stream_url: "",
    radio_mode: "stream",
    spotify_show_url: "",
    apple_show_url: "",
    rss_feed_url: "",
    social_twitter: "",
    social_linkedin: "",
    social_instagram: "",
    social_youtube: "",
  };
}

// GET - Fetch settings (admin only)
export async function GET(request: NextRequest) {
  // Verify authentication
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await ensureDataDir();
    
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      return NextResponse.json({ settings });
    } catch (error) {
      // File doesn't exist, return defaults
      const defaultSettings = getDefaultSettings();
      return NextResponse.json({ settings: defaultSettings });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update settings (admin only)
export async function PUT(request: NextRequest) {
  // Verify authentication
  const user = verifyToken(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await ensureDataDir();
    
    const body = await request.json();
    
    // Validate settings structure
    const validatedSettings = {
      trailer_audio_url: body.trailer_audio_url || "",
      radio_stream_url: body.radio_stream_url || "",
      radio_mode: body.radio_mode === "playlist" ? "playlist" : "stream",
      spotify_show_url: body.spotify_show_url || "",
      apple_show_url: body.apple_show_url || "",
      rss_feed_url: body.rss_feed_url || "",
      social_twitter: body.social_twitter || "",
      social_linkedin: body.social_linkedin || "",
      social_instagram: body.social_instagram || "",
      social_youtube: body.social_youtube || "",
    };

    // Save to file
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(validatedSettings, null, 2),
      'utf-8'
    );

    return NextResponse.json({
      success: true,
      settings: validatedSettings,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}