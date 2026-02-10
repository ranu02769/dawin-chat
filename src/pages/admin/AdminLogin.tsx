import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiShieldCheck } from 'react-icons/hi';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if this is first-time setup
    const [isSetup, setIsSetup] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Check if admin exists
        const { data: admins, error: fetchError } = await supabase
            .from('admins')
            .select('*')
            .limit(1);

        if (fetchError) {
            setError('Failed to connect to database');
            setIsLoading(false);
            return;
        }

        if (!admins || admins.length === 0) {
            // First-time setup
            setIsSetup(true);
            setIsLoading(false);
            return;
        }

        // Verify credentials
        const { data: admin } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        // In production, use bcrypt. For demo, simple comparison
        if (!admin || admin.password_hash !== password) {
            setError('Invalid credentials');
            setIsLoading(false);
            return;
        }

        // Store admin session
        sessionStorage.setItem('admin_id', admin.id);
        sessionStorage.setItem('admin_email', admin.email);
        toast.success('Welcome, Admin!');
        navigate('/123456/admin/dashboard');
        setIsLoading(false);
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Create admin account
        const { error } = await supabase
            .from('admins')
            .insert({
                email,
                password_hash: password, // In production, hash this!
            });

        if (error) {
            setError('Failed to create admin account');
            setIsLoading(false);
            return;
        }

        toast.success('Admin account created! Please log in.');
        setIsSetup(false);
        setEmail('');
        setPassword('');
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
            <motion.div
                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
                        <HiShieldCheck className="text-3xl text-black" />
                    </div>
                    <h1 className="text-2xl font-bold">Admin Panel</h1>
                    <p className="text-gray-500 mt-1">
                        {isSetup ? 'Create your admin account' : 'Sign in to continue'}
                    </p>
                </div>

                <form onSubmit={isSetup ? handleSetup : handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 font-medium disabled:opacity-50"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {isLoading ? 'Please wait...' : isSetup ? 'Create Account' : 'Sign In'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
