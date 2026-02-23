import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { videoAPI } from '../api';
import { useAuthStore, useVideoStore } from '../store';
import VideoCard from '../components/VideoCard';
import { FiVideo, FiUpload, FiPlay, FiTrendingUp, FiZap } from 'react-icons/fi';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { videos, setVideos } = useVideoStore();
  const [stats, setStats] = useState({ total: 0, completed: 0, processing: 0 });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data } = await videoAPI.list({ limit: 6 });
      setVideos(data.videos);
      setStats({
        total: data.total,
        completed: data.videos.filter((v) => v.status === 'completed').length,
        processing: data.videos.filter((v) => v.status === 'processing' || v.status === 'pending').length,
      });
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  };

  const quickQuestions = [
    'What is photosynthesis?',
    'How does gravity work?',
    'Explain the water cycle',
    'What are cells made of?',
    'How do magnets work?',
    'What causes earthquakes?',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Section */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Hey, <span className="gradient-text">{user?.full_name || user?.username}</span>! 👋
        </h1>
        <p className="text-dark-400 text-lg">Ready to learn something new today?</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          to="/generate"
          className="glass-card hover:bg-white/10 transition-all duration-300 group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center group-hover:bg-primary-600/30 transition-all">
            <FiZap size={24} className="text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold">Ask a Question</h3>
            <p className="text-sm text-dark-400">Generate a video instantly</p>
          </div>
        </Link>

        <Link
          to="/upload"
          className="glass-card hover:bg-white/10 transition-all duration-300 group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-all">
            <FiUpload size={24} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold">Upload Notes</h3>
            <p className="text-sm text-dark-400">Auto-generate Q&A videos</p>
          </div>
        </Link>

        <Link
          to="/feed"
          className="glass-card hover:bg-white/10 transition-all duration-300 group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-all">
            <FiPlay size={24} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold">Watch Feed</h3>
            <p className="text-sm text-dark-400">Swipe through videos</p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary-400">{stats.total}</div>
          <div className="text-sm text-dark-400">Total Videos</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-dark-400">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.processing}</div>
          <div className="text-sm text-dark-400">In Progress</div>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FiTrendingUp className="text-primary-400" />
          Quick Questions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickQuestions.map((q) => (
            <Link
              key={q}
              to={`/generate?q=${encodeURIComponent(q)}`}
              className="bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-primary-500/30 rounded-xl p-4 text-sm text-dark-300 hover:text-white transition-all duration-200"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Videos */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FiVideo className="text-primary-400" />
              Recent Videos
            </h2>
            <Link to="/my-videos" className="text-sm text-primary-400 hover:text-primary-300">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.slice(0, 6).map((video) => (
              <VideoCard key={video.id} video={video} compact />
            ))}
          </div>
        </div>
      )}

      {videos.length === 0 && (
        <div className="card text-center py-16">
          <FiVideo size={48} className="mx-auto text-dark-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
          <p className="text-dark-400 mb-6">Ask a question or upload your notes to get started!</p>
          <Link to="/generate" className="btn-primary inline-flex items-center gap-2">
            <FiZap size={18} />
            Generate Your First Video
          </Link>
        </div>
      )}
    </div>
  );
}
