import { useState, useEffect } from 'react';
import { videoAPI } from '../api';
import { useVideoStore } from '../store';
import VideoCard from '../components/VideoCard';
import toast from 'react-hot-toast';

import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Skeleton,
  Card,
  CardContent,
  alpha,
  useTheme,
} from '@mui/material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';

export default function MyVideos() {
  const { videos, setVideos } = useVideoStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const theme = useTheme();

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
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <VideocamRoundedIcon sx={{ color: 'primary.main' }} />
            My Videos
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {videos.length} videos total
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshRoundedIcon />}
          onClick={loadVideos}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <FilterListRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
        {filters.map(({ key, label }) => (
          <Chip
            key={key}
            label={label}
            size="small"
            onClick={() => setFilter(key)}
            variant={filter === key ? 'filled' : 'outlined'}
            color={filter === key ? 'primary' : 'default'}
            sx={{
              fontWeight: 500,
              ...(filter !== key && {
                borderColor: alpha(theme.palette.text.primary, 0.12),
                '&:hover': { borderColor: alpha(theme.palette.text.primary, 0.25) },
              }),
            }}
          />
        ))}
      </Box>

      {/* Video Grid */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Card>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '16/9' }} />
                <CardContent>
                  <Skeleton width="75%" sx={{ mb: 1 }} />
                  <Skeleton width="50%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : filteredVideos.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <VideocamRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            {filter === 'all' ? 'No videos yet' : `No ${filter} videos`}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {filter === 'all'
              ? 'Generate your first video to see it here!'
              : 'Try a different filter'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filteredVideos.map((video) => (
            <Grid item xs={12} sm={6} lg={4} key={video.id}>
              <VideoCard video={video} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
