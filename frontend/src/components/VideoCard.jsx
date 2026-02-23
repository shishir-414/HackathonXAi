import { videoAPI } from '../api';
import { FiClock, FiCheckCircle, FiAlertCircle, FiLoader, FiTrash2, FiPlay } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  pending: { icon: FiClock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
  processing: { icon: FiLoader, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Processing' },
  completed: { icon: FiCheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Ready' },
  failed: { icon: FiAlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
};

export default function VideoCard({ video, onDelete, compact = false }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[video.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const handlePlay = () => {
    if (video.status === 'completed') {
      navigate('/feed', { state: { videoId: video.id } });
    }
  };

  return (
    <div className="video-card group">
      {/* Thumbnail / Preview */}
      <div
        className="relative aspect-video bg-dark-800 overflow-hidden cursor-pointer"
        onClick={handlePlay}
      >
        {video.status === 'completed' && video.thumbnail_path ? (
          <img
            src={videoAPI.thumbnailUrl(video.id)}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${config.color}`}>
              <StatusIcon size={32} className={video.status === 'processing' ? 'animate-spin' : ''} />
            </div>
          </div>
        )}

        {/* Play overlay */}
        {video.status === 'completed' && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiPlay size={20} className="text-white ml-1" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-white line-clamp-2 mb-2">{video.title}</h3>

        {!compact && (
          <p className="text-xs text-dark-500 line-clamp-2 mb-3">{video.question}</p>
        )}

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-xs ${config.color} ${config.bg} px-2 py-1 rounded-full`}>
            <StatusIcon size={12} className={video.status === 'processing' ? 'animate-spin' : ''} />
            <span>{config.label}</span>
          </div>

          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
              className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-800 transition-all opacity-0 group-hover:opacity-100"
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
