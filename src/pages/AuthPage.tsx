import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignUpStep1 from '../components/auth/SignUpStep1';
import SignUpStep2 from '../components/auth/SignUpStep2';
import LoginForm from '../components/auth/LoginForm';

type AuthView = 'login' | 'signup-1' | 'signup-2';

export interface SignUpFormData {
    email: string;
    password: string;
    confirmPassword: string;
    full_name: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    username: string;
}

export default function AuthPage() {
    const [view, setView] = useState<AuthView>('login');
    const [signUpData, setSignUpData] = useState<Partial<SignUpFormData>>({});

    const handleStep1Complete = (data: Partial<SignUpFormData>) => {
        setSignUpData((prev) => ({ ...prev, ...data }));
        setView('signup-2');
    };

    const handleStep2Back = () => {
        setView('signup-1');
    };

    const renderContent = () => {
        switch (view) {
            case 'signup-1':
                return (
                    <SignUpStep1
                        initialData={signUpData}
                        onNext={handleStep1Complete}
                        onBack={() => setView('login')}
                    />
                );
            case 'signup-2':
                return (
                    <SignUpStep2
                        signUpData={signUpData as Omit<SignUpFormData, 'username'>}
                        onBack={handleStep2Back}
                    />
                );
            default:
                return <LoginForm onSignUp={() => setView('signup-1')} />;
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 gradient-primary">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl font-bold text-black mb-2">Dawin Chat</h1>
                    <p className="text-gray-700">Connect, Chat, Share</p>
                </motion.div>

                {/* Auth Card */}
                <motion.div
                    className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl p-6 md:p-8"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
