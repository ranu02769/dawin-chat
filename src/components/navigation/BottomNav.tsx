import { NavLink } from 'react-router-dom';
import { HiHome, HiSearch, HiStatusOnline, HiCog } from 'react-icons/hi';
import { motion } from 'framer-motion';

const navItems = [
    { path: '/', icon: HiHome, label: 'Home' },
    { path: '/search', icon: HiSearch, label: 'Search' },
    { path: '/status', icon: HiStatusOnline, label: 'Status' },
    { path: '/settings', icon: HiCog, label: 'Settings' },
];

export default function BottomNav() {
    return (
        <nav className="bottom-nav z-50">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `bottom-nav-item ${isActive ? 'active' : ''}`
                    }
                >
                    {({ isActive }) => (
                        <motion.div
                            className="flex flex-col items-center gap-1"
                            whileTap={{ scale: 0.95 }}
                        >
                            <item.icon className={`text-2xl ${isActive ? 'text-primary' : ''}`} />
                            <span className="text-xs">{item.label}</span>
                            {isActive && (
                                <motion.div
                                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                                    layoutId="bottomNavIndicator"
                                />
                            )}
                        </motion.div>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
