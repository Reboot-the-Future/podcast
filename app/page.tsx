"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  ChevronUp,
  Sparkles,
  Waves,
  Menu,
  Sun,
  Moon,
  Headphones,
} from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================
const BUZZSPROUT_PODCAST_ID = process.env.NEXT_PUBLIC_BUZZSPROUT_ID;
const EPISODES_PER_PAGE = 1;
const BLOG_EXCERPT_LIMIT = 150;
const MAX_VISIBLE_TAGS = 3;

// ============================================================================
// TYPES
// ============================================================================
interface Episode {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  thumb_image_url: string;
  hero_image_url?: string;
  duration: number;
  date_published: string;
  tags: string[];
  spotify_url?: string;
  apple_url?: string;
  audio_url?: string;
  is_hero?: boolean;
  buzzsprout_episode_id?: string;
}

type BlogItem = {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  link: string;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function parseTags(tags: any): string[] {
  if (Array.isArray(tags)) {
    return tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return 'Invalid date';
  }
}

function formatDateLong(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return 'Invalid date';
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    return urlObj.href;
  } catch {
    return null;
  }
}

function validateBuzzsproutId(id: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(id);
}

// ============================================================================
// TRAILER PLAYER COMPONENT
// ============================================================================
// Complete TrailerPlayer Component with updated progress bar

