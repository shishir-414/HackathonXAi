import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Chip,
  Tooltip,
  useTheme,
  alpha,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';

import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const links = [
    { to: '/', label: 'Home', icon: <HomeRoundedIcon sx={{ fontSize: 20 }} /> },
    { to: '/generate', label: 'Generate', icon: <AutoAwesomeIcon sx={{ fontSize: 20 }} /> },
    { to: '/upload', label: 'Upload', icon: <CloudUploadOutlinedIcon sx={{ fontSize: 20 }} /> },
    { to: '/practical', label: 'Practical', icon: <CameraAltOutlinedIcon sx={{ fontSize: 20 }} /> },
    { to: '/my-videos', label: 'My Videos', icon: <VideoLibraryOutlinedIcon sx={{ fontSize: 20 }} /> },
  ];

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%', px: { xs: 1.5, sm: 3 } }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                fontWeight: 800,
                fontSize: '0.9rem',
                borderRadius: 2,
              }}
            >
              E
            </Avatar>
            {!isMobile && (
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                EduVid AI
              </Typography>
            )}
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Nav Links */}
          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
              {links.map(({ to, label, icon }) => {
                const isActive = location.pathname === to;
                return (
                  <Button
                    key={to}
                    component={Link}
                    to={to}
                    startIcon={icon}
                    size="small"
                    sx={{
                      borderRadius: 2.5,
                      px: 2,
                      py: 0.8,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: isActive ? 'primary.main' : 'text.secondary',
                      bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                      border: isActive
                        ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        : '1px solid transparent',
                      '&:hover': {
                        bgcolor: isActive
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.text.primary, 0.05),
                        color: isActive ? 'primary.main' : 'text.primary',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </Stack>
          )}

          {/* User Avatar + Menu */}
          <Tooltip title={user?.username || 'Account'}>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                p: 0.5,
                border: `2px solid ${menuOpen ? theme.palette.primary.main : 'transparent'}`,
                borderRadius: 2.5,
                transition: 'border-color 0.2s',
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 220,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                },
              },
            }}
          >
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {user?.full_name || user?.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user?.email}
              </Typography>
              {user?.grade && (
                <Chip
                  icon={<SchoolRoundedIcon sx={{ fontSize: 14 }} />}
                  label={`Grade ${user.grade}`}
                  size="small"
                  sx={{
                    mt: 1,
                    display: 'flex',
                    width: 'fit-content',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.light',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24,
                  }}
                />
              )}
            </Box>
            <Divider sx={{ borderColor: 'divider' }} />
            <MenuItem
              onClick={() => { setAnchorEl(null); }}
              sx={{ py: 1.5, px: 2.5 }}
            >
              <ListItemIcon>
                <PersonOutlineRoundedIcon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary="Profile"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              />
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                px: 2.5,
                color: 'error.main',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
            >
              <ListItemIcon>
                <LogoutRoundedIcon sx={{ fontSize: 20, color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              />
            </MenuItem>
          </Menu>

          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{ ml: 1, color: 'text.secondary' }}
            >
              <MenuRoundedIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.default',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
          <IconButton onClick={() => setMobileOpen(false)} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'divider' }} />
        <List sx={{ px: 1, pt: 1 }}>
          {links.map(({ to, label, icon }) => {
            const isActive = location.pathname === to;
            return (
              <ListItem key={to} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.5,
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ borderColor: 'divider' }} />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => { setMobileOpen(false); handleLogout(); }}
            sx={{ borderRadius: 2.5 }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
