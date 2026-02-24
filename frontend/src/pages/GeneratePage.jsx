import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../api';
import { useVideoStore } from '../store';
import toast from 'react-hot-toast';

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Grid,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

const SUGGESTED_QUESTIONS = [
  { emoji: '🌿', q: 'What is photosynthesis?' },
  { emoji: '🌍', q: 'How does gravity work?' },
  { emoji: '💧', q: 'Explain the water cycle' },
  { emoji: '🧬', q: 'What are cells made of?' },
  { emoji: '⚡', q: 'What is electricity?' },
  { emoji: '🌋', q: 'What causes earthquakes?' },
  { emoji: '🔢', q: 'What is the Pythagorean theorem?' },
  { emoji: '🧪', q: 'What is an atom?' },
];

export default function GeneratePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(searchParams.get('q') || '');
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const { addVideo } = useVideoStore();
  const theme = useTheme();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuestion(q);
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setGenerating(true);
    setGeneratedVideo(null);

    try {
      const { data } = await videoAPI.generate({ question: question.trim() });
      setGeneratedVideo(data);
      addVideo(data);
      toast.success('Video generation started! It will be ready in about a minute.');
      pollVideoStatus(data.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  const pollVideoStatus = async (videoId) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await videoAPI.get(videoId);
        setGeneratedVideo(data);
        if (data.status === 'completed') {
          clearInterval(interval);
          toast.success('Video is ready! 🎬');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          toast.error('Video generation failed');
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 300000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            mb: 2,
          }}
        >
          <BoltRoundedIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Ask a Question
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Get an AI-generated educational video in seconds
        </Typography>
      </Box>

      {/* Input Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          <Box sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your question here... e.g., 'What is photosynthesis?'"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              sx={{
                '& .MuiInputBase-root': { pr: 7, fontSize: '1.1rem' },
              }}
            />
            <IconButton
              onClick={handleGenerate}
              disabled={generating || !question.trim()}
              sx={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
              }}
            >
              {generating ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />}
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
            Press Enter to generate, Shift+Enter for new line
          </Typography>
        </CardContent>
      </Card>

      {/* Generated Video Status */}
      {generatedVideo && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  bgcolor: alpha(
                    generatedVideo.status === 'completed'
                      ? theme.palette.success.main
                      : generatedVideo.status === 'failed'
                      ? theme.palette.error.main
                      : theme.palette.info.main,
                    0.15
                  ),
                  color:
                    generatedVideo.status === 'completed'
                      ? 'success.main'
                      : generatedVideo.status === 'failed'
                      ? 'error.main'
                      : 'info.main',
                }}
              >
                {generatedVideo.status === 'completed' ? (
                  <CheckCircleOutlineRoundedIcon />
                ) : generatedVideo.status === 'failed' ? (
                  <ErrorOutlineRoundedIcon />
                ) : (
                  <CircularProgress size={24} color="inherit" />
                )}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {generatedVideo.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {generatedVideo.status === 'completed'
                    ? `Ready! Duration: ${generatedVideo.duration}s`
                    : generatedVideo.status === 'failed'
                    ? 'Generation failed. Try again.'
                    : 'Generating your video...'}
                </Typography>
              </Box>
              {generatedVideo.status === 'completed' && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrowRoundedIcon />}
                  onClick={() => navigate('/feed', { state: { videoId: generatedVideo.id } })}
                >
                  Watch
                </Button>
              )}
            </Box>

            {generatedVideo.script && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, letterSpacing: 1 }}>
                  GENERATED SCRIPT
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.7 }}>
                  {generatedVideo.script}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggested Questions */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Try these questions
        </Typography>
        <Grid container spacing={1.5}>
          {SUGGESTED_QUESTIONS.map(({ emoji, q }) => (
            <Grid item xs={12} sm={6} key={q}>
              <Card
                onClick={() => setQuestion(q)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>{emoji}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {q}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
