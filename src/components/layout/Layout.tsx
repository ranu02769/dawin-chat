import { Outlet } from 'react-router-dom';
import BottomNav from '../navigation/BottomNav';
import Sidebar from '../navigation/Sidebar';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export default function Layout() {
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Sidebar for desktop */}
            {!isMobile && <Sidebar />}

            {/* Main content */}
            <main className={`${isMobile ? 'pb-20' : 'ml-64'} min-h-screen`}>
                <Outlet />
            </main>

            {/* Bottom nav for mobile */}
            {isMobile && <BottomNav />}
        </div>
    );
}
