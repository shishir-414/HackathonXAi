import { useState, useEffect } from 'react';
import { videoAPI } from '../api';
import { useVideoStore } from '../store';
import VideoCard from '../components/VideoCard';
import toast from 'react-hot-toast';
import { FiVideo, FiFilter, FiRefreshCw } from 'react-icons/fi';

export default function MyVideos() {
  const { videos, setVideos } = useVideoStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const { data } = await videoAPI.list({ limit: 100 });
      setVideos(data.videos);
    } catch (err) {
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return;
    try {
      await videoAPI.delete(id);
      setVideos(videos.filter((v) => v.id !== id));
      toast.success('Video deleted');
    } catch (err) {
      toast.error('Failed to delete video');
    }
  };

  const filteredVideos = filter === 'all'
    ? videos
    : videos.filter((v) => v.status === filter);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'processing', label: 'Processing' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FiVideo className="text-primary-400" />
            My Videos
          </h1>
          <p className="text-dark-400 text-sm mt-1">{videos.length} videos total</p>
        </div>
        <button
          onClick={loadVideos}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FiRefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <FiFilter size={16} className="text-dark-500 flex-shrink-0" />
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-dark-900 text-dark-400 hover:text-white border border-dark-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
              <div className="aspect-video bg-dark-800 loading-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-dark-800 rounded loading-pulse w-3/4" />
                <div className="h-3 bg-dark-800 rounded loading-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="card text-center py-16">
          <FiVideo size={48} className="mx-auto text-dark-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === 'all' ? 'No videos yet' : `No ${filter} videos`}
          </h3>
          <p className="text-dark-400">
            {filter === 'all'
              ? 'Generate your first video to see it here!'
              : 'Try a different filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
