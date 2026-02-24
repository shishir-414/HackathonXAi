import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { videoAPI } from '../api';
import { useAuthStore } from '../store';
import {
  FiArrowLeft, FiHeart, FiShare2, FiBookmark,
  FiChevronUp, FiChevronDown, FiCamera,
  FiVolume2, FiVolumeX,
} from 'react-icons/fi';
import PracticalMode from './PracticalMode';

export default function VideoFeed() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [showPractical, setShowPractical] = useState(false);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [showHeart, setShowHeart] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [slideDirection, setSlideDirection] = useState('none'); // 'up' | 'down' | 'none'
  const [isTransitioning, setIsTransitioning] = useState(false);

  const feedRef = useRef(null);
  const playerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const lastTap = useRef(0);
  const scrollLock = useRef(false);
  const heartTimeout = useRef(null);
  const pauseIconTimeout = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const { data } = await videoAPI.feed({ limit: 50 });
      setVideos(data.videos);

      if (location.state?.videoId) {
        const idx = data.videos.findIndex((v) => v.id === location.state.videoId);
        if (idx !== -1) setCurrentIndex(idx);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subtitles
  useEffect(() => {
    if (videos[currentIndex]?.subtitle_text) {
      try {
        setSubtitles(JSON.parse(videos[currentIndex].subtitle_text));
      } catch {
        setSubtitles([]);
      }
    } else {
      setSubtitles([]);
    }
    setCurrentSubtitle('');
    setProgress(0);
  }, [currentIndex, videos]);

  const handleProgress = ({ playedSeconds, played }) => {
    setProgress(played);
    const activeSub = subtitles.find(
      (s) => playedSeconds >= s.start && playedSeconds <= s.end
    );
    setCurrentSubtitle(activeSub?.text || '');
  };

  // Navigation with slide animation
  const goTo = useCallback((newIndex, direction) => {
    if (isTransitioning) return;
    if (newIndex < 0 || newIndex >= videos.length) return;
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setPlaying(true);
      setSlideDirection('none');
      setIsTransitioning(false);
    }, 280);
  }, [isTransitioning, videos.length]);

  const goToPrev = useCallback(() => goTo(currentIndex - 1, 'down'), [currentIndex, goTo]);
  const goToNext = useCallback(() => goTo(currentIndex + 1, 'up'), [currentIndex, goTo]);

  // Auto-advance when video ends
  const handleVideoEnd = () => {
    if (currentIndex < videos.length - 1) {
      goToNext();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); goToPrev(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goToNext(); }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'm' || e.key === 'M') setMuted((m) => !m);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, playing, goToPrev, goToNext]);

  // Mouse wheel scroll (with debounce)
  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      e.preventDefault();
      if (scrollLock.current) return;
      const threshold = 30;
      if (Math.abs(e.deltaY) < threshold) return;
      scrollLock.current = true;
      if (e.deltaY > 0) goToNext();
      else goToPrev();
      setTimeout(() => { scrollLock.current = false; }, 600);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [goToNext, goToPrev]);

  // Touch swipe gestures
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e) => {
    touchDeltaY.current = touchStartY.current - e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 60;
    if (Math.abs(touchDeltaY.current) > swipeThreshold) {
      if (touchDeltaY.current > 0) goToNext();
      else goToPrev();
    }
    touchDeltaY.current = 0;
  };

  // Tap / double-tap handler
  const togglePlay = () => {
    setPlaying((p) => {
      if (!p) return true;
      // Show pause icon briefly
      setShowPauseIcon(true);
      clearTimeout(pauseIconTimeout.current);
      pauseIconTimeout.current = setTimeout(() => setShowPauseIcon(false), 800);
      return false;
    });
  };

  const handleTap = (e) => {
    // Ignore taps on side actions area
    const rect = feedRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    if (tapX > rect.right - 70) return; // side actions zone

    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap → like
      const vid = videos[currentIndex];
      if (vid) {
        setLiked((prev) => ({ ...prev, [vid.id]: true }));
        setShowHeart(true);
        clearTimeout(heartTimeout.current);
        heartTimeout.current = setTimeout(() => setShowHeart(false), 1000);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      // Single tap → toggle play (delayed to check for double tap)
      setTimeout(() => {
        if (lastTap.current !== 0 && Date.now() - lastTap.current >= 280) {
          togglePlay();
          lastTap.current = 0;
        }
      }, 300);
    }
  };

  // Seek via progress bar
  const handleProgressBarClick = (e) => {
    e.stopPropagation();
    const bar = progressBarRef.current;
    if (!bar || !playerRef.current) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(fraction, 'fraction');
    setProgress(fraction);
  };

  const currentVideo = videos[currentIndex];

  // Slide animation styles
  const getSlideStyle = () => {
    if (slideDirection === 'up') return { transform: 'translateY(-100%)', opacity: 0 };
    if (slideDirection === 'down') return { transform: 'translateY(100%)', opacity: 0 };
    return { transform: 'translateY(0)', opacity: 1 };
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center p-8">
          <p className="text-5xl mb-4">📹</p>
          <h2 className="text-xl font-bold mb-2 text-white">No videos yet</h2>
          <p className="text-gray-400 mb-6">Generate some videos first!</p>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Generate Videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-black flex items-center justify-center overflow-hidden select-none"
      ref={feedRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Container - 9:16 */}
      <div
        className="relative h-full w-full max-w-[calc(100vh*9/16)] mx-auto bg-black"
        style={{
          ...getSlideStyle(),
          transition: slideDirection !== 'none' ? 'transform 0.28s cubic-bezier(.4,0,.2,1), opacity 0.28s ease' : 'none',
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all"
        >
          <FiArrowLeft size={20} />
        </button>

        {/* Video counter */}
        <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md rounded-full px-3 py-1 text-xs font-semibold text-white/80">
          {currentIndex + 1} / {videos.length}
        </div>

        {/* Video Player */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleTap}
        >
          <ReactPlayer
            ref={playerRef}
            url={videoAPI.streamUrl(currentVideo.id)}
            playing={playing}
            muted={muted}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onProgress={handleProgress}
            onDuration={(d) => setDuration(d)}
            onEnded={handleVideoEnd}
            progressInterval={100}
            config={{
              file: {
                attributes: {
                  style: { objectFit: 'cover' },
                  playsInline: true,
                },
              },
            }}
          />
        </div>

        {/* Double-tap heart animation */}
        {showHeart && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="animate-ping-once">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="#ef4444" className="drop-shadow-lg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Pause / Play indicator */}
        {(!playing || showPauseIcon) && !showPractical && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div
              className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center"
              style={{ animation: 'fadeInScale 0.2s ease' }}
            >
              {!playing ? (
                <div className="w-0 h-0 border-l-[22px] border-l-white border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent ml-1.5" />
              ) : (
                <div className="flex gap-1.5">
                  <div className="w-[5px] h-6 bg-white rounded-sm" />
                  <div className="w-[5px] h-6 bg-white rounded-sm" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtitle overlay */}
        {currentSubtitle && (
          <div className="absolute bottom-36 left-0 right-0 z-20 text-center px-6">
            <div className="inline-block bg-black/60 backdrop-blur-md rounded-xl px-5 py-2.5 max-w-[90%]">
              <p className="text-white text-base font-medium leading-relaxed">{currentSubtitle}</p>
            </div>
          </div>
        )}

        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-16 z-20 p-5 pb-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          <h3 className="text-white font-bold text-base mb-1 leading-tight">{currentVideo.title}</h3>
          <p className="text-white/55 text-sm line-clamp-2 leading-snug">{currentVideo.question}</p>
          {currentVideo.duration && (
            <p className="text-white/35 text-xs mt-1.5">
              {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')} • EduVid AI
            </p>
          )}
        </div>

        {/* Side Actions */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const vid = videos[currentIndex];
              setLiked((prev) => ({ ...prev, [vid.id]: !prev[vid.id] }));
            }}
            className="flex flex-col items-center gap-1 transition-all"
          >
            <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              liked[currentVideo?.id]
                ? 'bg-red-500/30 text-red-400 scale-110'
                : 'bg-black/30 text-white/70 hover:text-red-400'
            }`}>
              <FiHeart size={21} fill={liked[currentVideo?.id] ? 'currentColor' : 'none'} />
            </div>
            <span className="text-[10px] text-white/60">Like</span>
          </button>

          {/* Save */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const vid = videos[currentIndex];
              setSaved((prev) => ({ ...prev, [vid.id]: !prev[vid.id] }));
            }}
            className="flex flex-col items-center gap-1 transition-all"
          >
            <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              saved[currentVideo?.id]
                ? 'bg-indigo-500/30 text-indigo-400 scale-110'
                : 'bg-black/30 text-white/70 hover:text-indigo-400'
            }`}>
              <FiBookmark size={21} fill={saved[currentVideo?.id] ? 'currentColor' : 'none'} />
            </div>
            <span className="text-[10px] text-white/60">Save</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-green-400 transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              <FiShare2 size={21} />
            </div>
            <span className="text-[10px] text-white/60">Share</span>
          </button>

          {/* Mute / Unmute */}
          <button
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-yellow-400 transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
              {muted ? <FiVolumeX size={21} /> : <FiVolume2 size={21} />}
            </div>
            <span className="text-[10px] text-white/60">{muted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Practical Mode */}
          <button
            onClick={(e) => { e.stopPropagation(); setPlaying(false); setShowPractical(true); }}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-cyan-400 transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 backdrop-blur-md flex items-center justify-center border border-cyan-400/20">
              <FiCamera size={21} />
            </div>
              <span className="text-[10px] text-white/60">Practical</span>
            </button>
        </div>

        {/* Navigation arrows */}
        <div className="absolute left-1/2 -translate-x-1/2 top-16 z-30">
          {currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all"
            >
              <FiChevronUp size={22} />
            </button>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-30">
          {currentIndex < videos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all animate-bounce"
            >
              <FiChevronDown size={22} />
            </button>
          )}
        </div>

        {/* Progress bar (Instagram-style at bottom) */}
        <div
          ref={progressBarRef}
          className="absolute bottom-0 left-0 right-0 z-30 h-[3px] bg-white/10 cursor-pointer group"
          onClick={handleProgressBarClick}
        >
          <div
            className="h-full bg-white/90 transition-[width] duration-100 ease-linear group-hover:h-[5px] group-hover:bg-white"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Practical Mode Overlay */}
      {showPractical && (
        <PracticalMode onClose={() => { setShowPractical(false); setPlaying(true); }} />
      )}

      {/* Inline styles for animations */}
      <style>{`
        @keyframes fadeInScale {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-ping-once {
          animation: pingHeart 0.8s ease-out forwards;
        }
        @keyframes pingHeart {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(0.95); opacity: 1; }
          80% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
