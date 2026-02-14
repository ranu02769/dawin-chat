import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.dawinchat.app',
    appName: 'Dawin Chat',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
