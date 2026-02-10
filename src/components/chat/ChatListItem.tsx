import { formatDistanceToNow } from '../../utils/dateHelpers';
import type { Chat } from '../../store/chatStore';

interface Props {
    chat: Chat;
    currentUserId: string;
    onClick: () => void;
}

export default function ChatListItem({ chat, currentUserId, onClick }: Props) {
    const otherUser = chat.other_user;
    if (!otherUser) return null;

    const lastMessage = chat.last_message;
    const isUnread = (chat.unread_count || 0) > 0;

    const getMessagePreview = () => {
        if (!lastMessage) return 'No messages yet';

        const isSent = lastMessage.sender_id === currentUserId;
        const prefix = isSent ? 'You: ' : '';

        if (lastMessage.message_type === 'image') {
            return `${prefix}📷 Photo`;
        }

        const content = lastMessage.content || '';
        const truncated = content.length > 30 ? content.slice(0, 30) + '...' : content;
        return `${prefix}${truncated}`;
    };

    return (
        <button
            onClick={onClick}
            className="chat-list-item w-full text-left"
        >
            {/* Avatar */}
            <div className="relative">
                {otherUser.dp_url ? (
                    <img
                        src={otherUser.dp_url}
                        alt={otherUser.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg font-bold">
                        {otherUser.full_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={`font-medium truncate ${isUnread ? 'font-bold' : ''}`}>
                        {otherUser.full_name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {lastMessage ? formatDistanceToNow(lastMessage.created_at) : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate ${isUnread ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                        {getMessagePreview()}
                    </p>
                    {isUnread && (
                        <span className="ml-2 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-primary rounded-full">
                            {chat.unread_count}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
