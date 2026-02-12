import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiCheck, HiX } from 'react-icons/hi';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import DateOfBirthPicker from '../ui/DateOfBirthPicker';
import toast from 'react-hot-toast';

export default function ProfileSetupModal() {
    const { profile, setProfile, setNeedsProfileSetup } = useAuthStore();

    const [formData, setFormData] = useState({
        username: profile?.username || '',
        date_of_birth: profile?.date_of_birth || '',
        gender: profile?.gender || ('' as '' | 'male' | 'female' | 'other'),
    });

    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Check username availability
    useEffect(() => {
        if (!formData.username || formData.username.length < 3) {
            setIsAvailable(null);
            return;
        }

        // Don't check if it's the current username
        if (formData.username === profile?.username) {
            setIsAvailable(true);
            return;
        }

        const timer = setTimeout(async () => {
            setIsChecking(true);
            const available = await authService.checkUsernameAvailable(formData.username);
            setIsAvailable(available);
            setIsChecking(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.username, profile?.username]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Username validation
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(formData.username)) {
            newErrors.username = 'Username must be 3-20 characters (letters, numbers, underscore)';
        } else if (isAvailable === false) {
            newErrors.username = 'This username is already taken';
        }

        // Date of birth validation
        if (!formData.date_of_birth) {
            newErrors.date_of_birth = 'Please enter your date of birth';
        } else {
            const dob = new Date(formData.date_of_birth);
            const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            if (age < 13) {
                newErrors.date_of_birth = 'You must be at least 13 years old';
            }
        }

        // Gender validation
        if (!formData.gender) {
            newErrors.gender = 'Please select your gender';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !profile?.id) return;

        setIsSubmitting(true);

        const success = await authService.updateProfile(profile.id, {
            username: formData.username,
            date_of_birth: formData.date_of_birth,
            gender: formData.gender as 'male' | 'female' | 'other',
        });

        if (success) {
            setProfile({
                ...profile,
                username: formData.username,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender as 'male' | 'female' | 'other',
            });
            setNeedsProfileSetup(false);
            toast.success('Profile setup complete!');
        } else {
            toast.error('Failed to update profile. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
                className="bg-white dark:bg-surface w-full max-w-md rounded-2xl shadow-xl p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ backgroundColor: 'var(--background)' }}
            >
                <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Please fill in the required information to continue
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Username</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>@</span>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                                })}
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
                        {errors.username && (
                            <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                        )}
                    </div>

                    {/* Date of Birth */}
                    <DateOfBirthPicker
                        value={formData.date_of_birth}
                        onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
                        error={errors.date_of_birth}
                    />

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Gender</label>
                        <div className="flex gap-3">
                            {(['male', 'female', 'other'] as const).map((option) => (
                                <label
                                    key={option}
                                    className={`flex-1 py-2 px-4 rounded-lg border text-center cursor-pointer transition-all ${formData.gender === option
                                        ? 'border-primary font-medium'
                                        : ''
                                        }`}
                                    style={{
                                        borderColor: formData.gender === option ? 'var(--primary)' : 'var(--border)',
                                        backgroundColor: formData.gender === option ? 'rgba(144, 238, 144, 0.1)' : 'var(--input-bg)',
                                        color: 'var(--text)',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="gender"
                                        value={option}
                                        checked={formData.gender === option}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
                                        className="sr-only"
                                    />
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </label>
                            ))}
                        </div>
                        {errors.gender && (
                            <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                        )}
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isSubmitting || isChecking}
                        className="btn-primary w-full py-3 text-lg font-medium disabled:opacity-50"
                        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            'Complete Setup'
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
