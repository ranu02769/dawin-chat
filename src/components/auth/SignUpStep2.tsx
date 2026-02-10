import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiCheck, HiX } from 'react-icons/hi';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import type { SignUpFormData } from '../../pages/AuthPage';

interface Props {
    signUpData: Omit<SignUpFormData, 'username'>;
    onBack: () => void;
}

export default function SignUpStep2({ signUpData, onBack }: Props) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Validate username format
    const validateUsername = (value: string) => {
        const regex = /^[a-zA-Z0-9_]{3,20}$/;
        return regex.test(value);
    };

    // Check username availability with debounce
    useEffect(() => {
        if (!username || !validateUsername(username)) {
            setIsAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsChecking(true);
            const available = await authService.checkUsernameAvailable(username);
            setIsAvailable(available);
            setIsChecking(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateUsername(username)) {
            setError('Username must be 3-20 characters (letters, numbers, underscore)');
            return;
        }

        if (!isAvailable) {
            setError('This username is not available');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const result = await authService.signUp({
            email: signUpData.email,
            password: signUpData.password,
            full_name: signUpData.full_name,
            username,
            date_of_birth: signUpData.date_of_birth,
            gender: signUpData.gender,
        });

        if (result.success) {
            toast.success('Account created successfully! Please sign in.');
            navigate('/auth');
        } else {
            setError(result.error || 'Sign up failed. Please try again.');
            toast.error(result.error || 'Sign up failed');
        }

        setIsSubmitting(false);
    };

    // Generate username suggestions
    const generateSuggestions = () => {
        const base = signUpData.full_name.toLowerCase().replace(/\s+/g, '_');
        return [
            `${base}${Math.floor(Math.random() * 1000)}`,
            `${base}_${new Date().getFullYear()}`,
            `${base.slice(0, 10)}_${Math.floor(Math.random() * 100)}`,
        ];
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <motion.button
                    type="button"
                    onClick={onBack}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <HiArrowLeft className="text-xl" />
                </motion.button>
                <div>
                    <h2 className="text-xl font-bold">Choose Username</h2>
                    <p className="text-sm text-gray-500">Step 2 of 2 - Create your unique identity</p>
                </div>
            </div>

            {/* Username Input */}
            <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                            setError('');
                        }}
                        className="input-field pl-8 pr-10"
                        placeholder="your_username"
                        maxLength={20}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isChecking && (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                        {!isChecking && isAvailable === true && (
                            <HiCheck className="text-green-500 text-xl" />
                        )}
                        {!isChecking && isAvailable === false && (
                            <HiX className="text-red-500 text-xl" />
                        )}
                    </div>
                </div>

                {/* Status message */}
                {username && !isChecking && (
                    <p className={`text-sm mt-1 ${isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                        {isAvailable ? 'Username is available!' : 'Username is already taken'}
                    </p>
                )}

                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

                <p className="text-xs text-gray-500 mt-2">
                    3-20 characters, letters, numbers, and underscores only
                </p>
            </div>

            {/* Username Suggestions */}
            {!isAvailable && username.length >= 3 && (
                <div>
                    <p className="text-sm font-medium mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                        {generateSuggestions().map((suggestion) => (
                            <motion.button
                                key={suggestion}
                                type="button"
                                onClick={() => setUsername(suggestion)}
                                className="px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-primary/20 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                @{suggestion}
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            <motion.button
                type="submit"
                disabled={isSubmitting || !isAvailable || isChecking}
                className="btn-primary w-full py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                    </span>
                ) : (
                    'Create Account'
                )}
            </motion.button>
        </form>
    );
}
