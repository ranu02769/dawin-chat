import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiEye, HiEyeOff, HiMail } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

interface Props {
    onSignUp: () => void;
}

export default function LoginForm({ onSignUp }: Props) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await authService.signIn({ email, password });

        if (result.success) {
            toast.success('Welcome back!');
            navigate('/');
        } else {
            setError(result.error || 'Invalid email or password');
        }

        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError('');

        const result = await authService.signInWithGoogle();

        if (!result.success) {
            setError(result.error || 'Google sign in failed');
            setIsGoogleLoading(false);
        }
        // If successful, page will redirect
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsLoading(true);
        const result = await authService.resetPassword(email);

        if (result.success) {
            toast.success('Password reset email sent!');
            setShowForgotPassword(false);
        } else {
            setError(result.error || 'Failed to send reset email');
        }

        setIsLoading(false);
    };

    if (showForgotPassword) {
        return (
            <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Reset Password</h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your email to receive a reset link</p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Email</label>
                    <div className="relative">
                        <HiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field pl-10"
                            placeholder="Enter your email"
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3 font-medium disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                </motion.button>

                <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-center text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Back to Login
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Welcome Back</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to continue chatting</p>
            </div>

            {/* Google Sign In */}
            <motion.button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                {isGoogleLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FcGoogle className="text-xl" />
                )}
                Continue with Google
            </motion.button>

            <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Email</label>
                <div className="relative">
                    <HiMail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Enter your email"
                    />
                </div>
            </div>

            {/* Password */}
            <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Password</label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field pr-10"
                        placeholder="Enter your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {showPassword ? <HiEyeOff /> : <HiEye />}
                    </button>
                </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
                <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--primary)' }}
                >
                    Forgot password?
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <motion.button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-lg font-medium disabled:opacity-50"
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.99 }}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Signing in...
                    </span>
                ) : (
                    'Sign In'
                )}
            </motion.button>

            {/* Sign Up Link */}
            <div className="text-center pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={onSignUp}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--primary)' }}
                    >
                        Sign Up
                    </button>
                </p>
            </div>
        </form>
    );
}
