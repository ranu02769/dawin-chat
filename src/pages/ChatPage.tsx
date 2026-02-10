import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiPhotograph, HiEmojiHappy, HiPaperAirplane } from 'react-icons/hi';
import EmojiPicker from 'emoji-picker-react';
import { useAuthStore } from '../store/authStore';
import { useChatStore, type Message } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { supabase } from '../lib/supabase';
import MessageBubble from '../components/chat/MessageBubble';
import { formatDate } from '../utils/dateHelpers';

export default function ChatPage() {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const { messages, setMessages, addMessage, setLoadingMessages, isLoadingMessages } = useChatStore();

    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [otherUser, setOtherUser] = useState<{ id: string; username: string; full_name: string; dp_url: string | null } | null>(null);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (chatId && profile?.id) {
            loadChatData();

            // Subscribe to new messages
            const subscription = chatService.subscribeToChat(chatId, (newMessage) => {
                addMessage(newMessage);
                // Mark as read if from other user
                if (newMessage.sender_id !== profile.id) {
                    chatService.markAsRead(chatId, profile.id);
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [chatId, profile?.id]);

    useEffect(() => {
        // Scroll to bottom on new messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadChatData = async () => {
        if (!chatId || !profile?.id) return;

        setLoadingMessages(true);

        // Get chat details
        const { data: chatData } = await supabase
            .from('chats')
            .select(`
        *,
        user1:users!chats_user1_id_fkey(id, username, full_name, dp_url),
        user2:users!chats_user2_id_fkey(id, username, full_name, dp_url)
      `)
            .eq('id', chatId)
            .single();

        if (chatData) {
            const other = chatData.user1_id === profile.id ? chatData.user2 : chatData.user1;
            setOtherUser(other);
        }

        // Get messages
        const chatMessages = await chatService.getMessages(chatId);
        setMessages(chatMessages);

        // Mark messages as read
        await chatService.markAsRead(chatId, profile.id);

        setLoadingMessages(false);
    };

    const handleSend = async () => {
        if (!input.trim() || !chatId || !profile?.id || isSending) return;

        const messageContent = input.trim();
        setInput('');
        setShowEmojiPicker(false);
        setIsSending(true);

        // Determine message type
        const isEmoji = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(messageContent) && messageContent.length <= 8;

        await chatService.sendMessage(
            chatId,
            profile.id,
            messageContent,
            isEmoji ? 'emoji' : 'text'
        );

        setIsSending(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatId || !profile?.id) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            return;
        }

        setIsSending(true);
        const imageUrl = await chatService.uploadImage(profile.id, file);

        if (imageUrl) {
            await chatService.sendMessage(chatId, profile.id, '', 'image', imageUrl);
        }

        setIsSending(false);
        e.target.value = '';
    };

    const handleEmojiSelect = (emojiData: { emoji: string }) => {
        setInput((prev) => prev + emojiData.emoji);
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = formatDate(message.created_at);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {} as Record<string, Message[]>);

    return (
        <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                <motion.button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <HiArrowLeft className="text-xl" />
                </motion.button>

                {otherUser && (
                    <div className="flex items-center gap-3">
                        {otherUser.dp_url ? (
                            <img
                                src={otherUser.dp_url}
                                alt={otherUser.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold">
                                {otherUser.full_name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="font-medium">{otherUser.full_name}</p>
                            <p className="text-xs text-gray-500">@{otherUser.username}</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {isLoadingMessages ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, msgs]) => (
                        <div key={date}>
                            <div className="flex justify-center mb-4">
                                <span className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
                                    {date}
                                </span>
                            </div>
                            {msgs.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwn={message.sender_id === profile?.id}
                                />
                            ))}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 right-4 z-20">
                    <EmojiPicker
                        onEmojiClick={handleEmojiSelect}
                        width="100%"
                        height={350}
                    />
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-500 hover:text-primary transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiEmojiHappy className="text-2xl" />
                    </motion.button>

                    <motion.button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-primary transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiPhotograph className="text-2xl" />
                    </motion.button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />

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
                        disabled={!input.trim() || isSending}
                        className="p-3 bg-primary rounded-full text-black disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <HiPaperAirplane className="text-xl rotate-90" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
