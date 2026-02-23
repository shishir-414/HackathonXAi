import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { FiHome, FiVideo, FiUpload, FiPlay, FiLogOut, FiUser } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Home', icon: FiHome },
    { to: '/generate', label: 'Generate', icon: FiVideo },
    { to: '/upload', label: 'Upload', icon: FiUpload },
    { to: '/feed', label: 'Feed', icon: FiPlay },
    { to: '/my-videos', label: 'My Videos', icon: FiVideo },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-sm font-bold">
              E
            </div>
            <span className="font-bold text-lg gradient-text hidden sm:block">EduVid AI</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === to
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon size={16} />
                <span className="hidden md:block">{label}</span>
              </Link>
            ))}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-dark-400">
              <FiUser size={14} />
              <span>{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-dark-800 transition-all"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
