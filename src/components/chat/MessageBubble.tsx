import { motion } from 'framer-motion';
import type { Message } from '../../store/chatStore';
import { formatTime } from '../../utils/dateHelpers';

interface Props {
    message: Message;
    isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
    const renderContent = () => {
        switch (message.message_type) {
            case 'image':
                return (
                    <motion.img
                        src={message.image_url || ''}
                        alt="Shared image"
                        className="max-w-full max-h-64 rounded-lg cursor-pointer"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => window.open(message.image_url || '', '_blank')}
                    />
                );

            case 'emoji':
                return (
                    <span className="text-4xl">{message.content}</span>
                );

            default:
                return (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                );
        }
    };

    return (
        <motion.div
            className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className={isOwn ? 'message-bubble-sent' : 'message-bubble-received'}>
                {renderContent()}
                <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'justify-end text-gray-700' : 'text-gray-500'}`}>
                    <span>{formatTime(message.created_at)}</span>
                    {isOwn && (
                        <span>
                            {message.is_read ? '✓✓' : '✓'}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
