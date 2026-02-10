import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiBan, HiPaperAirplane, HiEmojiHappy } from 'react-icons/hi';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface RandomMessage {
    id: string;
    content: string;
    sender_id: string;
    message_type: 'text' | 'emoji';
    created_at: string;
}

interface MatchedUser {
    id: string;
    username: string;
}

export default function RandomChatPage() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();

    const [status, setStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);
    const [messages, setMessages] = useState<RandomMessage[]>([]);
    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            findRandomPartner();
        }

        return () => {
            // Disconnect on unmount
            if (sessionId) {
                disconnectSession();
            }
        };
    }, [profile?.id]);

    useEffect(() => {
        if (sessionId) {
            // Subscribe to messages
            const subscription = supabase
                .channel(`random:${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'random_chat_messages',
                    filter: `session_id=eq.${sessionId}`,
                }, (payload) => {
                    setMessages((prev) => [...prev, payload.new as RandomMessage]);
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'random_chat_sessions',
                    filter: `id=eq.${sessionId}`,
                }, (payload) => {
                    if (payload.new && !(payload.new as { is_active: boolean }).is_active) {
                        setStatus('disconnected');
                        toast('Partner disconnected');
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [sessionId]);

    const findRandomPartner = async () => {
        if (!profile?.id) return;

        setStatus('searching');

        // Find users not in active sessions
        const { data: activeSessions } = await supabase
            .from('random_chat_sessions')
            .select('user1_id, user2_id')
            .eq('is_active', true);

        const busyUserIds = activeSessions?.flatMap(s => [s.user1_id, s.user2_id]) || [];
        busyUserIds.push(profile.id);

        // Get random available user
        const { data: availableUsers } = await supabase
            .from('users')
            .select('id, username')
            .not('id', 'in', `(${busyUserIds.join(',')})`)
            .eq('is_active', true)
            .limit(10);

        if (!availableUsers || availableUsers.length === 0) {
            toast('No users available. Please try again later.');
            setStatus('disconnected');
            return;
        }

        // Pick random user
        const partner = availableUsers[Math.floor(Math.random() * availableUsers.length)];

        // Create session
        const { data: session, error } = await supabase
            .from('random_chat_sessions')
            .insert({
                user1_id: profile.id,
                user2_id: partner.id,
            })
            .select()
            .single();

        if (error) {
            toast.error('Failed to start random chat');
            setStatus('disconnected');
            return;
        }

        setSessionId(session.id);
        setMatchedUser(partner);
        setStatus('connected');

        // Add system message
        setMessages([{
            id: 'system-1',
            content: `Connected with @${partner.username}! Say hello 👋`,
            sender_id: 'system',
            message_type: 'text',
            created_at: new Date().toISOString(),
        }]);
    };

    const disconnectSession = async () => {
        if (!sessionId) return;

        await supabase
            .from('random_chat_sessions')
            .update({ is_active: false, disconnected_at: new Date().toISOString() })
            .eq('id', sessionId);

        setStatus('disconnected');
    };

    const handleSend = async () => {
        if (!input.trim() || !sessionId || !profile?.id || status !== 'connected') return;

        const content = input.trim();
        setInput('');
        setShowEmojiPicker(false);

        const isEmoji = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]+$/u.test(content);

        await supabase.from('random_chat_messages').insert({
            session_id: sessionId,
            sender_id: profile.id,
            content,
            message_type: isEmoji ? 'emoji' : 'text',
        });
    };

    const handleDisconnect = () => {
        disconnectSession();
        toast.success('Disconnected from random chat');
    };

    const handleFindNew = () => {
        setMessages([]);
        setMatchedUser(null);
        setSessionId(null);
        findRandomPartner();
    };

    return (
        <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={() => navigate('/search')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        whileHover={{ x: -2 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiArrowLeft className="text-xl" />
                    </motion.button>
                    <div>
                        <p className="font-medium">Random Chat</p>
                        {matchedUser && status === 'connected' && (
                            <p className="text-sm text-gray-500">@{matchedUser.username}</p>
                        )}
                    </div>
                </div>

                {status === 'connected' && (
                    <motion.button
                        onClick={handleDisconnect}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiBan className="text-xl" />
                    </motion.button>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {status === 'searching' && (
                    <motion.div
                        className="flex flex-col items-center justify-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-lg font-medium">Finding a random chat partner...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                    </motion.div>
                )}

                {status === 'disconnected' && (
                    <motion.div
                        className="flex flex-col items-center justify-center h-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <HiBan className="text-6xl text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-lg font-medium">Chat ended</p>
                        <motion.button
                            onClick={handleFindNew}
                            className="btn-primary mt-4"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Find New Partner
                        </motion.button>
                    </motion.div>
                )}

                {status === 'connected' && (
                    <div className="space-y-3">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : msg.sender_id === 'system' ? 'justify-center' : 'justify-start'}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {msg.sender_id === 'system' ? (
                                    <span className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-full">
                                        {msg.content}
                                    </span>
                                ) : (
                                    <div className={msg.sender_id === profile?.id ? 'message-bubble-sent' : 'message-bubble-received'}>
                                        {msg.message_type === 'emoji' ? (
                                            <span className="text-3xl">{msg.content}</span>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && status === 'connected' && (
                <div className="absolute bottom-20 left-4 right-4 z-20">
                    <EmojiPicker
                        onEmojiClick={(e) => setInput((prev) => prev + e.emoji)}
                        width="100%"
                        height={350}
                    />
                </div>
            )}

            {/* Input */}
            {status === 'connected' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <motion.button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 text-gray-500 hover:text-primary transition-colors"
                            whileTap={{ scale: 0.95 }}
                        >
                            <HiEmojiHappy className="text-2xl" />
                        </motion.button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="input-field flex-1"
                        />

                        <motion.button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-3 bg-primary rounded-full text-black disabled:opacity-50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <HiPaperAirplane className="text-xl rotate-90" />
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
}