const TrailerPlayer = ({ currentPage, isDark }: { currentPage: number; isDark: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const fetchTrailerUrl = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        if (data.trailer_audio_url && audioRef.current) {
          audioRef.current.src = data.trailer_audio_url;
        } else {
          setError('No trailer URL configured');
        }
      } catch (err) {
        console.error('Failed to load trailer:', err);
        setError('Failed to load trailer');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrailerUrl();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(Math.floor(audio.currentTime));
      }
    };

    const handleDurationChange = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.floor(audio.duration));
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.floor(audio.duration));
      }
    };

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      console.error('Audio loading error');
      setError('Failed to load audio');
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlayingRef.current) {
          audio.pause();
        } else {
          audio.play().catch(err => console.error('Playback error:', err));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
    }
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;

    const audio = audioRef.current;
    const wasPlaying = !audio.paused;
    const newTime = (parseFloat(e.target.value) / 100) * duration;

    audio.currentTime = newTime;

    if (wasPlaying) {
      try {
        await audio.play();
      } catch (err) {
        console.error('Failed to resume playback:', err);
      }
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div
        className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
          } rounded-3xl p-6`}
      >
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
        } rounded-2xl sm:rounded-3xl p-3 xs:p-4 sm:p-6 transition-all hover:shadow-pink-500/20`}
    >
      <div className="flex justify-between items-center mb-3 xs:mb-4 sm:mb-5">
        <h3
          className={`font-semibold text-sm xs:text-base sm:text-lg ${isDark ? 'text-white' : 'text-[#0F1C1C]'} flex items-center gap-1.5 xs:gap-2`}
        >
          <Sparkles className="text-[#d97ac8]" size={14} />
          <span className="hidden xs:inline">Podcast Trailer</span>
          <span className="xs:hidden">Trailer</span>
        </h3>
        <Waves
          className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 ${isPlaying
            ? 'text-[#d97ac8] animate-pulse'
            : isDark
              ? 'text-[#0F1C1C]/50'
              : 'text-gray-400'
            }`}
        />
      </div>

      <div className="flex items-center gap-2 xs:gap-3 sm:gap-5">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all relative flex-shrink-0 ${isPlaying
            ? isDark
              ? 'bg-[#d97ac8] shadow-[#d97ac8]/50 shadow-lg hover:bg-[#c84a8a]'
              : 'bg-[#d97ac8]/90 shadow-[#d97ac8]/30 shadow-lg hover:bg-[#c84a8a]/90'
            : isDark
              ? 'bg-[#d97ac8] hover:bg-[#c84a8a] hover:shadow-lg hover:shadow-pink-500/50'
              : 'bg-[#d97ac8]/90 hover:bg-[#c84a8a]/90 hover:shadow-lg hover:shadow-pink-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Click to play/pause (or press Space)"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <>
              <Pause size={18} className="xs:hidden" fill="white" stroke="none" />
              <Pause size={22} className="hidden xs:block sm:hidden" fill="white" stroke="none" />
              <Pause size={26} className="hidden sm:block" fill="white" stroke="none" />
            </>
          ) : (
            <>
              <Play size={18} className="xs:hidden ml-1" fill="white" stroke="none" />
              <Play size={22} className="hidden xs:block sm:hidden ml-1" fill="white" stroke="none" />
              <Play size={26} className="hidden sm:block ml-1" fill="white" stroke="none" />
            </>
          )}
        </button>

        <div className="flex-1 min-w-0 relative">
          <div
            className={`relative h-2 rounded-full overflow-hidden transition-colors ${
              isDark ? 'bg-[#2a3838] border border-[#2a3838]' : 'bg-gray-200/70 border border-gray-200'
            }`}
          >
            <div
              className="absolute top-0 left-0 h-full bg-[#d97ac8] transition-all rounded-full"
              style={{ width: `${progress}%` }}
            />
            {/* Progress indicator circle */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#d97ac8] rounded-full shadow-lg border-2 transition-all hover:scale-110 ${isDark ? 'border-[#0F1C1C]' : 'border-white'}`}
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            disabled={isLoading || !duration}
            className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Seek"
          />
          <div
            className={`flex justify-between text-xs ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'
              } mt-1`}
          >
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      <div
        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 xs:gap-3 sm:gap-0 mt-3 xs:mt-4 pt-3 ${isDark ? 'border-[#d97ac8]/20 border-t-2' : 'border-gray-200/50 border-t'
          }`}
      >
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 xs:p-2 rounded-xl ${isDark ? 'bg-[#0F1C1C]/10 hover:bg-[#0F1C1C]/20' : 'bg-gray-100/50 hover:bg-gray-200/50'
              } transition-all flex-shrink-0`}
            aria-label={(isMuted || volume === 0) ? 'Unmute' : 'Mute'}
          >
            {(isMuted || volume === 0) ? (
              <>
                <VolumeX size={14} className={`xs:hidden ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
                <VolumeX size={16} className={`hidden xs:block sm:hidden ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
                <VolumeX size={18} className={`hidden sm:block ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
              </>
            ) : (
              <>
                <Volume2 size={14} className={`xs:hidden ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
                <Volume2 size={16} className={`hidden xs:block sm:hidden ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
                <Volume2 size={18} className={`hidden sm:block ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`} />
              </>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              setVolume(newVolume);
              // If slider hits 0, reflect muted state; otherwise ensure unmuted
              setIsMuted(newVolume === 0);
            }}
            className="w-16 xs:w-20 sm:w-28 accent-[#d97ac8]"
            aria-label="Volume"
          />
        </div>

        <div
          className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'
            }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#d97ac8] animate-pulse' : 'bg-gray-400'
              }`}
          />
          {isPlaying ? 'Playing' : 'Paused'}
        </div>
      </div>

      <audio ref={audioRef} preload="metadata" />

      {currentPage > 1 && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`fixed bottom-20 md:bottom-6 right-4 sm:right-6 w-12 h-12 rounded-full ${isDark
            ? 'bg-[#d97ac8] hover:bg-[#c84a8a]'
            : 'bg-[#d97ac8]/90 hover:bg-[#c84a8a]/90'
            } text-white flex items-center justify-center shadow-lg shadow-pink-500/30 transition-all hover:scale-110 z-40`}
          aria-label="Scroll to top"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// BLOG SIDEBAR COMPONENT
// ============================================================================
const BlogSidebar = ({ blogs, currentPage, isDark }: { blogs: BlogItem[]; currentPage: number; isDark: boolean }) => {
  const [expandedBlogId, setExpandedBlogId] = useState<number | null>(null);

  const isTruncated = (text: string, limit: number) => text.length > limit;

  return (
    <div className="flex flex-col space-y-3 xs:space-y-4 sm:space-y-6">
      <TrailerPlayer currentPage={currentPage} isDark={isDark} />

      <div
        className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
          } transition-all p-3 xs:p-4 sm:p-6 lg:p-8 group`}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 mb-3 xs:mb-4 sm:mb-6">
            <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d97ac8] to-[#c84a8a] flex items-center justify-center shadow-lg">
              <Sparkles size={14} className="xs:hidden text-white" />
              <Sparkles size={16} className="hidden xs:block sm:hidden text-white" />
              <Sparkles size={18} className="hidden sm:block text-white" />
            </div>
            <h2 className={`text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}>
              Latest News
            </h2>
          </div>

          {blogs.length === 0 ? (
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>
              No insights available yet.
            </p>
          ) : (
            <div className="space-y-2.5 xs:space-y-3 sm:space-y-4">
              {blogs.map((blog) => {
                const limit = BLOG_EXCERPT_LIMIT;
                const isExpanded = expandedBlogId === blog.id;
                const shouldTruncate = isTruncated(blog.excerpt, limit);
                const displayedText = isExpanded ? blog.excerpt : blog.excerpt.slice(0, limit) + (shouldTruncate ? '...' : '');
                const safeLink = sanitizeUrl(blog.link);

                return (
                  <div
                    key={blog.id}
                    className={`flex flex-col gap-1.5 xs:gap-2 ${isDark ? 'border-[#d97ac8]/20' : 'border-gray-200'
                      } pb-2.5 xs:pb-3 sm:pb-4 last:border-b-0 transition-all border-b`}
                  >
                    {safeLink ? (
                      <a
                        href={safeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm xs:text-base sm:text-lg lg:text-xl font-semibold text-[#d97ac8] hover:text-[#c84a8a] transition-colors break-words"
                      >
                        {blog.title}
                      </a>
                    ) : (
                      <span className="text-sm xs:text-base sm:text-lg lg:text-xl font-semibold text-[#d97ac8] break-words">
                        {blog.title}
                      </span>
                    )}

                    <div className="flex flex-wrap gap-1 xs:gap-1.5 sm:gap-2">
                      {blog.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs text-[#d97ac8] ${isDark ? 'bg-[#d97ac8]/10' : 'bg-[#d97ac8]/20'
                            } px-1.5 xs:px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-[#d97ac8]/20 hover:bg-[#d97ac8]/20 transition-colors`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-[#0F1C1C]/80'} leading-relaxed break-words`}>
                      {displayedText}
                    </p>

                    {shouldTruncate && (
                      <button
                        onClick={() => setExpandedBlogId(isExpanded ? null : blog.id)}
                        className="text-xs text-[#d97ac8] hover:text-[#c84a8a] font-semibold transition-colors text-left mt-0.5 xs:mt-1"
                      >
                        {isExpanded ? 'See Less' : 'See More'}
                      </button>
                    )}

                    <div
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'} flex items-center gap-1 xs:gap-1.5 sm:gap-2 mt-0.5 xs:mt-1`}
                    >
                      <Calendar size={10} className="xs:hidden" />
                      <Calendar size={12} className="hidden xs:block" />
                      {formatDate(blog.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EPISODE CARD COMPONENT
// ============================================================================
const EpisodeCard = ({ episode, isDark }: { episode: Episode; isDark: boolean }) => {
  const tags = parseTags(episode.tags);
  const containerIdRef = useRef(`buzzsprout-player-${episode.id}`);

  useEffect(() => {
    if (!episode.buzzsprout_episode_id) return;

    if (!validateBuzzsproutId(episode.buzzsprout_episode_id)) {
      console.error('Invalid buzzsprout episode ID format');
      return;
    }

    const containerId = containerIdRef.current;
    const bgColor = isDark ? '0F1C1C' : 'FFFFFF';
    const scriptSrc = `https://www.buzzsprout.com/${BUZZSPROUT_PODCAST_ID}/${episode.buzzsprout_episode_id}.js?container_id=${containerId}&player=small`;

    // Clear existing content
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    const existingScript = document.querySelector(`script[src*="container_id=${containerId}"]`);
    existingScript?.remove();

    // Add script with delay
    const timer = setTimeout(() => {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.type = 'text/javascript';
      script.charset = 'utf-8';
      script.async = true;

      script.onerror = () => {
        console.error('Failed to load Buzzsprout player');
      };

      document.body.appendChild(script);
    }, 100);

    return () => {
      clearTimeout(timer);
      const scriptToRemove = document.querySelector(`script[src*="container_id=${containerId}"]`);
      scriptToRemove?.remove();
    };
  }, [episode.buzzsprout_episode_id, episode.id]);

  return (
    <div
      className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
        } rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/20 col-span-full flex flex-col group`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between mb-2 xs:mb-3 sm:mb-4 gap-2 xs:gap-3 sm:gap-0">
        <div className="flex-1 min-w-0 w-full sm:pr-4">
          <div className="flex gap-1 xs:gap-1.5 sm:gap-2 flex-wrap mb-1.5 xs:mb-2 sm:mb-3">
            {tags.slice(0, MAX_VISIBLE_TAGS).map((tag: string) => (
              <span
                key={tag}
                className={`text-xs text-[#d97ac8] ${isDark ? 'bg-[#d97ac8]/10' : 'bg-[#d97ac8]/20'
                  } px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-0.5 sm:py-1 rounded-full font-semibold border border-[#d97ac8]/20`}
              >
                {tag}
              </span>
            ))}
            {tags.length > MAX_VISIBLE_TAGS && (
              <span className={`text-xs px-1.5 xs:px-2 ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>
                +{tags.length - MAX_VISIBLE_TAGS}
              </span>
            )}
          </div>
          <h3
            className={`font-bold mb-1.5 xs:mb-2 leading-tight text-xl xs:text-2xl sm:text-3xl lg:text-4xl break-words ${isDark ? 'text-white' : 'text-[#0F1C1C]'
              }`}
          >
            {episode.title}
          </h3>
        </div>

        <div className="ml-0 sm:ml-4 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg w-12 h-12 xs:w-16 xs:h-16 sm:w-20 sm:h-20 bg-[#d97ac8]/20 self-center sm:self-start">
          <Play className="ml-1 w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8" fill="#d97ac8" stroke="none" />
        </div>
      </div>

      <p className={`${isDark ? 'text-[#efe8e6]' : 'text-[#0F1C1C]/80'} mb-2 xs:mb-3 sm:mb-4 leading-relaxed flex-grow text-xs xs:text-sm sm:text-base break-words`}>
        {episode.excerpt}
      </p>

      <div
        className={`flex flex-wrap items-center justify-between gap-1.5 xs:gap-2 sm:gap-0 pt-2 xs:pt-3 sm:pt-4 ${isDark ? 'border-[#d97ac8]/20 border-t-2' : 'border-gray-200 border-t'
          } mt-auto`}
      >
        <div className={`flex flex-wrap items-center gap-1.5 xs:gap-2 sm:gap-4 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>
          <span
            className={`flex items-center gap-1 sm:gap-1.5 ${isDark ? 'bg-[#0F1C1C]/10' : 'bg-gray-100'
              } px-1.5 xs:px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg`}
          >
            <Clock className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs xs:text-sm">{formatDuration(episode.duration)}</span>
          </span>
          <span
            className={`flex items-center gap-1 sm:gap-1.5 ${isDark ? 'bg-[#0F1C1C]/10' : 'bg-gray-100'
              } px-1.5 xs:px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg`}
          >
            <Calendar className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs xs:text-sm">{formatDate(episode.date_published)}</span>
          </span>
        </div>
      </div>

      {episode.buzzsprout_episode_id && (
        <div
          className={`mt-3 xs:mt-4 sm:mt-6 pt-3 xs:pt-4 sm:pt-6 ${isDark ? 'border-[#d97ac8]/20 border-t-2' : 'border-gray-200 border-t'} space-y-3 xs:space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 duration-300`}
        >
          <div
            className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-md'
              } rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 lg:p-8 transition-all`}
          >
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 mb-3 xs:mb-4 sm:mb-5">
              <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#d97ac8] to-[#c84a8a] flex items-center justify-center shadow-lg">
                <Headphones className="text-white w-4 h-4 xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className={`text-sm xs:text-base sm:text-lg font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}>
                  Listen to Episode
                </h4>
              </div>
            </div>
            <div id={containerIdRef.current} className="buzzsprout-player-wrapper w-full overflow-hidden">
              <div
                className={`${isDark ? 'bg-[#0F1C1C]' : 'bg-gray-100'
                  } rounded-lg p-4 xs:p-6 sm:p-8 text-center`}
              >
                <div className="animate-spin rounded-full h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8 border-b-2 border-[#d97ac8] mx-auto mb-2 sm:mb-3"></div>
                <p className={`${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'} text-xs sm:text-sm`}>
                  Loading player...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMING SOON DESCRIPTION COMPONENT
// ============================================================================
function ComingSoonDescription({ text, isDark }: { text: string; isDark: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 200;
  
  if (!text) return null;
  
  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText = isExpanded ? text : text.slice(0, CHAR_LIMIT) + (shouldTruncate ? '...' : '');
  
  return (
    <>
      <p className={`text-sm sm:text-base lg:text-lg ${isDark ? 'text-[#efe8e6]/90' : 'text-[#0F1C1C]/80'} leading-relaxed`}>
        {displayText}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs sm:text-sm text-[#d97ac8] hover:text-[#c84a8a] font-semibold transition-colors mt-2 lg:hidden"
        >
          {isExpanded ? 'See Less' : 'See More'}
        </button>
      )}
    </>
  );
}

// ============================================================================
// HERO DESCRIPTION COMPONENT
// ============================================================================
function HeroDescription({ text, isDark }: { text: string; isDark: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const CHAR_LIMIT = 150;

  if (!text) return null;

  const shouldTruncate = text.length > CHAR_LIMIT;
  const truncated = text.slice(0, CHAR_LIMIT) + (shouldTruncate ? '...' : '');

  return (
    <div className="w-full">
      {/* Mobile/Tablet: truncated with toggle */}
      <div className="lg:hidden">
        <p
          className={`text-sm sm:text-base lg:text-lg ${isDark ? 'text-[#efe8e6]/90' : 'text-[#0F1C1C]/80'} leading-relaxed font-light w-full`}
        >
          {isExpanded ? text : truncated}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs sm:text-sm text-[#d97ac8] hover:text-[#c84a8a] font-semibold transition-colors mt-2"
          >
            {isExpanded ? 'See Less' : 'See More'}
          </button>
        )}
      </div>

      {/* Desktop (lg+): always show full description */}
      <p
        className={`hidden lg:block text-lg ${isDark ? 'text-[#efe8e6]/90' : 'text-[#0F1C1C]/80'} leading-relaxed font-light w-full`}
      >
        {text}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PodcastSite() {
  const [blogsData, setBlogsData] = useState<BlogItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false); // Default to white theme
  const [heroEpisode, setHeroEpisode] = useState<Episode | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(false);
  const [comingSoon, setComingSoon] = useState<{ title: string; description?: string } | null>(null);

  // Set document title on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = "Let's Reboot the Future";
    }
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mobileMenuOpen]);

  // Fetch blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch("/api/blogs");
        if (!res.ok) throw new Error('Failed to fetch blogs');
        const data = await res.json();
        const transformedBlogs = (data.blogs || []).map((blog: any) => ({
          id: blog.id,
          title: blog.title,
          excerpt: blog.excerpt,
          date: blog.date,
          tags: parseTags(blog.tags),
          link: blog.link || "",
        }));
        setBlogsData(transformedBlogs);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        setBlogsData([]);
      }
    };
    fetchBlogs();
  }, []);

  // Fetch coming soon section
  useEffect(() => {
    const fetchComingSoon = async () => {
      try {
        const res = await fetch("/api/coming-soon");
        if (res.ok) {
          const data = await res.json();
          if (data.comingSoon) {
            setComingSoon({
              title: data.comingSoon.title,
              description: data.comingSoon.description,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching coming soon:", error);
      }
    };
    fetchComingSoon();
  }, []);

  // Fetch episodes
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setHeroLoading(true);

      try {
        const res = await fetch("/api/episodes?limit=100&status=published");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const episodesData = await res.json();
        const processedEpisodes = (episodesData.episodes || []).map((episode: any) => ({
          ...episode,
          tags: parseTags(episode.tags),
        }));

        const sortedEpisodes = [...processedEpisodes].sort(
          (a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
        );

        console.log('📺 Hero Episode Data:', {
          title: sortedEpisodes[0]?.title,
          buzzsprout_episode_id: sortedEpisodes[0]?.buzzsprout_episode_id,
          id: sortedEpisodes[0]?.id,
          allFields: Object.keys(sortedEpisodes[0] || {})
        });

        setHeroEpisode(sortedEpisodes[0] || null);
        const episodesWithoutHero = sortedEpisodes.slice(1);
        setEpisodes(episodesWithoutHero);
        const calculatedTotalPages = Math.ceil(episodesWithoutHero.length / EPISODES_PER_PAGE);
        setTotalPages(calculatedTotalPages);
      } catch (error) {
        console.error("Error fetching data:", error);
        setEpisodes([]);
        setHeroEpisode(null);
      } finally {
        setLoading(false);
        setHeroLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Load hero episode buzzsprout player
  useEffect(() => {
    if (!heroEpisode?.buzzsprout_episode_id) {
      console.log('No hero episode or buzzsprout_episode_id:', heroEpisode);
      return;
    }

    if (!validateBuzzsproutId(heroEpisode.buzzsprout_episode_id)) {
      console.error('Invalid hero episode buzzsprout ID:', heroEpisode.buzzsprout_episode_id);
      return;
    }

    console.log('Loading Buzzsprout player for hero episode:', {
      buzzsprout_episode_id: heroEpisode.buzzsprout_episode_id,
      title: heroEpisode.title
    });

    // Clear existing player
    const container = document.getElementById('buzzsprout-player-hero');
    if (container) {
      container.innerHTML = '';
    }

    // Remove existing script
    const existingHeroScript = document.querySelector('script[src*="container_id=buzzsprout-player-hero"]');
    existingHeroScript?.remove();

    // Add new script with slight delay to ensure container is ready
    const timer = setTimeout(() => {
      const script = document.createElement('script');
      script.src = `https://www.buzzsprout.com/${BUZZSPROUT_PODCAST_ID}/${heroEpisode.buzzsprout_episode_id}.js?container_id=buzzsprout-player-hero&player=small`;
      script.type = 'text/javascript';
      script.charset = 'utf-8';
      script.async = true;
      
      script.onerror = () => {
        console.error('Failed to load Buzzsprout hero player:', script.src);
      };

      script.onload = () => {
        console.log('Buzzsprout hero player loaded successfully');
      };

      document.body.appendChild(script);
    }, 100);

    return () => {
      clearTimeout(timer);
      const scriptToRemove = document.querySelector('script[src*="container_id=buzzsprout-player-hero"]');
      scriptToRemove?.remove();
    };
  }, [heroEpisode?.buzzsprout_episode_id]);

  const getCurrentPageEpisodes = () => {
    const startIndex = (currentPage - 1) * EPISODES_PER_PAGE;
    const endIndex = startIndex + EPISODES_PER_PAGE;
    return episodes.slice(startIndex, endIndex);
  };

  const currentPageEpisodes = getCurrentPageEpisodes();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0F1C1C] text-white' : 'bg-white text-[#0F1C1C]'}`}>
      <header
        className={`sticky top-0 ${isDark ? 'bg-[#0F1C1C]/95 border-[#d97ac8]/20 border-b-2 backdrop-blur-md' : mobileMenuOpen ? 'bg-white border-[#d97ac8]/30 border-b-2' : 'bg-white/95 border-[#d97ac8]/30 border-b-2 backdrop-blur-md'
          } z-50 transition-all duration-300 shadow-lg`}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <a
              href="/"
              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2 rounded-lg transition-all hover:scale-105"
              aria-label="Reboot The Future - Home"
            >
              <img
                src={isDark ? "/logo-white.png" : "/logo-dark.png"}
                alt="Let's Reboot TheFuture"
                className="h-12 sm:h-16 lg:h-20 w-auto"
              />
            </a>
            <nav className="hidden lg:flex gap-4 xl:gap-8 flex-shrink-0" role="navigation" aria-label="Main navigation">
              <a
                href="https://www.rebootthefuture.org/who-we-are"
                className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8]' : 'text-[#0F1C1C] hover:text-[#d97ac8]'
                  } transition-colors py-2 px-4 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20' : 'hover:bg-gray-100'
                  } focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2`}
                aria-label="Navigate to About page"
              >
                About
              </a>
              <a
                href="https://education.rebootthefuture.org/"
                className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8]' : 'text-[#0F1C1C] hover:text-[#d97ac8]'
                  } transition-colors py-2 px-4 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20' : 'hover:bg-gray-100'
                  }`}
              >
                Education
              </a>
              <a
                href="https://www.rebootthefuture.org/what-we-do/reboot-experiences"
                className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8]' : 'text-[#0F1C1C] hover:text-[#d97ac8]'
                  } transition-colors py-2 px-4 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20' : 'hover:bg-gray-100'
                  }`}
              >
                Services
              </a>
              <a
                href="https://www.rebootthefuture.org/contact"
                className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8]' : 'text-[#0F1C1C] hover:text-[#d97ac8]'
                  } transition-colors py-2 px-4 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20' : 'hover:bg-gray-100'
                  }`}
              >
                Contact
              </a>
            </nav>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20 text-white' : 'hover:bg-[#d97ac8]/10 text-[#0F1C1C]'
                } transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2`}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-[#0F1C1C]/20 text-white' : 'hover:bg-[#d97ac8]/10 text-[#0F1C1C]'
                } transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2`}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} />
            </button>
          </div>

          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className={`fixed inset-0 z-40 lg:hidden ${isDark ? 'bg-black/50' : 'bg-white/20'}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />

              {/* Mobile Menu */}
              <nav
                className={`lg:hidden mt-4 pb-4 space-y-2 border-t-2 ${isDark ? 'border-[#d97ac8]/20' : 'border-[#d97ac8]/30'
                  } pt-4 animate-in fade-in slide-in-from-top-2 duration-200 relative z-50`}
                role="navigation"
                aria-label="Mobile navigation"
              >
                <a
                  href="https://www.rebootthefuture.org/who-we-are"
                  className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8] hover:bg-[#d97ac8]/10' : 'text-[#0F1C1C] font-medium hover:text-white hover:bg-[#d97ac8]'
                    } transition-all py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Navigate to About page"
                >
                  About
                </a>
                <a
                  href="https://education.rebootthefuture.org/"
                  className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8] hover:bg-[#d97ac8]/10' : 'text-[#0F1C1C] font-medium hover:text-white hover:bg-[#d97ac8]'
                    } transition-all py-3 px-4 rounded-lg`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Education
                </a>
                <a
                  href="https://www.rebootthefuture.org/what-we-do/reboot-experiences"
                  className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8] hover:bg-[#d97ac8]/10' : 'text-[#0F1C1C] font-medium hover:text-white hover:bg-[#d97ac8]'
                    } transition-all py-3 px-4 rounded-lg`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Services
                </a>
                <a
                  href="https://www.rebootthefuture.org/contact"
                  className={`block ${isDark ? 'text-[#efe8e6] hover:text-[#d97ac8] hover:bg-[#d97ac8]/10' : 'text-[#0F1C1C] font-medium hover:text-white hover:bg-[#d97ac8]'
                    } transition-all py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Navigate to Contact page"
                >
                  Contact
                </a>
              </nav>
            </>
          )}
        </div>
      </header>

      {/* Coming Soon Section */}
      {comingSoon && (
        <section className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 xs:py-6 sm:py-12 lg:py-16">
          <div
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
              } transition-all p-4 xs:p-5 sm:p-8 lg:p-12 group`}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d97ac8] to-[#c84a8a] flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </div>
                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}>
                  Coming Soon
                </h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'} leading-tight`}>
                  {comingSoon.title}
                </h3>
                {comingSoon.description && (
                  <ComingSoonDescription text={comingSoon.description} isDark={isDark} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 xs:py-6 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 sm:gap-6 lg:gap-10">
          {/* On mobile, show sidebar first (trailer + blogs), on desktop show hero first */}
          <div className="lg:hidden order-1">
            <BlogSidebar blogs={blogsData} currentPage={currentPage} isDark={isDark} />
          </div>
          
          <div
            className={`relative rounded-2xl sm:rounded-3xl h-full min-h-[500px] xs:min-h-[600px] sm:min-h-[650px] order-2 lg:order-1 ${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2 overflow-hidden' : 'bg-white border border-gray-200 shadow-lg'
              } transition-all group`}
          >
            {heroLoading ? (
              <div className={`absolute inset-0 flex items-center justify-center rounded-3xl ${isDark ? 'bg-gradient-to-br from-[#1a2828] to-[#0f1c1c]' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d97ac8] mx-auto mb-4"></div>
                    <div className="absolute inset-0 animate-pulse rounded-full h-12 w-12 border border-[#d97ac8]/30 mx-auto"></div>
                  </div>
                  <p className={`${isDark ? "text-[#efe8e6]" : "text-[#0F1C1C]"} font-medium`}>Loading latest episode...</p>
                  <div className="mt-2 flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : heroEpisode ? (
              <div className="relative h-full flex flex-col p-3 xs:p-4 sm:p-8 lg:p-12 py-6 xs:py-8 sm:py-12 lg:py-16">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="space-y-2 xs:space-y-3 sm:space-y-4 mb-3 xs:mb-4 sm:mb-6">
                    <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 sm:gap-3">
                      <span className="bg-gradient-to-r from-[#d97ac8] to-[#c84a8a] text-white px-2 xs:px-3 sm:px-5 py-1 xs:py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1 xs:gap-1.5 sm:gap-2 shadow-lg shadow-pink-500/30 hover:scale-105 transition-transform">
                        <Sparkles size={12} className="xs:hidden animate-pulse" />
                        <Sparkles size={14} className="hidden xs:block sm:hidden animate-pulse" />
                        <Sparkles size={16} className="hidden sm:block animate-pulse" />
                        <span className="hidden xs:inline">Latest Episode</span>
                        <span className="xs:hidden">Latest</span>
                      </span>
                      <span
                        className={`${isDark ? 'text-[#efe8e6]' : 'text-[#0F1C1C]'
                          } text-xs sm:text-sm flex items-center gap-1 xs:gap-1.5 sm:gap-2 ${isDark ? 'bg-[#0F1C1C]/10' : 'bg-gray-100'
                          } px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full`}
                      >
                        <Calendar size={12} className="sm:hidden" />
                        <Calendar size={14} className="hidden sm:block" />
                        <span className="hidden sm:inline">{formatDateLong(heroEpisode.date_published)}</span>
                        <span className="sm:hidden">{formatDate(heroEpisode.date_published)}</span>
                      </span>
                    </div>

                    <div className="flex gap-1 xs:gap-1.5 sm:gap-2 flex-wrap">
                      {parseTags(heroEpisode.tags).slice(0, 5).map((tag: string) => (
                        <span
                          key={tag}
                          className={`text-xs text-[#d97ac8] ${isDark ? 'bg-[#d97ac8]/10' : 'bg-[#d97ac8]/20'
                            } px-2 xs:px-2.5 sm:px-4 py-0.5 xs:py-1 sm:py-1.5 rounded-full font-semibold border border-[#d97ac8]/30 hover:bg-[#d97ac8]/20 transition-colors`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-3 xs:space-y-4 sm:space-y-6 my-3 xs:my-4 sm:my-8">
                    <div className="flex-1 flex flex-col justify-start space-y-1.5 xs:space-y-2 sm:space-y-3 mt-2 sm:mt-3 w-full">
                      <h1
                        className={`font-bold leading-tight text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl drop-shadow-md break-words w-full ${isDark ? 'text-white' : 'text-[#0F1C1C]'
                          }`}
                      >
                        {heroEpisode.title}
                      </h1>
                      <HeroDescription text={heroEpisode.excerpt} isDark={isDark} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                      <span
                        className={`flex items-center gap-1 xs:gap-1.5 sm:gap-2 ${isDark ? 'bg-[#0F1C1C]/10' : 'bg-gray-100'
                          } px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 rounded-xl ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}
                      >
                        <Clock className="text-[#d97ac8] w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px]" />
                        <span className="font-semibold">{Math.floor(heroEpisode.duration / 60)} min</span>
                      </span>
                      <span
                        className={`flex items-center gap-1 xs:gap-1.5 sm:gap-2 ${isDark ? 'bg-[#0F1C1C]/10' : 'bg-gray-100'
                          } px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 rounded-xl ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}
                      >
                        <Headphones className="text-[#00ffaa] w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px]" />
                        <span className="font-semibold">Featured</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div
                      className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-md'
                        } rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 lg:p-8 transition-all`}
                    >
                      <div className="flex items-center justify-between mb-3 xs:mb-4 sm:mb-5">
                        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3">
                          <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#d97ac8] to-[#c84a8a] flex items-center justify-center shadow-lg">
                            <Headphones className="text-white w-4 h-4 xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <h3 className={`text-sm xs:text-base sm:text-xl font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'}`}>
                              Listen Now
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00ffaa] animate-pulse"></div>
                          <span
                            className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'} hidden xs:inline`}
                          >
                            Available Now
                          </span>
                        </div>
                      </div>
                      <div id="buzzsprout-player-hero" className="buzzsprout-player-wrapper w-full overflow-hidden">
                        <div
                          className={`text-center py-6 xs:py-8 sm:py-10 ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'} text-xs sm:text-sm`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative mb-3 xs:mb-4">
                              <div className={`w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 rounded-full ${isDark ? 'bg-[#d97ac8]/10' : 'bg-gray-100'
                                } flex items-center justify-center`}>
                                <Play className="text-[#d97ac8] w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8" fill="#d97ac8" stroke="none" />
                              </div>
                              <div className="absolute inset-0 rounded-full border-2 border-[#d97ac8]/30 animate-pulse"></div>
                            </div>
                            <p className="text-xs xs:text-sm sm:text-base font-medium">Loading player...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-xl ${isDark ? 'text-[#efe8e6]' : 'text-[#0F1C1C]'} mb-4`}>
                    No episodes available
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>
                    Check back soon for new content!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop sidebar - hidden on mobile since it's shown above */}
          <div className="hidden lg:block order-2">
            <BlogSidebar blogs={blogsData} currentPage={currentPage} isDark={isDark} />
          </div>
        </div>
      </section>

      <section id="episodes" className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 xs:py-6 sm:py-12 lg:py-16">
        <div
          className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-2' : 'bg-white border border-gray-200 shadow-lg'
            } transition-all p-4 xs:p-5 sm:p-8 lg:p-12 group`}
        >
          <div className="relative z-10">
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 ${isDark ? 'border-[#d97ac8]/20 border-b-2' : 'border-b border-gray-200'
                }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d97ac8] to-[#c84a8a] flex items-center justify-center shadow-lg">
                    <Play size={16} className="sm:hidden text-white ml-0.5" fill="white" />
                    <Play size={18} className="hidden sm:block text-white ml-0.5" fill="white" />
                  </div>
                  <h2
                    className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${isDark ? 'text-white' : 'text-[#0F1C1C]'
                      }`}
                  >
                    Explore Episodes
                  </h2>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 sm:gap-4 flex-shrink-0 ${isDark ? 'border-[#d97ac8]/20 border-2' : ''
                  } rounded-lg p-2`}
              >
                <span
                  className={`text-xs sm:text-sm font-medium ${isDark ? 'text-[#efe8e6] bg-[#0F1C1C]/10' : 'text-[#0F1C1C] bg-gray-100'
                    } px-3 sm:px-4 py-1.5 sm:py-2 rounded-full`}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${isDark ? 'bg-[#0F1C1C]/10 hover:bg-[#0F1C1C]/20' : 'bg-gray-100 hover:bg-gray-200'
                      } disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95`}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} className="sm:hidden" />
                    <ChevronLeft size={20} className="hidden sm:block" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${isDark ? 'bg-[#0F1C1C]/10 hover:bg-[#0F1C1C]/20' : 'bg-gray-100 hover:bg-gray-200'
                      } disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95`}
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} className="sm:hidden" />
                    <ChevronRight size={20} className="hidden sm:block" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16 sm:py-20">
                <div className="text-center">
                  <div className="relative mb-4 sm:mb-6">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#d97ac8] mx-auto"></div>
                    <div className="absolute inset-0 animate-pulse rounded-full h-10 w-10 sm:h-12 sm:w-12 border border-[#d97ac8]/30 mx-auto"></div>
                  </div>
                  <p className={`${isDark ? "text-gray-400" : "text-[#0F1C1C]/60"} font-medium mb-2 text-sm sm:text-base`}>Loading episodes...</p>
                  <div className="flex justify-center space-x-1">
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#d97ac8] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            ) : currentPageEpisodes.length === 0 ? (
              <div className="text-center py-16 sm:py-20 rounded-2xl">
                <p className={`text-lg sm:text-xl ${isDark ? 'text-[#efe8e6]' : 'text-[#0F1C1C]'} mb-2`}>
                  No episodes available yet.
                </p>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-[#0F1C1C]/60'}`}>
                  Check back soon for new content!
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {currentPageEpisodes.map((episode) => (
                  <EpisodeCard key={episode.id} episode={episode} isDark={isDark} />
                ))}
              </div>
            )}

            {!loading && currentPageEpisodes.length > 0 && (
              <div
                className={`flex justify-center gap-2 mt-6 sm:mt-8 sm:hidden ${isDark ? 'border-[#d97ac8]/20 border-2' : ''
                  } rounded-lg p-2`}
              >
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-2 h-2 rounded-full transition-all ${currentPage === i + 1
                      ? 'bg-[#d97ac8] w-6'
                      : isDark
                        ? 'bg-[#0F1C1C]/20'
                        : 'bg-gray-200'
                      }`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer
        className={`${isDark ? 'bg-[#0F1C1C] border-[#d97ac8]/20 border-t-2' : 'bg-white border-gray-200 border-t'} mt-8 sm:mt-16 lg:mt-20`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 py-8 sm:py-12">
          <div
            className={`flex flex-col md:flex-row justify-between gap-8 sm:gap-12 ${isDark ? 'text-[#efe8e6]' : 'text-[#0F1C1C]'}`}
          >
            <div className="md:w-1/2">
              <h4 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">Get in touch</h4>
              <a
                href="mailto:hello@rebootthefuture.org"
                className="block text-base sm:text-lg lg:text-xl font-semibold mb-4 sm:mb-6 hover:text-[#d97ac8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2 break-all"
              >
                hello@rebootthefuture.org
              </a>

              <div className="flex gap-4 sm:gap-5">
                <a
                  href="https://www.linkedin.com/company/reboot-the-future"
                  aria-label="LinkedIn"
                  className="hover:text-[#d97ac8] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                  </svg>
                </a>

                <a
                  href="https://www.youtube.com/channel/UCPn_4n01QQlhz5ofmaUPxLw"
                  aria-label="YouTube"
                  className="hover:text-[#d97ac8] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a2.983 2.983 0 0 0-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.398.586a2.983 2.983 0 0 0-2.1 2.1A31.1 31.1 0 0 0 .5 12a31.1 31.1 0 0 0 .002 5.814 2.983 2.983 0 0 0 2.1 2.1C4.4 20.5 12 20.5 12 20.5s7.6 0 9.398-.586a2.983 2.983 0 0 0 2.1-2.1A31.1 31.1 0 0 0 23.5 12a31.1 31.1 0 0 0-.002-5.814zM9.75 15.5v-7l6 3.5-6 3.5z" />
                  </svg>
                </a>

                <a
                  href="https://www.instagram.com/futurereboot/"
                  aria-label="Instagram"
                  className="hover:text-[#d97ac8] transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="md:w-1/2 md:text-right">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <p className="leading-relaxed text-sm sm:text-base">
                    <strong>Reboot the Future,</strong><br />
                    71–75 Shelton St<br />
                    London WC2H 9JQ
                  </p>
                </div>

                <div>
                  <p className="text-sm sm:text-base">Registered Charity no: <strong>1175117</strong></p>
                </div>

                <div>
                  <a
                    href="https://www.rebootthefuture.org/pages/policies"
                    className="text-base sm:text-lg font-bold hover:text-[#d97ac8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97ac8] focus:ring-offset-2 inline-block"
                  >
                    Our Policies
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}