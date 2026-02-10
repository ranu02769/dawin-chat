import { NavLink, useNavigate } from 'react-router-dom';
import { HiHome, HiSearch, HiStatusOnline, HiCog, HiLogout } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const navItems = [
    { path: '/', icon: HiHome, label: 'Home' },
    { path: '/search', icon: HiSearch, label: 'Search' },
    { path: '/status', icon: HiStatusOnline, label: 'Status' },
    { path: '/settings', icon: HiCog, label: 'Settings' },
];

export default function Sidebar() {
    const { profile } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await authService.signOut();
        toast.success('Logged out successfully');
        navigate('/auth');
    };

    return (
        <aside className="sidebar">
            {/* User Profile Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {profile?.dp_url ? (
                            <img
                                src={profile.dp_url}
                                alt={profile.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-xl font-bold">
                                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile?.full_name || 'User'}</p>
                        <p className="text-sm text-gray-500 truncate">@{profile?.username || 'username'}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-primary text-black font-medium'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`
                        }
                    >
                        {() => (
                            <motion.div
                                className="flex items-center gap-3 w-full"
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <item.icon className="text-xl" />
                                <span>{item.label}</span>
                            </motion.div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <HiLogout className="text-xl" />
                    <span>Logout</span>
                </motion.button>
            </div>
        </aside>
    );
}
