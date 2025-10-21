// app/api/settings/public/route.ts
// Public endpoint to fetch settings (no auth required)

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
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

export async function GET(request: NextRequest) {
  try {
    await ensureDataDir();
    
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      
      // Return public settings only
      return NextResponse.json({
        trailer_audio_url: settings.trailer_audio_url || "",
        radio_stream_url: settings.radio_stream_url || "",
        radio_mode: settings.radio_mode || "stream",
        spotify_show_url: settings.spotify_show_url || "",
        apple_show_url: settings.apple_show_url || "",
        rss_feed_url: settings.rss_feed_url || "",
        social_twitter: settings.social_twitter || "",
        social_linkedin: settings.social_linkedin || "",
        social_instagram: settings.social_instagram || "",
        social_youtube: settings.social_youtube || "",
      });
    } catch (error) {
      // File doesn't exist, return defaults
      return NextResponse.json(getDefaultSettings());
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}