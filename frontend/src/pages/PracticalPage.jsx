import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PracticalMode from './PracticalMode';

import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';

const STEPS = [
  { icon: SmartphoneRoundedIcon, color: '#22d3ee', title: '1. Open Camera', desc: 'AI loads in your browser — no data leaves your device' },
  { icon: BoltRoundedIcon, color: '#22d3ee', title: '2. Point at Objects', desc: 'Bottles, books, phones, fruits, plants — anything!' },
  { icon: MenuBookRoundedIcon, color: '#22d3ee', title: '3. Learn Features', desc: "See what it's made of, how it works, and fun science facts" },
  { icon: HelpOutlineRoundedIcon, color: '#a855f7', title: '4. Take a Quiz', desc: 'Test your knowledge with questions about each object' },
];

export default function PracticalPage() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const theme = useTheme();

  if (started) {
    return <PracticalMode onClose={() => setStarted(false)} />;
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/')}
        sx={{ color: 'text.secondary', mb: 4, textTransform: 'none' }}
      >
        Back to Dashboard
      </Button>

      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #22d3ee, #2563eb)',
            mb: 2.5,
            boxShadow: '0 8px 24px rgba(34,211,238,0.3)',
          }}
        >
          <CameraAltRoundedIcon sx={{ fontSize: 34 }} />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
          Object Explorer
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400, mx: 'auto', lineHeight: 1.7 }}>
          Point your camera at any object around you — AI will identify it and
          show you interesting facts, science, and educational features about it!
        </Typography>
      </Box>

      {/* How it works */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            How it works
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {STEPS.map(({ icon: Icon, color, title, desc }) => (
              <Box key={title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: alpha(color, 0.15),
                    mt: 0.25,
                  }}
                >
                  <Icon sx={{ fontSize: 14, color }} />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Start button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<CameraAltRoundedIcon />}
        onClick={() => setStarted(true)}
        sx={{
          py: 1.8,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0891b2, #2563eb)',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 8px 24px rgba(34,211,238,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            boxShadow: '0 8px 28px rgba(34,211,238,0.4)',
            transform: 'scale(1.02)',
          },
          '&:active': { transform: 'scale(0.98)' },
          transition: 'all 0.2s',
        }}
      >
        Start Exploring
      </Button>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', mt: 2 }}>
        Works best with good lighting. Supports 20+ common objects.
      </Typography>
    </Box>
  );
}
