import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export const useVideoStore = create((set, get) => ({
  videos: [],
  feedVideos: [],
  currentVideo: null,
  loading: false,
  generating: false,

  setVideos: (videos) => set({ videos }),
  setFeedVideos: (feedVideos) => set({ feedVideos }),
  setCurrentVideo: (currentVideo) => set({ currentVideo }),
  setLoading: (loading) => set({ loading }),
  setGenerating: (generating) => set({ generating }),

  addVideo: (video) => set((state) => ({
    videos: [video, ...state.videos],
  })),

  updateVideo: (id, updates) => set((state) => ({
    videos: state.videos.map((v) =>
      v.id === id ? { ...v, ...updates } : v
    ),
  })),

  removeVideo: (id) => set((state) => ({
    videos: state.videos.filter((v) => v.id !== id),
  })),
}));
