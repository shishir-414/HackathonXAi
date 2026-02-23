import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { videoAPI } from '../api';
import { FiArrowLeft, FiHeart, FiShare2, FiBookmark, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function VideoFeed() {
  const location = useLocation();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const feedRef = useRef(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const { data } = await videoAPI.feed({ limit: 50 });
      setVideos(data.videos);

      // If navigated with a specific video, find its index
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

  useEffect(() => {
    if (videos[currentIndex]?.subtitle_text) {
      try {
        const subs = JSON.parse(videos[currentIndex].subtitle_text);
        setSubtitles(subs);
      } catch {
        setSubtitles([]);
      }
    } else {
      setSubtitles([]);
    }
  }, [currentIndex, videos]);

  const handleProgress = ({ playedSeconds }) => {
    const activeSub = subtitles.find(
      (s) => playedSeconds >= s.start && playedSeconds <= s.end
    );
    setCurrentSubtitle(activeSub?.text || '');
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setPlaying(true);
    }
  };

  const goToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPlaying(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') goToPrev();
    if (e.key === 'ArrowDown') goToNext();
    if (e.key === ' ') {
      e.preventDefault();
      setPlaying(!playing);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, playing]);

  const currentVideo = videos[currentIndex];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center p-8">
          <p className="text-4xl mb-4">📹</p>
          <h2 className="text-xl font-bold mb-2">No videos yet</h2>
          <p className="text-dark-400 mb-6">Generate some videos first!</p>
          <Link to="/generate" className="btn-primary">
            Generate Videos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center overflow-hidden" ref={feedRef}>
      {/* Video Container - 9:16 aspect ratio */}
      <div className="relative h-full w-full max-w-[calc(100vh*9/16)] mx-auto bg-dark-950">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all"
        >
          <FiArrowLeft size={20} />
        </button>

        {/* Video counter */}
        <div className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
          {currentIndex + 1} / {videos.length}
        </div>

        {/* Video Player */}
        <div className="absolute inset-0 flex items-center justify-center" onClick={() => setPlaying(!playing)}>
          <ReactPlayer
            url={videoAPI.streamUrl(currentVideo.id)}
            playing={playing}
            loop
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onProgress={handleProgress}
            progressInterval={100}
            config={{
              file: {
                attributes: {
                  style: { objectFit: 'cover' },
                },
              },
            }}
          />
        </div>

        {/* Subtitle overlay */}
        {currentSubtitle && (
          <div className="absolute bottom-32 left-0 right-0 z-20 text-center px-6">
            <div className="inline-block bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 max-w-full">
              <p className="text-white text-lg font-medium leading-relaxed">{currentSubtitle}</p>
            </div>
          </div>
        )}

        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 className="text-white font-bold text-lg mb-1">{currentVideo.title}</h3>
          <p className="text-white/60 text-sm line-clamp-2">{currentVideo.question}</p>
          {currentVideo.duration && (
            <p className="text-white/40 text-xs mt-2">
              {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')} • EduVid AI
            </p>
          )}
        </div>

        {/* Side Actions */}
        <div className="absolute right-4 bottom-40 z-20 flex flex-col items-center gap-6">
          <button className="flex flex-col items-center gap-1 text-white/70 hover:text-red-400 transition-all">
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <FiHeart size={20} />
            </div>
            <span className="text-xs">Like</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/70 hover:text-primary-400 transition-all">
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <FiBookmark size={20} />
            </div>
            <span className="text-xs">Save</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/70 hover:text-green-400 transition-all">
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <FiShare2 size={20} />
            </div>
            <span className="text-xs">Share</span>
          </button>
        </div>

        {/* Navigation arrows */}
        <div className="absolute left-1/2 -translate-x-1/2 top-16 z-30">
          {currentIndex > 0 && (
            <button
              onClick={goToPrev}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-all"
            >
              <FiChevronUp size={24} />
            </button>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-30">
          {currentIndex < videos.length - 1 && (
            <button
              onClick={goToNext}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-all animate-bounce"
            >
              <FiChevronDown size={24} />
            </button>
          )}
        </div>

        {/* Pause indicator */}
        {!playing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
