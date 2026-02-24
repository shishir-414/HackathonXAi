import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../api';

// MUI Components
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardMedia,
  Chip,
  Skeleton,
  Fade,
  Button,
  useTheme,
  alpha,
} from '@mui/material';

// MUI Icons
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import OndemandVideoRoundedIcon from '@mui/icons-material/OndemandVideoRounded';
import BoltIcon from '@mui/icons-material/Bolt';

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data } = await videoAPI.feed({ limit: 50 });
      setVideos(data.videos);
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId) => {
    navigate('/feed', { state: { videoId } });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
          Explore Videos
        </Typography>
        <Grid container spacing={2.5}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
              <Skeleton variant="rounded" sx={{ aspectRatio: '9/16', borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (videos.length === 0) {
    return (
      <Box
        sx={{
          maxWidth: 480,
          mx: 'auto',
          textAlign: 'center',
          py: 12,
          px: 3,
        }}
      >
        <OndemandVideoRoundedIcon sx={{ fontSize: 72, color: 'text.secondary', opacity: 0.25, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          No videos yet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
          Ask a question or upload your notes to generate your first video!
        </Typography>
        <Button
          variant="contained"
          startIcon={<BoltIcon />}
          size="large"
          onClick={() => navigate('/generate')}
        >
          Generate Your First Video
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 3, md: 5 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
        Explore Videos
      </Typography>

      <Grid container spacing={2.5}>
        {videos.map((video, index) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={video.id}>
            <Fade in timeout={300 + index * 80}>
              <Card
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    boxShadow: `0 16px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
                    '& .play-overlay': { opacity: 1 },
                    '& .card-media': { transform: 'scale(1.05)' },
                  },
                }}
                onClick={() => handleVideoClick(video.id)}
              >
                <CardActionArea sx={{ position: 'relative' }}>
                  {/* Thumbnail */}
                  <Box sx={{ position: 'relative', aspectRatio: '9/16', overflow: 'hidden', bgcolor: 'background.paper' }}>
                    {video.thumbnail_path ? (
                      <CardMedia
                        component="img"
                        image={videoAPI.thumbnailUrl(video.id)}
                        alt={video.title}
                        className="card-media"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.4s ease',
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                        }}
                      >
                        <OndemandVideoRoundedIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                      </Box>
                    )}

                    {/* Play overlay on hover */}
                    <Box
                      className="play-overlay"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    >
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          bgcolor: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(8px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlayArrowRoundedIcon sx={{ fontSize: 32, color: 'white' }} />
                      </Box>
                    </Box>

                    {/* Duration badge */}
                    {video.duration && (
                      <Chip
                        icon={<AccessTimeRoundedIcon sx={{ fontSize: 13 }} />}
                        label={formatDuration(video.duration)}
                        size="small"
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(4px)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 24,
                          '& .MuiChip-icon': { color: 'rgba(255,255,255,0.7)' },
                        }}
                      />
                    )}

                    {/* Bottom gradient + title */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 1.5,
                        pt: 5,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3), transparent)',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                        }}
                      >
                        {video.title}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
