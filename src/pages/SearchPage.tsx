import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiSearch, HiUserCircle, HiSparkles } from 'react-icons/hi';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface SearchResult {
    id: string;
    username: string;
    full_name: string;
    dp_url: string | null;
    bio: string | null;
    is_profile_public: boolean;
}

export default function SearchPage() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (searchQuery: string) => {
        setQuery(searchQuery);

        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);

        const { data, error } = await supabase
            .from('users')
            .select('id, username, full_name, dp_url, bio, is_profile_public')
            .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
            .neq('id', profile?.id)
            .limit(20);

        if (!error && data) {
            setResults(data);
        }

        setIsSearching(false);
    };


    return (
        <div className="min-h-full">
            {/* Header */}
            <header className="sticky top-0 z-10 p-4 bg-background-light dark:bg-background-dark">
                <h1 className="text-2xl font-bold mb-4">Search</h1>

                {/* Random Chat Button */}
                <motion.button
                    onClick={() => navigate('/random-chat')}
                    className="w-full mb-4 py-3 px-4 rounded-xl gradient-primary flex items-center justify-center gap-3 text-black font-medium shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <HiSparkles className="text-xl" />
                    Random Chat
                </motion.button>

                {/* Search Input */}
                <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Search by username..."
                    />
                </div>
            </header>

            {/* Results */}
            <div className="p-4 space-y-2">
                {isSearching ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : results.length > 0 ? (
                    results.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/user/${user.id}`)}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {user.dp_url ? (
                                <img
                                    src={user.dp_url}
                                    alt={user.full_name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold">
                                    {user.full_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.full_name}</p>
                                <p className="text-sm text-gray-500">@{user.username}</p>
                                {user.is_profile_public && user.bio && (
                                    <p className="text-sm text-gray-400 truncate mt-1">{user.bio}</p>
                                )}
                            </div>
                        </motion.div>
                    ))
                ) : query.length >= 2 ? (
                    <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <HiUserCircle className="mx-auto text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500">No users found</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Try a different search term
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <HiSearch className="mx-auto text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500">Search for users</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Find people by username or name
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
