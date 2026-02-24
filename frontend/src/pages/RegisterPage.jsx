import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  InputAdornment,
  CircularProgress,
  MenuItem,
  Grid,
  alpha,
  useTheme,
} from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    grade: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        grade: form.grade ? parseInt(form.grade) : null,
      };
      const { data } = await authAPI.register(payload);
      login(data.user, data.access_token);
      toast.success('Account created! Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: 384,
          height: 384,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: 384,
          height: 384,
          bgcolor: alpha(theme.palette.secondary.main, 0.08),
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />

      <Box sx={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              fontSize: '1.6rem',
              fontWeight: 800,
              mb: 2,
            }}
          >
            E
          </Avatar>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Join EduVid AI
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Start creating educational videos
          </Typography>
        </Box>

        {/* Form Card */}
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600, mb: 3 }}>
              Create Account
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                placeholder="Username *"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type="password"
                placeholder="Password *"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    placeholder="Full Name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    displayEmpty
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MenuBookRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    SelectProps={{ displayEmpty: true, renderValue: (v) => v ? `Grade ${v}` : 'Grade' }}
                  >
                    <MenuItem value="">
                      <em>Grade</em>
                    </MenuItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                      <MenuItem key={g} value={g}>
                        Grade {g}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                size="large"
                endIcon={!loading && <ArrowForwardRoundedIcon />}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>

              <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                Already have an account?{' '}
                <Typography
                  component={Link}
                  to="/login"
                  variant="body2"
                  sx={{ color: 'primary.light', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Sign In
                </Typography>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
