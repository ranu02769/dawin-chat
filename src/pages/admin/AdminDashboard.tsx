import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiUsers, HiChat, HiPhotograph, HiStatusOnline,
    HiLogout, HiRefresh, HiTrash, HiShieldExclamation,
    HiSearch, HiPencil, HiX, HiClock,
    HiTrendingUp, HiChartBar, HiExclamation, HiCog
} from 'react-icons/hi';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Stats {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    totalMessages: number;
    messagesToday: number;
    totalStatuses: number;
    totalChats: number;
}

interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    dp_url: string | null;
    bio: string | null;
    gender: string | null;
    date_of_birth: string | null;
    is_banned: boolean;
    is_active: boolean;
    is_profile_public: boolean;
    last_seen: string | null;
    created_at: string;
}

interface StatusItem {
    id: string;
    content: string;
    visibility: string;
    expires_at: string;
    created_at: string;
    user_id: string;
    user: {
        username: string;
        full_name: string;
        dp_url: string | null;
    };
}

interface RecentActivity {
    type: 'new_user' | 'new_message' | 'new_status';
    text: string;
    time: string;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        totalMessages: 0,
        messagesToday: 0,
        totalStatuses: 0,
        totalChats: 0,
    });
    const [users, setUsers] = useState<User[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'statuses' | 'settings'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        email: '',
        username: '',
        is_active: true,
        is_profile_public: true,
    });

    useEffect(() => {
        const adminId = sessionStorage.getItem('admin_id');
        if (!adminId) {
            navigate('/123456/admin');
            return;
        }
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        await Promise.all([loadStats(), loadUsers(), loadStatuses(), loadRecentActivity()]);
        setIsLoading(false);
    };

    const loadStats = async () => {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const [
            { count: userCount },
            { count: messageCount },
            { count: statusCount },
            { count: activeCount },
            { count: newUsersCount },
            { count: todayMsgCount },
            { count: chatCount },
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('messages').select('*', { count: 'exact', head: true }),
            supabase.from('statuses').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }).gt('last_seen', yesterday.toISOString()),
            supabase.from('users').select('*', { count: 'exact', head: true }).gt('created_at', monthAgo.toISOString()),
            supabase.from('messages').select('*', { count: 'exact', head: true }).gt('created_at', todayStart.toISOString()),
            supabase.from('chats').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
            totalUsers: userCount || 0,
            activeUsers: activeCount || 0,
            newUsersThisMonth: newUsersCount || 0,
            totalMessages: messageCount || 0,
            messagesToday: todayMsgCount || 0,
            totalStatuses: statusCount || 0,
            totalChats: chatCount || 0,
        });
    };

    const loadUsers = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, email, username, full_name, dp_url, bio, gender, date_of_birth, is_banned, is_active, is_profile_public, last_seen, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (data) setUsers(data);
    };

    const loadStatuses = async () => {
        const { data } = await supabase
            .from('statuses')
            .select('id, content, visibility, expires_at, created_at, user_id, user:users(username, full_name, dp_url)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setStatuses(data as unknown as StatusItem[]);
    };

    const loadRecentActivity = async () => {
        const activities: RecentActivity[] = [];

        // Recent users
        const { data: recentUsers } = await supabase
            .from('users')
            .select('username, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentUsers) {
            recentUsers.forEach(u => {
                activities.push({
                    type: 'new_user',
                    text: `New user registered: @${u.username}`,
                    time: u.created_at,
                });
            });
        }

        // Recent statuses
        const { data: recentStatuses } = await supabase
            .from('statuses')
            .select('content, created_at, user:users(username)')
            .order('created_at', { ascending: false })
            .limit(3);

        if (recentStatuses) {
            recentStatuses.forEach((s: any) => {
                activities.push({
                    type: 'new_status',
                    text: `@${s.user?.username} posted a status`,
                    time: s.created_at,
                });
            });
        }

        // Sort by time
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 8));
    };

    // ── User Management ───────────────────────────────
    const toggleBan = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('users')
            .update({ is_banned: !currentStatus })
            .eq('id', userId);

        if (error) {
            toast.error('Failed to update user');
            return;
        }
        toast.success(currentStatus ? 'User unbanned' : 'User banned');
        loadUsers();
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditForm({
            full_name: user.full_name,
            email: user.email,
            username: user.username,
            is_active: user.is_active,
            is_profile_public: user.is_profile_public,
        });
    };

    const saveUserEdit = async () => {
        if (!editingUser) return;

        const { error } = await supabase
            .from('users')
            .update({
                full_name: editForm.full_name,
                username: editForm.username,
                is_active: editForm.is_active,
                is_profile_public: editForm.is_profile_public,
            })
            .eq('id', editingUser.id);

        if (error) {
            toast.error('Failed to update user');
            return;
        }

        toast.success('User updated successfully');
        setEditingUser(null);
        loadUsers();
    };

    const deleteUser = async (userId: string) => {
        // Delete user's messages, chats, statuses, then user
        await supabase.from('messages').delete().eq('sender_id', userId);
        await supabase.from('statuses').delete().eq('user_id', userId);

        // Delete chats where user is participant
        await supabase.from('chats').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        // Delete avatar from storage
        const { data: files } = await supabase.storage.from('avatars').list(userId);
        if (files && files.length > 0) {
            const filePaths = files.map(f => `${userId}/${f.name}`);
            await supabase.storage.from('avatars').remove(filePaths);
        }

        // Delete user profile
        const { error } = await supabase.from('users').delete().eq('id', userId);

        if (error) {
            toast.error('Failed to delete user');
            return;
        }

        // Delete from auth
        // Note: This requires service role key, may not work from client
        toast.success('User deleted successfully');
        setDeleteConfirm(null);
        loadUsers();
        loadStats();
    };

    // ── Status Management ───────────────────────────
    const deleteStatus = async (statusId: string) => {
        const { error } = await supabase.from('statuses').delete().eq('id', statusId);
        if (error) {
            toast.error('Failed to delete status');
            return;
        }
        toast.success('Status deleted');
        loadStatuses();
        loadStats();
    };

    const deleteExpiredStatuses = async () => {
        const { error } = await supabase
            .from('statuses')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) {
            toast.error('Failed to delete expired statuses');
            return;
        }
        toast.success(`Deleted expired statuses`);
        loadStatuses();
        loadStats();
    };

    const deleteAllStatuses = async () => {
        const { error } = await supabase.from('statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            toast.error('Failed to delete statuses');
            return;
        }
        toast.success('All statuses deleted');
        loadStatuses();
        loadStats();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_id');
        sessionStorage.removeItem('admin_email');
        navigate('/123456/admin');
    };

    // ── Filtered users ──────────────────────────────
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            u.username?.toLowerCase().includes(q) ||
            u.full_name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    // ── Helpers ─────────────────────────────────────
    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const timeRemaining = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hrs}h ${mins}m`;
    };

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: HiUsers, color: 'bg-blue-500' },
        { label: 'Active (24h)', value: stats.activeUsers, icon: HiStatusOnline, color: 'bg-green-500' },
        { label: 'New (30d)', value: stats.newUsersThisMonth, icon: HiTrendingUp, color: 'bg-cyan-500' },
        { label: 'Total Messages', value: stats.totalMessages, icon: HiChat, color: 'bg-purple-500' },
        { label: 'Today Messages', value: stats.messagesToday, icon: HiChartBar, color: 'bg-indigo-500' },
        { label: 'Active Statuses', value: stats.totalStatuses, icon: HiPhotograph, color: 'bg-orange-500' },
        { label: 'Total Chats', value: stats.totalChats, icon: HiChat, color: 'bg-pink-500' },
    ];

    const tabs = [
        { key: 'overview', label: 'Overview', icon: HiChartBar },
        { key: 'users', label: 'Users', icon: HiUsers },
        { key: 'statuses', label: 'Statuses', icon: HiPhotograph },
        { key: 'settings', label: 'Settings', icon: HiCog },
    ] as const;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">Dawin Chat Admin</h1>
                    <div className="flex items-center gap-3">
                        <motion.button
                            onClick={loadData}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            whileHover={{ rotate: 180 }}
                            title="Refresh"
                        >
                            <HiRefresh className="text-xl" />
                        </motion.button>
                        <motion.button
                            onClick={handleLogout}
                            className="p-2 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            whileTap={{ scale: 0.95 }}
                            title="Logout"
                        >
                            <HiLogout className="text-xl" />
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${activeTab === tab.key
                            ? 'border-primary text-primary font-medium'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className="text-lg" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="max-w-7xl mx-auto p-4">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* ═══════════ OVERVIEW TAB ═══════════ */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                                    {statCards.map((stat, index) => (
                                        <motion.div
                                            key={stat.label}
                                            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                                                    <stat.icon className="text-xl text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Quick Actions */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                                        <div className="flex flex-wrap gap-3">
                                            <motion.button
                                                onClick={deleteExpiredStatuses}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiTrash /> Delete Expired Statuses
                                            </motion.button>
                                            <motion.button
                                                onClick={() => { loadData(); toast.success('Data refreshed'); }}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiRefresh /> Refresh All Data
                                            </motion.button>
                                            <motion.button
                                                onClick={() => setActiveTab('users')}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiUsers /> Manage Users
                                            </motion.button>
                                            <motion.button
                                                onClick={() => setActiveTab('statuses')}
                                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiPhotograph /> Manage Statuses
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                                        {recentActivity.length === 0 ? (
                                            <p className="text-gray-500 text-sm">No recent activity</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {recentActivity.map((activity, i) => (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <div className={`mt-0.5 p-1.5 rounded-full ${activity.type === 'new_user' ? 'bg-blue-100 text-blue-500' :
                                                            activity.type === 'new_status' ? 'bg-orange-100 text-orange-500' :
                                                                'bg-purple-100 text-purple-500'
                                                            }`}>
                                                            {activity.type === 'new_user' ? <HiUsers className="text-sm" /> :
                                                                activity.type === 'new_status' ? <HiPhotograph className="text-sm" /> :
                                                                    <HiChat className="text-sm" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm truncate">{activity.text}</p>
                                                            <p className="text-xs text-gray-400">{timeAgo(activity.time)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* User Summary Bar */}
                                <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-lg font-bold mb-4">User Overview</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                                            <p className="text-2xl font-bold text-green-600">{users.filter(u => !u.is_banned).length}</p>
                                            <p className="text-xs text-gray-500">Active Users</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                                            <p className="text-2xl font-bold text-red-600">{users.filter(u => u.is_banned).length}</p>
                                            <p className="text-xs text-gray-500">Banned Users</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.is_profile_public).length}</p>
                                            <p className="text-xs text-gray-500">Public Profiles</p>
                                        </div>
                                        <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                            <p className="text-2xl font-bold text-purple-600">{users.filter(u => !u.is_profile_public).length}</p>
                                            <p className="text-xs text-gray-500">Private Profiles</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════ USERS TAB ═══════════ */}
                        {activeTab === 'users' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                {/* Search Bar */}
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="relative flex-1 max-w-md">
                                        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, username, or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Users Table */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                            {searchQuery ? 'No users found matching your search' : 'No users yet'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredUsers.map((user) => (
                                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                                                                        {user.dp_url ? (
                                                                            <img src={user.dp_url} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium text-sm">
                                                                                {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-sm">{user.full_name}</p>
                                                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className={`px-2 py-1 text-xs rounded-full ${user.is_banned
                                                                    ? 'bg-red-100 text-red-600'
                                                                    : 'bg-green-100 text-green-600'
                                                                    }`}>
                                                                    {user.is_banned ? 'Banned' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <span className={`px-2 py-1 text-xs rounded-full ${user.is_profile_public
                                                                    ? 'bg-blue-100 text-blue-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {user.is_profile_public ? 'Public' : 'Private'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                {user.last_seen ? timeAgo(user.last_seen) : 'Never'}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                {new Date(user.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <motion.button
                                                                        onClick={() => openEditModal(user)}
                                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                                        whileTap={{ scale: 0.9 }}
                                                                        title="Edit"
                                                                    >
                                                                        <HiPencil />
                                                                    </motion.button>
                                                                    <motion.button
                                                                        onClick={() => toggleBan(user.id, user.is_banned)}
                                                                        className={`p-1.5 rounded-lg ${user.is_banned
                                                                            ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                            : 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                                                            }`}
                                                                        whileTap={{ scale: 0.9 }}
                                                                        title={user.is_banned ? 'Unban' : 'Ban'}
                                                                    >
                                                                        <HiShieldExclamation />
                                                                    </motion.button>
                                                                    <motion.button
                                                                        onClick={() => setDeleteConfirm(user.id)}
                                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                                        whileTap={{ scale: 0.9 }}
                                                                        title="Delete"
                                                                    >
                                                                        <HiTrash />
                                                                    </motion.button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════ STATUSES TAB ═══════════ */}
                        {activeTab === 'statuses' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                {/* Actions */}
                                <div className="mb-4 flex items-center gap-3 flex-wrap">
                                    <motion.button
                                        onClick={deleteExpiredStatuses}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <HiClock /> Delete Expired
                                    </motion.button>
                                    <motion.button
                                        onClick={deleteAllStatuses}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <HiTrash /> Delete All Statuses
                                    </motion.button>
                                    <span className="text-sm text-gray-500 ml-auto">
                                        {statuses.length} status{statuses.length !== 1 ? 'es' : ''}
                                    </span>
                                </div>

                                {/* Status List */}
                                {statuses.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-sm">
                                        <HiPhotograph className="text-4xl text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-500">No active statuses</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {statuses.map((status) => (
                                            <motion.div
                                                key={status.id}
                                                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                                                            {status.user?.dp_url ? (
                                                                <img src={status.user.dp_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">
                                                                    {status.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm">
                                                                @{status.user?.username || 'unknown'}
                                                                <span className="ml-2 text-xs text-gray-400 font-normal">
                                                                    {status.user?.full_name}
                                                                </span>
                                                            </p>
                                                            <p className="mt-1 text-gray-700 dark:text-gray-300">{status.content}</p>
                                                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <HiClock /> Expires: {timeRemaining(status.expires_at)}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                                                                    {status.visibility}
                                                                </span>
                                                                <span>{timeAgo(status.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <motion.button
                                                        onClick={() => deleteStatus(status.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"
                                                        whileTap={{ scale: 0.9 }}
                                                        title="Delete status"
                                                    >
                                                        <HiTrash />
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══════════ SETTINGS TAB ═══════════ */}
                        {activeTab === 'settings' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Admin Account Info */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <HiCog className="text-gray-500" /> Admin Account
                                        </h2>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500">Email</span>
                                                <span className="text-sm font-medium">{sessionStorage.getItem('admin_email') || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500">Session Active</span>
                                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">Active</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm text-gray-500">Admin Panel URL</span>
                                                <span className="text-sm font-mono text-gray-400">/123456/admin</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Statistics Summary */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <HiChartBar className="text-gray-500" /> App Statistics
                                        </h2>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500">Total Users</span>
                                                <span className="text-sm font-bold">{stats.totalUsers}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500">Total Messages</span>
                                                <span className="text-sm font-bold">{stats.totalMessages}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                                                <span className="text-sm text-gray-500">Active Statuses</span>
                                                <span className="text-sm font-bold">{stats.totalStatuses}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm text-gray-500">Total Chats</span>
                                                <span className="text-sm font-bold">{stats.totalChats}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-900/50 lg:col-span-2">
                                        <h2 className="text-lg font-bold mb-2 text-red-500 flex items-center gap-2">
                                            <HiExclamation /> Danger Zone
                                        </h2>
                                        <p className="text-sm text-gray-500 mb-4">These actions are irreversible. Please be careful.</p>
                                        <div className="flex flex-wrap gap-3">
                                            <motion.button
                                                onClick={deleteExpiredStatuses}
                                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiClock /> Delete Expired Statuses
                                            </motion.button>
                                            <motion.button
                                                onClick={deleteAllStatuses}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiTrash /> Delete All Statuses
                                            </motion.button>
                                            <motion.button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <HiLogout /> Logout Admin
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </main>

            {/* ═══════════ EDIT USER MODAL ═══════════ */}
            <AnimatePresence>
                {editingUser && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingUser(null)}
                    >
                        <motion.div
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold">Edit User</h2>
                                <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                    <HiX className="text-xl" />
                                </button>
                            </div>

                            {/* User Info Header */}
                            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                                    {editingUser.dp_url ? (
                                        <img src={editingUser.dp_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium text-lg">
                                            {editingUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">ID: {editingUser.id.slice(0, 8)}...</p>
                                    <p className="text-xs text-gray-400">Joined: {new Date(editingUser.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        disabled
                                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 text-sm cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed from admin panel</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editForm.is_active}
                                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm">Active</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editForm.is_profile_public}
                                            onChange={(e) => setEditForm({ ...editForm, is_profile_public: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm">Public Profile</span>
                                    </label>
                                </div>

                                {/* User Details (read-only) */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm space-y-1">
                                    <p className="text-gray-500">Gender: <span className="text-gray-700 dark:text-gray-300">{editingUser.gender || 'Not set'}</span></p>
                                    <p className="text-gray-500">DOB: <span className="text-gray-700 dark:text-gray-300">{editingUser.date_of_birth || 'Not set'}</span></p>
                                    <p className="text-gray-500">Bio: <span className="text-gray-700 dark:text-gray-300">{editingUser.bio || 'Not set'}</span></p>
                                    <p className="text-gray-500">Last Seen: <span className="text-gray-700 dark:text-gray-300">{editingUser.last_seen ? timeAgo(editingUser.last_seen) : 'Never'}</span></p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    onClick={saveUserEdit}
                                    className="flex-1 px-4 py-2.5 bg-primary text-black rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Save Changes
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════ DELETE CONFIRM MODAL ═══════════ */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-14 h-14 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                    <HiExclamation className="text-3xl text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Delete User?</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    This will permanently delete the user account, all their messages, statuses, chats, and profile picture. This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        onClick={() => deleteUser(deleteConfirm)}
                                        className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Delete
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
