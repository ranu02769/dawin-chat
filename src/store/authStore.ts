import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    username: string;
    date_of_birth: string | null;
    gender: 'male' | 'female' | 'other' | null;
    dp_url: string | null;
    bio: string | null;
    is_profile_public: boolean;
    show_last_seen: boolean;
    show_read_receipts: boolean;
    is_banned: boolean;
    theme_settings: Record<string, unknown>;
    last_username_change: string | null;
    is_active: boolean;
    created_at: string;
}

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    needsProfileSetup: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setNeedsProfileSetup: (needs: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            profile: null,
            isLoading: true,
            isAuthenticated: false,
            needsProfileSetup: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setProfile: (profile) => set({ profile }),
            setLoading: (isLoading) => set({ isLoading }),
            setNeedsProfileSetup: (needsProfileSetup) => set({ needsProfileSetup }),
            logout: () => set({
                user: null,
                profile: null,
                isAuthenticated: false,
                needsProfileSetup: false
            }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ profile: state.profile }),
        }
    )
);
