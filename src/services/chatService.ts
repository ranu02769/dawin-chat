import { supabase } from '../lib/supabase';
import { type Chat, type Message } from '../store/chatStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const chatService = {
    // Get all chats for a user
    async getChats(userId: string): Promise<Chat[]> {
        const { data, error } = await supabase
            .from('chats')
            .select(`
        *,
        user1:users!chats_user1_id_fkey(id, username, full_name, dp_url),
        user2:users!chats_user2_id_fkey(id, username, full_name, dp_url)
      `)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Get chats error:', error);
            return [];
        }

        // Map to include other_user
        const chats = await Promise.all(
            data.map(async (chat) => {
                const other_user = chat.user1_id === userId ? chat.user2 : chat.user1;
                const lastMessage = await this.getLastMessage(chat.id);
                const unreadCount = await this.getUnreadCount(chat.id, userId);

                return {
                    ...chat,
                    other_user,
                    last_message: lastMessage,
                    unread_count: unreadCount,
                };
            })
        );

        return chats as Chat[];
    },

    // Get last message for a chat
    async getLastMessage(chatId: string): Promise<Message | null> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data as Message;
    },

    // Get unread count for a chat
    async getUnreadCount(chatId: string, userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .eq('is_read', false)
            .neq('sender_id', userId);

        if (error) return 0;
        return count || 0;
    },

    // Get or create a chat between two users
    async getOrCreateChat(userId1: string, userId2: string): Promise<Chat | null> {
        // Ensure consistent ordering
        const [user1_id, user2_id] = [userId1, userId2].sort();

        // Check if chat exists
        const { data: existingChat } = await supabase
            .from('chats')
            .select('*')
            .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
            .single();

        if (existingChat) return existingChat as Chat;

        // Create new chat
        const { data: newChat, error: createError } = await supabase
            .from('chats')
            .insert({ user1_id, user2_id })
            .select()
            .single();

        if (createError) {
            console.error('Create chat error:', createError);
            return null;
        }

        return newChat as Chat;
    },

    // Get messages for a chat
    async getMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Get messages error:', error);
            return [];
        }

        return (data as Message[]).reverse();
    },

    // Send a message
    async sendMessage(
        chatId: string,
        senderId: string,
        content: string,
        messageType: 'text' | 'image' | 'emoji' = 'text',
        imageUrl?: string
    ): Promise<Message | null> {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                chat_id: chatId,
                sender_id: senderId,
                content,
                message_type: messageType,
                image_url: imageUrl || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Send message error:', error);
            return null;
        }

        return data as Message;
    },

    // Mark messages as read
    async markAsRead(chatId: string, userId: string): Promise<void> {
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('chat_id', chatId)
            .neq('sender_id', userId)
            .eq('is_read', false);
    },

    // Subscribe to new messages in a chat
    subscribeToChat(chatId: string, callback: (message: Message) => void): RealtimeChannel {
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    console.log('[Realtime] New message received:', payload.new);
                    callback(payload.new as Message);
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Chat ${chatId} subscription status:`, status);
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] Successfully subscribed to chat ${chatId}`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`[Realtime] Error subscribing to chat ${chatId}`);
                }
            });

        return channel;
    },

    // Subscribe to all chats updates
    subscribeToChats(userId: string, callback: () => void): RealtimeChannel {
        return supabase
            .channel(`user_chats:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                },
                () => {
                    callback();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    callback();
                }
            )
            .subscribe();
    },

    // Upload chat image
    async uploadImage(userId: string, file: File): Promise<string | null> {
        const fileName = `${userId}/${Date.now()}.${file.name.split('.').pop()}`;

        const { error } = await supabase.storage
            .from('chat-images')
            .upload(fileName, file);

        if (error) {
            console.error('Upload image error:', error);
            return null;
        }

        const { data } = supabase.storage
            .from('chat-images')
            .getPublicUrl(fileName);

        return data.publicUrl;
    },
};
