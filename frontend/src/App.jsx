import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import GeneratePage from './pages/GeneratePage';
import UploadPage from './pages/UploadPage';
import VideoFeed from './pages/VideoFeed';
import MyVideos from './pages/MyVideos';
import PracticalPage from './pages/PracticalPage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function GradeGatedRoute({ children, maxGrade }) {
  const { user } = useAuthStore();
  if (user?.grade == null || user.grade > maxGrade) return <Navigate to="/" replace />;
  return children;
}

function AuthRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-950 text-white">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid #333',
            },
          }}
        />
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <Dashboard />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/generate" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <GeneratePage />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <UploadPage />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/feed" element={
            <ProtectedRoute>
              <VideoFeed />
            </ProtectedRoute>
          } />
          <Route path="/my-videos" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <MyVideos />
                </main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/practical" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <PracticalPage />
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}
