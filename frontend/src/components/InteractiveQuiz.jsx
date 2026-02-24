import { useState, useEffect } from 'react';
import { practicalAPI } from '../api';

import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Chip,
  alpha,
} from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

export default function InteractiveQuiz({ topic, onClose, onNextQuiz }) {
  const [quiz, setQuiz] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setSelectedIndex(null);
    setResult(null);
    try {
      const { data } = await practicalAPI.getQuiz(topic);
      setQuiz(data);
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (index) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);

    try {
      const { data } = await practicalAPI.checkAnswer(
        topic,
        index,
        quiz.correct_index
      );
      setResult(data);
      setScore((prev) => ({
        correct: prev.correct + (data.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error('Failed to check answer:', err);
      const isCorrect = index === quiz.correct_index;
      setResult({
        is_correct: isCorrect,
        explanation: isCorrect ? 'Correct!' : 'Not quite right.',
      });
      setScore((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    }
  };

  if (loading) {
    return (
      <Card
        sx={{
          maxWidth: 360,
          mx: 'auto',
          bgcolor: 'rgba(30,30,50,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: alpha('#fff', 0.08),
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading quiz...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!quiz) {
    return (
      <Card
        sx={{
          maxWidth: 360,
          mx: 'auto',
          bgcolor: 'rgba(30,30,50,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: alpha('#fff', 0.08),
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            No quiz available for this topic.
          </Typography>
          <Button variant="contained" onClick={onClose} size="small" sx={{ textTransform: 'none' }}>
            Back to Camera
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        maxWidth: 360,
        mx: 'auto',
        bgcolor: 'rgba(30,30,50,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid',
        borderColor: alpha('#fff', 0.08),
        p: 2.5,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsRoundedIcon sx={{ fontSize: 18, color: '#facc15' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Quick Quiz
          </Typography>
        </Box>
        <Chip
          label={`${score.correct}/${score.total} correct`}
          size="small"
          sx={{
            bgcolor: alpha('#fff', 0.06),
            color: 'text.secondary',
            fontSize: '0.7rem',
            height: 24,
          }}
        />
      </Box>

      {/* Question */}
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2, lineHeight: 1.6 }}>
        {quiz.question}
      </Typography>

      {/* Options */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {quiz.options.map((option, index) => {
          let sx = {
            textAlign: 'left',
            px: 2,
            py: 1.5,
            borderRadius: 3,
            textTransform: 'none',
            justifyContent: 'flex-start',
            border: '1px solid',
            transition: 'all 0.2s',
            gap: 1.5,
          };

          let icon = null;

          if (selectedIndex !== null) {
            if (index === quiz.correct_index) {
              sx = { ...sx, borderColor: alpha('#22c55e', 0.5), bgcolor: alpha('#22c55e', 0.08) };
              icon = <CheckRoundedIcon sx={{ fontSize: 16, color: '#4ade80' }} />;
            } else if (index === selectedIndex && index !== quiz.correct_index) {
              sx = { ...sx, borderColor: alpha('#ef4444', 0.5), bgcolor: alpha('#ef4444', 0.08) };
              icon = <CloseRoundedIcon sx={{ fontSize: 16, color: '#f87171' }} />;
            } else {
              sx = { ...sx, borderColor: alpha('#fff', 0.04), opacity: 0.5 };
            }
          } else {
            sx = {
              ...sx,
              borderColor: alpha('#fff', 0.08),
              '&:hover': { borderColor: alpha('#6366f1', 0.5), bgcolor: alpha('#fff', 0.03) },
            };
          }

          return (
            <Button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={selectedIndex !== null}
              fullWidth
              sx={sx}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: alpha('#fff', 0.06),
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                }}
              >
                {String.fromCharCode(65 + index)}
              </Avatar>
              <Typography variant="body2" sx={{ flex: 1, color: 'white' }}>
                {option}
              </Typography>
              {icon}
            </Button>
          );
        })}
      </Box>

      {/* Result explanation */}
      {result && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 3,
            lineHeight: 1.6,
            mb: 2,
            bgcolor: result.is_correct ? alpha('#22c55e', 0.08) : alpha('#f59e0b', 0.08),
            border: '1px solid',
            borderColor: result.is_correct ? alpha('#22c55e', 0.25) : alpha('#f59e0b', 0.25),
            color: result.is_correct ? '#86efac' : '#fcd34d',
          }}
        >
          <Typography variant="caption" sx={{ lineHeight: 1.6 }}>
            {result.is_correct ? '🎉 ' : '💡 '}
            {result.explanation}
          </Typography>
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {result && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<RefreshRoundedIcon sx={{ fontSize: 14 }} />}
            onClick={loadQuiz}
            sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.85rem' }}
          >
            Next Question
          </Button>
        )}
        <Button
          onClick={onClose}
          sx={{
            flex: result ? 'none' : 1,
            px: result ? 2 : undefined,
            textTransform: 'none',
            bgcolor: alpha('#fff', 0.06),
            color: 'text.secondary',
            '&:hover': { bgcolor: alpha('#fff', 0.1) },
          }}
        >
          {result ? 'Done' : 'Skip'}
        </Button>
      </Box>
    </Card>
  );
}
