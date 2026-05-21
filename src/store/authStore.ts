import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  currentUser: User | null;
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthLoading: true,
  setUser: (user) => set({ currentUser: user, isAuthLoading: false }),
  setLoading: (loading) => set({ isAuthLoading: loading }),
}));
