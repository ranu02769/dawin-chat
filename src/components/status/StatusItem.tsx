import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi';
import { formatDistanceToNow } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';

interface Status {
    id: string;
    user_id: string;
    content: string;
    visibility: 'chat_list' | 'anyone';
    expires_at: string;
    created_at: string;
    user?: {
        id: string;
        username: string;
        full_name: string;
        dp_url: string | null;
    };
    views_count?: number;
    likes_count?: number;
    is_liked?: boolean;
}

interface StatusItemProps {
    status: Status;
    onView: (status: Status) => void;
    onLike: (status: Status, e: React.MouseEvent) => void;
    index: number;
}

const StatusItem = ({ status, onView, onLike, index }: StatusItemProps) => {
    // ... rest of component
    const navigate = useNavigate();
    const statusRef = useRef<HTMLDivElement>(null);
    const [hasViewed, setHasViewed] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasViewed) {
                    setHasViewed(true);
                    onView(status);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 } // Trigger when 50% visible
        );

        if (statusRef.current) {
            observer.observe(statusRef.current);
        }

        return () => observer.disconnect();
    }, [status, onView, hasViewed]);

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (status.user?.id) {
            navigate(`/user/${status.user.id}`);
        }
    };

    return (
        <motion.div
            ref={statusRef}
            className="card cursor-pointer relative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <div className="flex items-center gap-3 mb-2">
                <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleProfileClick}
                >
                    {status.user?.dp_url ? (
                        <img
                            src={status.user.dp_url}
                            alt={status.user.full_name}
                            className="w-10 h-10 rounded-full object-cover status-ring"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold status-ring" style={{ backgroundColor: 'var(--primary)', color: '#000' }}>
                            {status.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
                <div>
                    <p
                        className="font-medium cursor-pointer hover:underline"
                        style={{ color: 'var(--text)' }}
                        onClick={handleProfileClick}
                    >
                        {status.user?.full_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDistanceToNow(status.created_at)} ago
                    </p>
                </div>
            </div>
            <p className="text-lg mb-3" style={{ color: 'var(--text)' }}>{status.content}</p>

            {/* Like Button */}
            <button
                onClick={(e) => onLike(status, e)}
                className="flex items-center gap-1 text-sm transition-colors hover:opacity-80"
                style={{ color: status.is_liked ? '#EF4444' : 'var(--text-secondary)' }}
            >
                {status.is_liked ? <HiHeart className="text-xl" /> : <HiOutlineHeart className="text-xl" />}
                <span>{status.likes_count || 0}</span>
            </button>
        </motion.div>
    );
};

export default StatusItem;
