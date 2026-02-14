import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiChat, HiPencil } from 'react-icons/hi';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { chatService } from '../services/chatService';

interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    dp_url: string | null;
    bio: string | null;
    is_profile_public: boolean;
}

export default function ProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { profile: currentUser } = useAuthStore();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);

    const fetchUserProfile = async () => {
        if (!userId) return;
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, full_name, dp_url, bio, is_profile_public')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setUser(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('User not found');
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async () => {
        if (!currentUser?.id || !user?.id) return;

        try {
            const chat = await chatService.getOrCreateChat(currentUser.id, user.id);
            if (chat) {
                navigate(`/chat/${chat.id}`);
            }
        } catch (err) {
            console.error('Error starting chat:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4">
                <p className="text-xl font-semibold mb-2">User not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-primary hover:underline"
                >
                    Go back
                </button>
            </div>
        );
    }

    const isOwnProfile = currentUser?.id === user.id;

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <h1 className="text-xl font-semibold">Profile</h1>
            </header>

            <div className="max-w-md mx-auto p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center"
                >
                    {/* Avatar */}
                    <div className="relative mb-4">
                        {user.dp_url ? (
                            <img
                                src={user.dp_url}
                                alt={user.full_name}
                                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
                                {user.full_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Name & Bio */}
                    <h2 className="text-2xl font-bold mb-1">{user.full_name}</h2>
                    <p className="text-gray-500 mb-4">@{user.username}</p>

                    {user.bio && (
                        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xs">
                            {user.bio}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 w-full max-w-xs">
                        {isOwnProfile ? (
                            <motion.button
                                onClick={() => navigate('/settings')}
                                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <HiPencil className="text-xl" />
                                Edit Profile
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={handleStartChat}
                                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 rounded-xl font-medium"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <HiChat className="text-xl" />
                                Message
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {/* Additional Info / Stats could go here */}
                {/* For example, Join Date, Last Seen (if privacy allows), etc. */}
            </div>
        </div>
    );
}
