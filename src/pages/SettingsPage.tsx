import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    HiUser, HiPencil, HiMoon, HiSun, HiShieldCheck,
    HiPhotograph, HiCheck, HiLogout
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'profile' | 'theme' | 'privacy';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { profile, setProfile } = useAuthStore();
    const { settings, setMode, setColors, setFontSize } = useThemeStore();

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [editedProfile, setEditedProfile] = useState({
        full_name: profile?.full_name || '',
        bio: profile?.bio || '',
    });

    const [privacy, setPrivacy] = useState({
        show_last_seen: profile?.show_last_seen ?? true,
        show_read_receipts: profile?.show_read_receipts ?? true,
        is_profile_public: profile?.is_profile_public ?? true,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const saveProfile = async () => {
        if (!profile?.id) return;
        setIsSaving(true);

        const success = await authService.updateProfile(profile.id, editedProfile);

        if (success) {
            setProfile({ ...profile, ...editedProfile });
            setIsEditing(false);
            toast.success('Profile updated!');
        } else {
            toast.error('Failed to update profile');
        }

        setIsSaving(false);
    };

    const savePrivacy = async () => {
        if (!profile?.id) return;
        setIsSaving(true);

        const { error } = await supabase
            .from('users')
            .update(privacy)
            .eq('id', profile.id);

        if (error) {
            toast.error('Failed to update privacy settings');
        } else {
            setProfile({ ...profile, ...privacy });
            toast.success('Privacy settings updated!');
        }

        setIsSaving(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        // Check if file type is allowed (jpeg, png, webp only)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPEG, PNG, and WebP images are allowed');
            return;
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

        toast.loading('Uploading avatar...');

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            toast.dismiss();
            console.error('Avatar upload error:', uploadError);
            toast.error(`Failed to upload image: ${uploadError.message}`);
            e.target.value = '';
            return;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

        const { error: updateError } = await supabase
            .from('users')
            .update({ dp_url: data.publicUrl })
            .eq('id', profile.id);

        toast.dismiss();

        if (updateError) {
            console.error('Profile update error:', updateError);
            toast.error(`Failed to update profile: ${updateError.message}`);
        } else {
            setProfile({ ...profile, dp_url: data.publicUrl });
            toast.success('Avatar updated!');
        }

        e.target.value = '';
    };

    const handleLogout = async () => {
        await authService.signOut();
        toast.success('Logged out');
        navigate('/auth');
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: HiUser },
        { id: 'theme', label: 'Theme', icon: HiMoon },
        { id: 'privacy', label: 'Privacy', icon: HiShieldCheck },
    ];

    const themeColors = [
        { name: 'Light Green', value: '#90EE90' },
        { name: 'Sky Blue', value: '#87CEEB' },
        { name: 'Lavender', value: '#E6E6FA' },
        { name: 'Peach', value: '#FFDAB9' },
        { name: 'Rose', value: '#FFB6C1' },
    ];

    return (
        <div className="min-h-full pb-8">
            {/* Header */}
            <header className="sticky top-0 z-10 p-4 bg-background-light dark:bg-background-dark border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold">Settings</h1>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-primary text-primary font-medium'
                            : 'border-transparent text-gray-500'
                            }`}
                    >
                        <tab.icon />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                {profile?.dp_url ? (
                                    <img
                                        src={profile.dp_url}
                                        alt={profile.full_name}
                                        className="w-24 h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold">
                                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                                <motion.button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2 bg-primary rounded-full shadow-lg"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <HiPhotograph className="text-black" />
                                </motion.button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-gray-500">@{profile?.username}</p>
                        </div>

                        {/* Profile Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={isEditing ? editedProfile.full_name : profile?.full_name || ''}
                                    onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                                    disabled={!isEditing}
                                    className="input-field disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Bio</label>
                                <textarea
                                    value={isEditing ? editedProfile.bio : profile?.bio || ''}
                                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                                    disabled={!isEditing}
                                    placeholder="Tell us about yourself..."
                                    maxLength={150}
                                    className="input-field min-h-[80px] resize-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                />
                            </div>

                            <div className="flex gap-3">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 py-2 rounded-lg border border-gray-200"
                                        >
                                            Cancel
                                        </button>
                                        <motion.button
                                            onClick={saveProfile}
                                            disabled={isSaving}
                                            className="flex-1 btn-primary py-2 flex items-center justify-center gap-2"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isSaving ? 'Saving...' : <><HiCheck /> Save</>}
                                        </motion.button>
                                    </>
                                ) : (
                                    <motion.button
                                        onClick={() => {
                                            setEditedProfile({
                                                full_name: profile?.full_name || '',
                                                bio: profile?.bio || '',
                                            });
                                            setIsEditing(true);
                                        }}
                                        className="w-full btn-primary py-2 flex items-center justify-center gap-2"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <HiPencil /> Edit Profile
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Theme Tab */}
                {activeTab === 'theme' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Mode Toggle */}
                        <div>
                            <label className="block text-sm font-medium mb-3">Appearance</label>
                            <div className="flex gap-3">
                                {(['light', 'dark'] as const).map((m) => (
                                    <motion.button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 ${settings.mode === m ? 'border-primary bg-primary/10 font-medium' : 'border-gray-200'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {m === 'light' ? <HiSun /> : <HiMoon />}
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Primary Color */}
                        <div>
                            <label className="block text-sm font-medium mb-3">Accent Color</label>
                            <div className="flex flex-wrap gap-3">
                                {themeColors.map((color) => (
                                    <motion.button
                                        key={color.value}
                                        onClick={() => setColors({ primary: color.value })}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${settings.colors.primary === color.value ? 'border-gray-800 dark:border-white' : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: color.value }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        title={color.name}
                                    >
                                        {settings.colors.primary === color.value && <HiCheck className="text-black" />}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Font Size */}
                        <div>
                            <label className="block text-sm font-medium mb-3">Font Size</label>
                            <div className="flex gap-2">
                                {(['small', 'medium', 'large'] as const).map((size) => (
                                    <motion.button
                                        key={size}
                                        onClick={() => setFontSize(size)}
                                        className={`flex-1 py-2 rounded-lg border ${settings.fontSize === size ? 'border-primary bg-primary/10 font-medium' : 'border-gray-200'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {size.charAt(0).toUpperCase() + size.slice(1)}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Privacy Toggles */}
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Show Last Seen</p>
                                    <p className="text-sm text-gray-500">Let others see when you were last active</p>
                                </div>
                                <button
                                    onClick={() => setPrivacy({ ...privacy, show_last_seen: !privacy.show_last_seen })}
                                    className={`w-12 h-6 rounded-full transition-colors ${privacy.show_last_seen ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                >
                                    <motion.div
                                        className="w-5 h-5 bg-white rounded-full shadow"
                                        animate={{ x: privacy.show_last_seen ? 26 : 2 }}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Read Receipts</p>
                                    <p className="text-sm text-gray-500">Show when you've read messages</p>
                                </div>
                                <button
                                    onClick={() => setPrivacy({ ...privacy, show_read_receipts: !privacy.show_read_receipts })}
                                    className={`w-12 h-6 rounded-full transition-colors ${privacy.show_read_receipts ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                >
                                    <motion.div
                                        className="w-5 h-5 bg-white rounded-full shadow"
                                        animate={{ x: privacy.show_read_receipts ? 26 : 2 }}
                                    />
                                </button>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Public Profile</p>
                                    <p className="text-sm text-gray-500">Allow anyone to find and message you</p>
                                </div>
                                <button
                                    onClick={() => setPrivacy({ ...privacy, is_profile_public: !privacy.is_profile_public })}
                                    className={`w-12 h-6 rounded-full transition-colors ${privacy.is_profile_public ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                >
                                    <motion.div
                                        className="w-5 h-5 bg-white rounded-full shadow"
                                        animate={{ x: privacy.is_profile_public ? 26 : 2 }}
                                    />
                                </button>
                            </div>
                        </div>

                        <motion.button
                            onClick={savePrivacy}
                            disabled={isSaving}
                            className="w-full btn-primary py-3 mt-4"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSaving ? 'Saving...' : 'Save Privacy Settings'}
                        </motion.button>
                    </motion.div>
                )}

                {/* Logout Button */}
                <motion.button
                    onClick={handleLogout}
                    className="w-full mt-8 py-3 flex items-center justify-center gap-2 text-red-500 border border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <HiLogout />
                    Logout
                </motion.button>
            </div>
        </div>
    );
}
