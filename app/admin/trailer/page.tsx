"use client";

import { useState, useEffect } from "react";
import {
  Save, Upload, Music,
  CheckCircle, AlertCircle
} from "lucide-react";

interface Settings {
  trailer_audio_url: string;
}

interface Alert {
  type: 'success' | 'error';
  message: string;
}

const ALERT_DURATION = 4000;

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({
    trailer_audio_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    document.title = "Trailer › Reboot Admin";
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  const showAlert = (type: Alert['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), ALERT_DURATION);
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch settings' }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      // Handle both possible response structures
      const trailerUrl = data.trailer_audio_url || data.settings?.trailer_audio_url || "";
      setSettings({ trailer_audio_url: trailerUrl });
    } catch (error) {
      console.error("Error fetching settings:", error);
      showAlert('error', error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio');

      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setSettings({ trailer_audio_url: data.url });
      showAlert('success', 'Trailer uploaded successfully! Click Save to apply.');
    } catch (error) {
      console.error('Error uploading file:', error);
      showAlert('error', error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error('No authentication token found');
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save' }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const message = settings.trailer_audio_url.trim()
        ? 'Trailer settings saved successfully!'
        : 'Trailer removed successfully!';
      showAlert('success', message);

      // Refresh settings to confirm save
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      showAlert('error', error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const AlertComponent = ({ alert }: { alert: Alert }) => {
    const config = {
      success: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/50',
        text: 'text-green-400',
        icon: CheckCircle
      },
      error: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/50',
        text: 'text-red-400',
        icon: AlertCircle
      },
    };

    const { bg, border, text, icon: Icon } = config[alert.type];

    return (
      <div className={`fixed top-4 right-4 z-[100] ${bg} ${border} border rounded-xl p-4 shadow-2xl min-w-[300px] max-w-md animate-in slide-in-from-top-5 fade-in duration-300`}>
        <div className="flex items-start gap-3">
          <Icon className={`${text} flex-shrink-0 mt-0.5`} size={20} />
          <p className={`${text} font-semibold text-sm flex-1`}>{alert.message}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ffa9fc]/30 border-t-[#ffa9fc] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20 max-w-2xl mx-auto">
      {alert && <AlertComponent alert={alert} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Podcast Trailer
          </h1>
          <p className="text-gray-400">Upload and manage your podcast trailer audio</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-8 py-3 bg-gradient-to-r from-[#ffa9fc] to-[#ff8df7] hover:from-[#ff8df7] hover:to-[#ffa9fc] text-[#0f1c1c] rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ffa9fc]/20 whitespace-nowrap"
        >
          <Save size={20} />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Trailer Section */}
      <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl border border-[#2a3838] p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-4 bg-[#ffa9fc]/10 rounded-xl">
            <Music size={28} className="text-[#ffa9fc]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Upload Trailer</h2>
            <p className="text-sm text-gray-400">Optional: Add audio to play on the homepage</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300">
              Trailer Audio URL <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={settings.trailer_audio_url}
                onChange={(e) => setSettings({ trailer_audio_url: e.target.value })}
                className="flex-1 px-4 py-3 bg-[#0f1c1c] border border-[#2a3838] rounded-xl focus:outline-none focus:border-[#ffa9fc] focus:ring-2 focus:ring-[#ffa9fc]/20 transition-all text-white placeholder:text-gray-600"
                placeholder="Paste URL or upload file below..."
                disabled={uploading || saving}
              />
              <label className={`px-6 py-3 bg-[#ffa9fc]/20 hover:bg-[#ffa9fc]/30 rounded-xl cursor-pointer flex items-center gap-2 font-semibold transition-all border border-[#ffa9fc]/30 text-white hover:text-white whitespace-nowrap ${(uploading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload size={18} />
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  disabled={uploading || saving}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleFileUpload(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {settings.trailer_audio_url && (
                <button
                  type="button"
                  onClick={() => setSettings({ trailer_audio_url: "" })}
                  disabled={uploading || saving}
                  className="px-4 py-3 bg-[#2a3838] hover:bg-[#3a4848] text-white rounded-xl font-semibold transition-all whitespace-nowrap disabled:opacity-50"
                  title="Clear trailer URL"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Supported formats: MP3, WAV, AAC, FLAC</p>
          </div>

          {settings.trailer_audio_url && (
            <div className="space-y-3">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-green-400" />
                  <p className="text-sm text-green-400 font-semibold">Trailer audio is ready</p>
                </div>
              </div>
              <div className="p-4 bg-[#0f1c1c] rounded-xl border border-[#2a3838]">
                {/* Hint native controls to use dark styling and keep it compact */}
                <audio
                  controls
                  className="w-full rounded-lg"
                  key={settings.trailer_audio_url}
                  // Remove some noisy defaults and hint dark controls where supported
                  controlsList="nodownload noplaybackrate"
                  style={{ colorScheme: "dark" }}
                >
                  <source src={settings.trailer_audio_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}