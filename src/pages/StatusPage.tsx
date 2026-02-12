// ... imports
import { HiPlus, HiEye, HiTrash, HiHeart, HiOutlineHeart } from 'react-icons/hi';
// ... other imports

interface Status {
    id: string;
    user_id: string;
    content: string;
    visibility: 'chat_list' | 'anyone';
    expires_at: string;
    created_at: string;
    user?: {
        username: string;
        full_name: string;
        dp_url: string | null;
    };
    views_count?: number;
    likes_count?: number;
    is_liked?: boolean;
}

export default function StatusPage() {
    const { profile } = useAuthStore();
    // ... state variables
    // Add real-time subscription for reactions
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('status_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'status_views' },
                (payload) => {
                    const newView = payload.new as { status_id: string; viewer_id: string };
                    setMyStatuses((current) => current.map(s =>
                        s.id === newView.status_id && newView.viewer_id !== profile.id
                            ? { ...s, views_count: (s.views_count || 0) + 1 }
                            : s
                    ));
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'status_reactions' },
                (payload) => {
                    const newReaction = payload.new as { status_id: string; user_id: string };
                    const oldReaction = payload.old as { status_id: string; user_id: string };

                    const updateStatusLikes = (statusList: Status[]) => statusList.map(s => {
                        if (payload.eventType === 'INSERT' && s.id === newReaction.status_id) {
                            return { ...s, likes_count: (s.likes_count || 0) + 1 };
                        }
                        if (payload.eventType === 'DELETE' && s.id === oldReaction.status_id) {
                            return { ...s, likes_count: Math.max(0, (s.likes_count || 0) - 1) };
                        }
                        return s;
                    });

                    setMyStatuses(current => updateStatusLikes(current));
                    setOtherStatuses(current => updateStatusLikes(current));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.id]);

    const loadStatuses = async () => {
        if (!profile?.id) return;
        setIsLoading(true);

        // helper to get counts
        const getStatusMetadata = async (statusId: string) => {
            const [views, likes, userLike] = await Promise.all([
                supabase.from('status_views').count().eq('status_id', statusId),
                supabase.from('status_reactions').count().eq('status_id', statusId),
                supabase.from('status_reactions').select('id').eq('status_id', statusId).eq('user_id', profile.id!).single()
            ]);
            return {
                views_count: views.count || 0,
                likes_count: likes.count || 0,
                is_liked: !!userLike.data
            };
        };

        // Get my statuses
        const { data: myData } = await supabase
            .from('statuses')
            .select('*')
            .eq('user_id', profile.id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (myData) {
            const enriched = await Promise.all(myData.map(async (s) => ({
                ...s,
                ...(await getStatusMetadata(s.id))
            })));
            setMyStatuses(enriched);
        }

        // Get other statuses
        const { data: otherData } = await supabase
            .from('statuses')
            .select('*, user:users(username, full_name, dp_url)')
            .neq('user_id', profile.id)
            .eq('visibility', 'anyone')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

        if (otherData) {
            const enriched = await Promise.all(otherData.map(async (s) => ({
                ...s,
                ...(await getStatusMetadata(s.id))
            })));
            setOtherStatuses(enriched);
        }
        setIsLoading(false);
    };

    const toggleLike = async (status: Status) => {
        if (!profile?.id) return;

        // Optimistic update
        const updateLikeState = (list: Status[]) => list.map(s =>
            s.id === status.id
                ? { ...s, is_liked: !s.is_liked, likes_count: s.is_liked ? (s.likes_count! - 1) : (s.likes_count! + 1) }
                : s
        );

        if (status.user_id === profile.id) {
            setMyStatuses(current => updateLikeState(current));
        } else {
            setOtherStatuses(current => updateLikeState(current));
        }

        if (status.is_liked) {
            await supabase.from('status_reactions').delete().eq('status_id', status.id).eq('user_id', profile.id);
        } else {
            await supabase.from('status_reactions').insert({ status_id: status.id, user_id: profile.id });
        }
    };

    export default function StatusPage() {
        const { profile } = useAuthStore();
        const [myStatuses, setMyStatuses] = useState<Status[]>([]);
        const [otherStatuses, setOtherStatuses] = useState<Status[]>([]);
        const [showCreateModal, setShowCreateModal] = useState(false);
        const [newStatus, setNewStatus] = useState('');
        const [visibility, setVisibility] = useState<'chat_list' | 'anyone'>('anyone');
        const [showEmojiPicker, setShowEmojiPicker] = useState(false);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            if (profile?.id) {
                loadStatuses();
            }
        }, [profile?.id]);

        // Realtime subscription for views
        useEffect(() => {
            if (!profile?.id) return;

            const channel = supabase
                .channel('status_view_updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'status_views',
                    },
                    (payload) => {
                        const newView = payload.new as { status_id: string; viewer_id: string };

                        // Update my statuses view count
                        setMyStatuses((current) =>
                            current.map((status) => {
                                if (status.id === newView.status_id) {
                                    // Prevent counting own views if filter fails (though RLS/logic should prevent it)
                                    if (newView.viewer_id === profile.id) return status;
                                    return { ...status, views_count: (status.views_count || 0) + 1 };
                                }
                                return status;
                            })
                        );
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }, [profile?.id]);

        const loadStatuses = async () => {
            if (!profile?.id) return;
            setIsLoading(true);

            // Get my statuses
            const { data: myData } = await supabase
                .from('statuses')
                .select('*')
                .eq('user_id', profile.id)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (myData) {
                // Get view counts
                const statusesWithViews = await Promise.all(
                    myData.map(async (status) => {
                        const { count } = await supabase
                            .from('status_views')
                            .select('*', { count: 'exact', head: true })
                            .eq('status_id', status.id);
                        return { ...status, views_count: count || 0 };
                    })
                );
                setMyStatuses(statusesWithViews);
            }

            // Get other users' statuses (simplified - shows all "anyone" statuses)
            const { data: otherData } = await supabase
                .from('statuses')
                .select(`
        *,
        user:users(username, full_name, dp_url)
      `)
                .neq('user_id', profile.id)
                .eq('visibility', 'anyone')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(50);

            if (otherData) {
                setOtherStatuses(otherData);
            }

            setIsLoading(false);
        };

        const createStatus = async () => {
            if (!newStatus.trim() || !profile?.id) return;

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const { error } = await supabase.from('statuses').insert({
                user_id: profile.id,
                content: newStatus.trim(),
                visibility,
                expires_at: expiresAt.toISOString(),
            });

            if (error) {
                console.error('Status creation error:', error);
                toast.error(`Failed to create status: ${error.message}`);
                return;
            }

            toast.success('Status created!');
            setNewStatus('');
            setShowCreateModal(false);
            loadStatuses();
        };

        const deleteStatus = async (statusId: string) => {
            const { error } = await supabase
                .from('statuses')
                .delete()
                .eq('id', statusId);

            if (error) {
                toast.error('Failed to delete status');
                return;
            }

            toast.success('Status deleted');
            loadStatuses();
        };

        const viewStatus = async (status: Status) => {
            if (!profile?.id || status.user_id === profile.id) return;

            // Record view
            await supabase.from('status_views').upsert({
                status_id: status.id,
                viewer_id: profile.id,
            });
        };

        return (
            <div className="min-h-full pb-4">
                {/* Header */}
                <header className="sticky top-0 z-10 p-4 border-b" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Status</h1>
                        <motion.button
                            onClick={() => setShowCreateModal(true)}
                            className="p-2 rounded-full shadow-lg"
                            style={{ backgroundColor: 'var(--primary)', color: '#000' }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <HiPlus className="text-xl" />
                        </motion.button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* My Statuses */}
                        {myStatuses.length > 0 && (
                            <section>
                                <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>My Status</h2>
                                <div className="space-y-3">
                                    {myStatuses.map((status) => {
                                        const remaining = getTimeRemaining(status.expires_at);
                                        return (
                                            <motion.div
                                                key={status.id}
                                                className="card"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <p className="text-lg mb-2" style={{ color: 'var(--text)' }}>{status.content}</p>
                                                <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    <span className="flex items-center gap-1">
                                                        <HiEye className="text-base" />
                                                        {status.views_count} views
                                                    </span>
                                                    <span>Expires in {remaining.hours}h {remaining.minutes}m</span>
                                                </div>
                                                <motion.button
                                                    onClick={() => deleteStatus(status.id)}
                                                    className="mt-3 text-sm flex items-center gap-1"
                                                    style={{ color: '#EF4444' }}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <HiTrash /> Delete
                                                </motion.button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Other Users' Statuses */}
                        <section>
                            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Recent Updates</h2>
                            {otherStatuses.length > 0 ? (
                                <div className="space-y-3">
                                    {otherStatuses.map((status, index) => (
                                        <motion.div
                                            key={status.id}
                                            className="card cursor-pointer"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => viewStatus(status)}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
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
                                                <div>
                                                    <p className="font-medium" style={{ color: 'var(--text)' }}>{status.user?.full_name}</p>
                                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatDistanceToNow(status.created_at)} ago
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-lg" style={{ color: 'var(--text)' }}>{status.content}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>No statuses to show</p>
                            )}
                        </section>
                    </div>
                )}

                {/* Create Status Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            className="rounded-2xl p-6 w-full max-w-md shadow-xl"
                            style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Create Status</h2>

                            <div className="relative mb-4">
                                <textarea
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    placeholder="What's on your mind?"
                                    maxLength={250}
                                    className="input-field min-h-[120px] resize-none"
                                />
                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="absolute bottom-3 right-3 text-2xl hover:scale-110 transition-transform"
                                >
                                    😊
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-12 right-0 z-10">
                                        <EmojiPicker
                                            onEmojiClick={(e) => setNewStatus((p) => p + e.emoji)}
                                            width={300}
                                            height={350}
                                        />
                                    </div>
                                )}
                            </div>

                            <p className="text-xs mb-4 text-right" style={{ color: 'var(--text-secondary)' }}>
                                {newStatus.length}/250
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Who can see?</label>
                                <div className="flex gap-3">
                                    {(['anyone', 'chat_list'] as const).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => setVisibility(option)}
                                            className={`flex-1 py-2 rounded-lg border transition-colors ${visibility === option
                                                ? 'border-primary font-medium'
                                                : ''
                                                }`}
                                            style={{
                                                backgroundColor: visibility === option ? 'rgba(144, 238, 144, 0.2)' : 'var(--input-bg)',
                                                color: 'var(--text)',
                                                borderColor: visibility === option ? 'var(--primary)' : 'var(--border)'
                                            }}
                                        >
                                            {option === 'anyone' ? 'Everyone' : 'Chat List'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 rounded-lg border transition-colors hover:opacity-80"
                                    style={{
                                        backgroundColor: 'var(--input-bg)',
                                        color: 'var(--text)',
                                        borderColor: 'var(--border)'
                                    }}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    onClick={createStatus}
                                    disabled={!newStatus.trim()}
                                    className="flex-1 btn-primary py-2 disabled:opacity-50"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Post Status
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        );
    }
