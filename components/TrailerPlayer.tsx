// components/TrailerPlayer.tsx
// Enhanced UI/UX with better responsiveness and remaining time display

"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Radio } from "lucide-react";

interface TrailerPlayerProps {
  trailerUrl?: string;
}

export default function TrailerPlayer({ trailerUrl }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrailer, setHasTrailer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch trailer URL from settings
  useEffect(() => {
    const fetchTrailerUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const res = await fetch('/api/settings/public');
        if (!res.ok) {
          throw new Error('Failed to fetch settings');
        }
        
        const data = await res.json();
        
        if (data.trailer_audio_url && audioRef.current) {
          audioRef.current.src = data.trailer_audio_url;
          setHasTrailer(true);
        } else {
          setHasTrailer(false);
        }
      } catch (error) {
        console.error('Error fetching trailer:', error);
        setError('Failed to load trailer');
        setHasTrailer(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (!trailerUrl) {
      fetchTrailerUrl();
    } else if (audioRef.current) {
      audioRef.current.src = trailerUrl;
      setHasTrailer(true);
      setIsLoading(false);
    }
  }, [trailerUrl]);

  // Use requestAnimationFrame for smoother time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    
    const handleError = () => {
      setError('Failed to load audio');
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    if (!audioRef.current || !hasTrailer) return;

    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const remainingTime = duration - currentTime;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Don't render if loading or no trailer
  if (isLoading) {
    return null;
  }

  if (!hasTrailer) {
    return null; // Silently hide if no trailer is configured
  }

  return (
    <div className="bg-gradient-to-br from-[#1a2828] to-[#0f1c1c] rounded-2xl p-6 border border-[#ffa9fc]/30 shadow-xl hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#ffa9fc] focus-within:ring-offset-2">
      <audio ref={audioRef} preload="metadata" />
      
      {error && (
        <div className="mb-4 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        {/* Header with Icon */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ffa9fc]/10 rounded-lg">
            <Radio size={20} className="text-[#ffa9fc]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-white">Podcast Trailer</h3>
            <p className="text-xs text-gray-400">Get a taste of what's coming</p>
          </div>
          {isPlaying && (
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-[#ffa9fc] rounded-full animate-pulse"></div>
              <div className="w-1 h-4 bg-[#ffa9fc] rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></div>
              <div className="w-1 h-4 bg-[#ffa9fc] rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div
            className="h-2 bg-[#2a3838] rounded-full cursor-pointer overflow-hidden group hover:h-3 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-[#ffa9fc] to-[#ff8df7] transition-all relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{formatTime(currentTime)}</span>
            <span className="text-[#ffa9fc] font-semibold">
              -{formatTime(remainingTime)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Play Button */}
          <button
            onClick={togglePlay}
            disabled={!hasTrailer || isBuffering}
            className="w-12 h-12 rounded-full bg-[#ffa9fc] hover:bg-[#ff8df7] flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[#ffa9fc] focus:ring-offset-2"
            aria-label={isPlaying ? "Pause trailer" : "Play trailer"}
          >
            {isBuffering ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0f1c1c] border-t-transparent"></div>
            ) : isPlaying ? (
              <Pause size={20} fill="#0f1c1c" stroke="none" />
            ) : (
              <Play size={20} fill="#0f1c1c" stroke="none" className="ml-0.5" />
            )}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ffa9fc] focus:ring-offset-2"
              aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} className="text-gray-400" />
              ) : volume < 0.5 ? (
                <Volume2 size={18} className="text-gray-400" />
              ) : (
                <Volume2 size={18} className="text-gray-400" />
              )}
            </button>
            
            <div className="flex-1 relative group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  // If slider is dragged to 0, reflect muted state; otherwise ensure unmuted
                  setIsMuted(newVolume === 0);
                }}
                className="w-full h-1 bg-[#2a3838] rounded-full appearance-none cursor-pointer transition-all
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ffa9fc] [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#ffa9fc] [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-all hover:[&::-moz-range-thumb]:scale-125"
              />
              {/* Volume indicator */}
              <div 
                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#ffa9fc] to-[#ff8df7] rounded-full pointer-events-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              ></div>
            </div>
            
            <span className="text-xs text-gray-400 font-mono w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Status Text */}
        {isPlaying && (
          <div className="text-center">
            <p className="text-xs text-[#ffa9fc] font-semibold animate-pulse">
              Now Playing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}