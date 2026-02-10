import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function LoadingScreen() {
    const { setLoading } = useAuthStore();

    // Timeout fallback - if loading takes more than 5 seconds, force stop
    useEffect(() => {
        const timeout = setTimeout(() => {
            console.warn('[LoadingScreen] Timeout reached, forcing loading to stop');
            setLoading(false);
        }, 5000);

        return () => clearTimeout(timeout);
    }, [setLoading]);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background-light dark:bg-background-dark">
            <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="relative">
                    <motion.div
                        className="w-16 h-16 rounded-full border-4 border-primary-light"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ borderTopColor: 'transparent' }}
                    />
                </div>
                <motion.p
                    className="text-lg font-medium text-gradient"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    Dawin Chat
                </motion.p>
            </motion.div>
        </div>
    );
}
