import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiSearch, HiChat } from 'react-icons/hi';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chatService';
import ChatListItem from '../components/chat/ChatListItem';

export default function HomePage() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const { chats, setChats, setLoadingChats, isLoadingChats } = useChatStore();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (profile?.id) {
            loadChats();

            // Subscribe to chat updates
            const subscription = chatService.subscribeToChats(profile.id, loadChats);

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [profile?.id]);

    const loadChats = async () => {
        if (!profile?.id) return;

        setLoadingChats(true);
        const userChats = await chatService.getChats(profile.id);
        setChats(userChats);
        setLoadingChats(false);
    };

    // Filter chats based on search
    const filteredChats = chats.filter((chat) => {
        const otherUser = chat.other_user;
        if (!otherUser) return false;

        const query = searchQuery.toLowerCase();
        return (
            otherUser.username.toLowerCase().includes(query) ||
            otherUser.full_name.toLowerCase().includes(query)
        );
    });

    return (
        <div className="h-full">
            {/* Header */}
            <header className="sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Chats</h1>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Search chats..."
                    />
                </div>
            </header>

            {/* Chat List */}
            <div className="p-4 space-y-2">
                {isLoadingChats ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="flex-1">
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                                <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))
                ) : filteredChats.length > 0 ? (
                    filteredChats.map((chat, index) => (
                        <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <ChatListItem
                                chat={chat}
                                currentUserId={profile?.id || ''}
                                onClick={() => navigate(`/chat/${chat.id}`)}
                            />
                        </motion.div>
                    ))
                ) : (
                    <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <HiChat className="mx-auto text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500">No chats yet</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Search for users to start chatting
                        </p>
                        <motion.button
                            onClick={() => navigate('/search')}
                            className="btn-primary mt-4"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Find People
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
