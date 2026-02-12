import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiEye, HiEyeOff, HiArrowLeft } from 'react-icons/hi';
import DateOfBirthPicker from '../ui/DateOfBirthPicker';
import type { SignUpFormData } from '../../pages/AuthPage';

interface Props {
    initialData: Partial<SignUpFormData>;
    onNext: (data: Partial<SignUpFormData>) => void;
    onBack: () => void;
}

export default function SignUpStep1({ initialData, onNext, onBack }: Props) {
    const [formData, setFormData] = useState({
        full_name: initialData.full_name || '',
        email: initialData.email || '',
        date_of_birth: initialData.date_of_birth || '',
        gender: initialData.gender || ('' as '' | 'male' | 'female' | 'other'),
        password: initialData.password || '',
        confirmPassword: initialData.confirmPassword || '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Full name validation
        if (formData.full_name.length < 2) {
            newErrors.full_name = 'Name must be at least 2 characters';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        // Date of birth validation (13+ years)
        const dob = new Date(formData.date_of_birth);
        const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 13) {
            newErrors.date_of_birth = 'You must be at least 13 years old';
        }

        // Gender validation
        if (!formData.gender) {
            newErrors.gender = 'Please select your gender';
        }

        // Password validation (min 8 chars, 1 uppercase, 1 number)
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            newErrors.password = 'Password must be 8+ chars with 1 uppercase and 1 number';
        }

        // Confirm password validation
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onNext({
                full_name: formData.full_name,
                email: formData.email,
                date_of_birth: formData.date_of_birth,
                gender: formData.gender as 'male' | 'female' | 'other',
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                    <h2 className="text-xl font-bold">Create Account</h2>
                    <p className="text-sm text-gray-500">Step 1 of 2 - Basic Information</p>
                </div>
            </div>

            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field"
                    placeholder="Enter your full name"
                />
                {errors.full_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>
                )}
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="Enter your email"
                />
                {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
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
                <label className="block text-sm font-medium mb-1">Gender</label>
                <div className="flex gap-3">
                    {(['male', 'female', 'other'] as const).map((option) => (
                        <label
                            key={option}
                            className="flex-1 py-2 px-4 rounded-lg text-center cursor-pointer transition-all"
                            style={{
                                border: `1px solid ${formData.gender === option ? 'var(--primary)' : 'var(--border)'}`,
                                backgroundColor: formData.gender === option ? 'rgba(144, 238, 144, 0.1)' : 'var(--input-bg)',
                                color: 'var(--text)',
                                fontWeight: formData.gender === option ? 500 : 400,
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

            {/* Password */}
            <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Create a password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                        {showPassword ? <HiEyeOff /> : <HiEye />}
                    </button>
                </div>
                {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Confirm your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                        {showConfirmPassword ? <HiEyeOff /> : <HiEye />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
            </div>

            <motion.button
                type="submit"
                className="btn-primary w-full py-3 text-lg font-medium"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                Continue
            </motion.button>
        </form>
    );
}
