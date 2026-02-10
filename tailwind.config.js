/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#90EE90',
                    DEFAULT: '#7CCD7C',
                    dark: '#6CB86C',
                },
                secondary: {
                    light: '#87CEEB',
                    DEFAULT: '#6BB3D9',
                    dark: '#5A9FC4',
                },
                accent: {
                    DEFAULT: '#000000',
                },
                background: {
                    light: '#FFFFFF',
                    dark: '#1a1a2e',
                },
                surface: {
                    light: '#F8F9FA',
                    dark: '#16213e',
                },
                text: {
                    light: '#000000',
                    dark: '#FFFFFF',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'pulse-slow': 'pulse 3s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
