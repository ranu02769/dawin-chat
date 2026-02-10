import { create } from 'zustand';

export interface Chat {
    id: string;
    user1_id: string;
    user2_id: string;
    created_at: string;
    updated_at: string;
    other_user?: {
        id: string;
        username: string;
        full_name: string;
        dp_url: string | null;
    };
    last_message?: Message;
    unread_count?: number;
}

export interface Message {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string | null;
    message_type: 'text' | 'image' | 'emoji';
    image_url: string | null;
    is_read: boolean;
    created_at: string;
}

interface ChatState {
    chats: Chat[];
    activeChat: Chat | null;
    messages: Message[];
    isLoadingChats: boolean;
    isLoadingMessages: boolean;
    setChats: (chats: Chat[]) => void;
    addChat: (chat: Chat) => void;
    setActiveChat: (chat: Chat | null) => void;
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    setLoadingChats: (loading: boolean) => void;
    setLoadingMessages: (loading: boolean) => void;
    updateChatLastMessage: (chatId: string, message: Message) => void;
    markMessagesAsRead: (chatId: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
    chats: [],
    activeChat: null,
    messages: [],
    isLoadingChats: false,
    isLoadingMessages: false,

    setChats: (chats) => set({ chats }),

    addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),

    setActiveChat: (activeChat) => set({ activeChat }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
    })),

    updateMessage: (id, updates) => set((state) => ({
        messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
        ),
    })),

    setLoadingChats: (isLoadingChats) => set({ isLoadingChats }),

    setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

    updateChatLastMessage: (chatId, message) => set((state) => ({
        chats: state.chats.map((chat) =>
            chat.id === chatId
                ? { ...chat, last_message: message, updated_at: message.created_at }
                : chat
        ).sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    })),

    markMessagesAsRead: (chatId) => set((state) => ({
        messages: state.messages.map((m) =>
            m.chat_id === chatId ? { ...m, is_read: true } : m
        ),
        chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        ),
    })),
}));
