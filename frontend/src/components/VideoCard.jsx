import { videoAPI } from '../api';
import { useNavigate } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardMedia,
  Box,
  Typography,
  Chip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';

const STATUS_CONFIG = {
  pending: { icon: AccessTimeRoundedIcon, color: '#facc15', label: 'Pending' },
  processing: { icon: SyncRoundedIcon, color: '#60a5fa', label: 'Processing' },
  completed: { icon: CheckCircleRoundedIcon, color: '#4ade80', label: 'Ready' },
  failed: { icon: ErrorOutlineRoundedIcon, color: '#f87171', label: 'Failed' },
};

export default function VideoCard({ video, onDelete, compact = false }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const config = STATUS_CONFIG[video.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const handlePlay = () => {
    if (video.status === 'completed') {
      navigate('/feed', { state: { videoId: video.id } });
    }
  };

  return (
    <Card
      sx={{
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
        },
        '&:hover .play-overlay': { opacity: 1 },
        '&:hover .delete-btn': { opacity: 1 },
      }}
    >
      {/* Thumbnail */}
      <Box
        onClick={handlePlay}
        sx={{
          position: 'relative',
          aspectRatio: '16/9',
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          cursor: video.status === 'completed' ? 'pointer' : 'default',
          overflow: 'hidden',
        }}
      >
        {video.status === 'completed' && video.thumbnail_path ? (
          <Box
            component="img"
            src={videoAPI.thumbnailUrl(video.id)}
            alt={video.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StatusIcon
              sx={{
                fontSize: 32,
                color: config.color,
                ...(video.status === 'processing' && {
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                }),
              }}
            />
          </Box>
        )}

        {/* Play overlay */}
        {video.status === 'completed' && (
          <Box
            className="play-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.4)',
              opacity: 0,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlayArrowRoundedIcon sx={{ fontSize: 24, color: 'white', ml: 0.3 }} />
            </Box>
          </Box>
        )}

        {/* Duration badge */}
        {video.duration && (
          <Chip
            label={`${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '0.7rem',
              height: 24,
            }}
          />
        )}
      </Box>

      {/* Info */}
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1,
          }}
        >
          {video.title}
        </Typography>

        {!compact && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 1.5,
            }}
          >
            {video.question}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            icon={
              <StatusIcon
                sx={{
                  fontSize: 12,
                  color: `${config.color} !important`,
                  ...(video.status === 'processing' && {
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                  }),
                }}
              />
            }
            label={config.label}
            size="small"
            sx={{
              bgcolor: alpha(config.color, 0.1),
              color: config.color,
              fontSize: '0.7rem',
              height: 24,
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />

          {onDelete && (
            <IconButton
              className="delete-btn"
              onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
              size="small"
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s',
                color: 'text.disabled',
                '&:hover': { color: 'error.main' },
              }}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
