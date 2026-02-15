import { supabase } from '../lib/supabase';
import { useAuthStore, type UserProfile } from '../store/authStore';

export interface SignUpData {
    email: string;
    password: string;
    full_name: string;
    username: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
}

export interface SignInData {
    email: string;
    password: string;
}

// Flag to prevent duplicate session checks (React StrictMode protection)
let isCheckingSession = false;
let hasInitialized = false;

// Promise cache to deduplicate profile fetches
let profileFetchPromise: Promise<{ profile: UserProfile | null; needsSetup: boolean }> | null = null;

export const authService = {
    // Sign up a new user
    async signUp(data: SignUpData): Promise<{ success: boolean; error?: string }> {
        try {
            // 1. Create auth user with metadata
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.full_name,
                        username: data.username,
                        date_of_birth: data.date_of_birth,
                        gender: data.gender,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('User creation failed');

            // 2. Profile creation is handled by database trigger 'on_auth_user_created'
            // We wait a brief moment to ensure trigger has fired if we need to return profile immediately,
            // but for signup flow we just return success.

            return { success: true };
        } catch (error: any) {
            console.error('Sign up error:', error);

            let errorMessage = 'Sign up failed';

            // Handle specific Supabase errors
            if (error?.message) {
                if (error.message.includes('rate limit')) {
                    errorMessage = 'Too many attempts. Please check your email for a confirmation link or wait a minute.';
                } else if (error.message.includes('User already registered')) {
                    errorMessage = 'Account already exists for this email. Please sign in instead.';
                } else {
                    errorMessage = error.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    },

    // Sign in existing user
    async signIn(data: SignInData): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Sign in error:', error);

            let errorMessage = 'Sign in failed';

            if (error?.message) {
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'Invalid email or password. If you don\'t have an account, please Sign Up first.';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'Please confirm your email address before signing in.';
                } else {
                    errorMessage = error.message;
                }
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    },

    // Sign in with Google OAuth
    async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'https:')
                        ? window.location.origin
                        : 'com.dawinchat.app://google-auth',
                    skipBrowserRedirect: false,
                }
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: (error as Error).message };
        }
    },

    // Set session from tokens (for deep linking)
    async setSession(access_token: string, refresh_token: string): Promise<{ success: boolean; error?: string }> {
        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
        });

        if (error) {
            console.error('Set session error:', error);
            return { success: false, error: error.message };
        }

        // We can optionally explicitly check session here to ensure we return 'done' only when profile is ready
        // But since onAuthStateChange will also fire, we just want to ensure we don't start a conflicting fetch.
        // Calling checkCurrentSession() here is safe because we will implement deduplication below.
        if (data.session) {
            await this.checkCurrentSession();
        }

        return { success: true };
    },

    // Sign out
    async signOut(): Promise<void> {
        await supabase.auth.signOut();
        useAuthStore.getState().logout();
    },

    // Get current session
    async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    // Get user profile
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Get profile error:', error);
            return null;
        }

        return data as UserProfile;
    },

    // Get or create profile for OAuth users
    async getOrCreateProfile(userId: string, email: string, fullName?: string): Promise<{ profile: UserProfile | null; needsSetup: boolean }> {
        // Return existing promise if a fetch is already in progress
        if (profileFetchPromise) {
            return profileFetchPromise;
        }

        profileFetchPromise = (async () => {
            try {
                // First try to get existing profile
                const { data: existingProfile, error: fetchError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (existingProfile) {
                    // Check if profile needs setup (missing required fields)
                    // Auto-generated usernames follow pattern: user_XXXXXX_XXXX
                    const isAutoGeneratedUsername = !existingProfile.username ||
                        /^user_[a-f0-9]{6}_[a-z0-9]+$/.test(existingProfile.username);
                    const needsSetup = isAutoGeneratedUsername ||
                        !existingProfile.date_of_birth ||
                        !existingProfile.gender;
                    return { profile: existingProfile as UserProfile, needsSetup };
                }

                // Profile doesn't exist - this is an OAuth user, create minimal profile
                if (fetchError && fetchError.code === 'PGRST116') {
                    // Generate unique username
                    const timestamp = Date.now().toString(36);
                    const username = `user_${userId.substring(0, 6)}_${timestamp}`;

                    const { data: newProfile, error: insertError } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            email: email,
                            full_name: fullName || email.split('@')[0],
                            username: username,
                            date_of_birth: null,
                            gender: null,
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Create profile error:', insertError);

                        // If insertion failed (e.g., duplicate key because trigger created it), try fetching again
                        const { data: retryProfile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', userId)
                            .single();

                        if (retryProfile) {
                            return { profile: retryProfile as UserProfile, needsSetup: true }; // Assume setup needed if we just battled a race condition
                        }

                        // Even if we can't create/fetch profile, still allow login - they just won't have a profile yet
                        return { profile: null, needsSetup: true };
                    }

                    return { profile: newProfile as UserProfile, needsSetup: true };
                }

                // Some other error occurred
                if (fetchError) {
                    console.error('Get profile error:', fetchError);
                }

                return { profile: null, needsSetup: false };
            } catch (err) {
                console.error('getOrCreateProfile exception:', err);
                return { profile: null, needsSetup: false };
            } finally {
                profileFetchPromise = null; // Clear promise when done
            }
        })();

        return profileFetchPromise;
    },

    // Update user profile
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Update profile error:', error);
            return false;
        }

        return true;
    },

    // Check username availability
    async checkUsernameAvailable(username: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (error && error.code === 'PGRST116') {
            // No rows returned = username available
            return true;
        }

        return !data;
    },

    // Reset password
    async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Password reset failed'
            };
        }
    },

    // Initialize auth state listener
    initAuthListener() {
        // Prevent duplicate initialization from React StrictMode
        if (hasInitialized) {
            console.log('[Auth] Already initialized, skipping duplicate init');
            return { data: { subscription: { unsubscribe: () => { } } } };
        }
        hasInitialized = true;

        // Set up the auth state change listener
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Auth event:', event);
            const { setUser, setProfile, setLoading, setNeedsProfileSetup } = useAuthStore.getState();

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setNeedsProfileSetup(false);
                setLoading(false);
                return;
            }

            // For INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED
            if (session?.user) {
                setUser(session.user);

                // Only fetch profile if we don't already have one (for fresh logins)
                const currentProfile = useAuthStore.getState().profile;
                if (!currentProfile || currentProfile.id !== session.user.id) {
                    try {
                        const { profile, needsSetup } = await this.getOrCreateProfile(
                            session.user.id,
                            session.user.email || '',
                            session.user.user_metadata?.full_name
                        );
                        setProfile(profile);
                        setNeedsProfileSetup(needsSetup);
                    } catch (err) {
                        // Ignore AbortError from StrictMode unmounts
                        if (err instanceof Error && err.name === 'AbortError') {
                            console.log('[Auth] Profile fetch aborted (StrictMode)');
                            return;
                        }
                        console.error('[Auth] Profile fetch error:', err);
                    }
                }
                setLoading(false);
            } else if (event === 'INITIAL_SESSION') {
                // INITIAL_SESSION but no user -> likely not logged in
                setLoading(false);
            }
        });

        return { data };
    },

    // Check current session on app load
    async checkCurrentSession() {
        // Prevent duplicate session checks from React StrictMode
        if (isCheckingSession) {
            console.log('[Auth] Session check already in progress, skipping');
            return;
        }
        isCheckingSession = true;

        console.log('[Auth] Starting session check...');
        const { setUser, setProfile, setLoading, setNeedsProfileSetup, profile: cachedProfile } = useAuthStore.getState();

        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            // Handle AbortError gracefully (React StrictMode causes this)
            if (error) {
                if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                    console.log('[Auth] Session check aborted (StrictMode), will retry');
                    isCheckingSession = false;
                    return;
                }
                console.error('[Auth] Session check error:', error);
                setUser(null);
                setProfile(null);
                setNeedsProfileSetup(false);
                setLoading(false);
                isCheckingSession = false;
                return;
            }

            if (session?.user) {
                console.log('[Auth] User found:', session.user.email);
                setUser(session.user);

                // OPTIMIZATION: Use cached profile if it exists and matches current user
                if (cachedProfile && cachedProfile.id === session.user.id) {
                    console.log('[Auth] Using cached profile');
                    setProfile(cachedProfile);
                    // Still check if setup is needed based on cache
                    const isAutoGeneratedUsername = !cachedProfile.username ||
                        /^user_[a-f0-9]{6}_[a-z0-9]+$/.test(cachedProfile.username);
                    const needsSetup = isAutoGeneratedUsername ||
                        !cachedProfile.date_of_birth ||
                        !cachedProfile.gender;
                    setNeedsProfileSetup(needsSetup);
                    setLoading(false);

                    // Optional: Re-validate in background if needed, but for speed we trust cache first
                } else {
                    try {
                        const { profile, needsSetup } = await this.getOrCreateProfile(
                            session.user.id,
                            session.user.email || '',
                            session.user.user_metadata?.full_name
                        );
                        setProfile(profile);
                        setNeedsProfileSetup(needsSetup);
                    } catch (err) {
                        // Ignore AbortError
                        if (err instanceof Error && err.name === 'AbortError') {
                            console.log('[Auth] Profile fetch aborted');
                            isCheckingSession = false;
                            return;
                        }
                        console.error('[Auth] Profile fetch error:', err);
                    }
                }
            } else {
                console.log('[Auth] No session found');
                setUser(null);
                setProfile(null);
                setNeedsProfileSetup(false);
            }

            setLoading(false);
        } catch (error) {
            // Handle AbortError gracefully
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('[Auth] Session check aborted');
                isCheckingSession = false;
                return;
            }
            console.error('[Auth] Session check exception:', error);
            setUser(null);
            setProfile(null);
            setNeedsProfileSetup(false);
            setLoading(false);
        } finally {
            isCheckingSession = false;
        }
    },
};

