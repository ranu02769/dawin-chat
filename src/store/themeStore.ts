import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeSettings {
    mode: 'light' | 'dark';
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
    };
    fontSize: 'small' | 'medium' | 'large';
    bubbleStyle: 'rounded' | 'square' | 'minimal';
    density: 'compact' | 'comfortable' | 'spacious';
}

interface ThemeState {
    settings: ThemeSettings;
    setMode: (mode: 'light' | 'dark') => void;
    setColors: (colors: Partial<ThemeSettings['colors']>) => void;
    setFontSize: (size: ThemeSettings['fontSize']) => void;
    setBubbleStyle: (style: ThemeSettings['bubbleStyle']) => void;
    setDensity: (density: ThemeSettings['density']) => void;
    resetToDefault: () => void;
    applyTheme: () => void;
}

const defaultSettings: ThemeSettings = {
    mode: 'light',
    colors: {
        primary: '#90EE90',
        secondary: '#87CEEB',
        accent: '#000000',
        background: '#FFFFFF',
    },
    fontSize: 'medium',
    bubbleStyle: 'rounded',
    density: 'comfortable',
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            settings: defaultSettings,

            setMode: (mode) => {
                set((state) => ({ settings: { ...state.settings, mode } }));
                get().applyTheme();
            },

            setColors: (colors) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        colors: { ...state.settings.colors, ...colors },
                    },
                }));
                get().applyTheme();
            },

            setFontSize: (fontSize) => {
                set((state) => ({ settings: { ...state.settings, fontSize } }));
                get().applyTheme();
            },

            setBubbleStyle: (bubbleStyle) => {
                set((state) => ({ settings: { ...state.settings, bubbleStyle } }));
            },

            setDensity: (density) => {
                set((state) => ({ settings: { ...state.settings, density } }));
            },

            resetToDefault: () => {
                set({ settings: defaultSettings });
                get().applyTheme();
            },

            applyTheme: () => {
                const { settings } = get();
                const root = document.documentElement;

                // Apply dark mode class
                if (settings.mode === 'dark') {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }

                // Apply custom colors
                root.style.setProperty('--primary', settings.colors.primary);
                root.style.setProperty('--secondary', settings.colors.secondary);
                root.style.setProperty('--accent', settings.colors.accent);

                // Apply font size
                const fontSizes = { small: '14px', medium: '16px', large: '18px' };
                root.style.fontSize = fontSizes[settings.fontSize];
            },
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.applyTheme();
                }
            },
        }
    )
);
