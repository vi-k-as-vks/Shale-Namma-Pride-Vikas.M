import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Home, Utensils, Camera, Star, MessageSquare, User, Globe, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { t, language, setLanguage, profile, userRoleIntent } = useAppContext();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const isAdmin = profile?.role === 'admin' && userRoleIntent === 'admin';

  // Parents shouldn't see 'adding' options, but they probably still want to see the feeds for Meal, Facilities, Stars.
  // The user says "remove adding option for parents only leave feedback option and profile option to edits",
  // meaning parents can only edit their profile and create feedback. They can view the others.
  const allTabs = [
    { id: 'dashboard', icon: Home, label: t('dashboard') },
    { id: 'meals', icon: Utensils, label: t('meals') },
    { id: 'facilities', icon: Camera, label: t('facilities') },
    { id: 'achievements', icon: Star, label: t('achievements') },
    { id: 'feedback', icon: MessageSquare, label: t('feedback') },
    { id: 'profile', icon: User, label: t('profile') },
  ];
  
  // Show all tabs for both, since they both need to view them. Admin can add.
  const tabs = allTabs;

  return (
    <div className="flex flex-col min-h-screen pb-24 w-full bg-slate-50 dark:bg-slate-950 relative overflow-x-hidden transition-colors">
      {/* Header */}
      {activeTab !== 'profile' && (
        <header className="p-6 md:px-8 max-w-7xl mx-auto w-full bg-white dark:bg-slate-900 flex justify-between items-center sticky top-0 z-30 shadow-sm rounded-b-[2rem] transition-colors border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-school-blue">{t('appName')}</h1>
              {isOffline && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full"
                  title="Offline Mode"
                >
                  <WifiOff size={10} />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('schoolMoto')}</p>
          </div>
          <button 
            onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft dark:bg-primary-dark/30 text-school-blue font-semibold text-sm transition-colors hover:bg-school-blue hover:text-white"
          >
            <Globe size={16} />
            {language === 'en' ? 'ಕನ್ನಡ' : 'English'}
          </button>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto w-full ${activeTab === 'profile' ? 'p-0 pb-6' : 'p-6 md:p-8'} max-w-7xl mx-auto`}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-40 transition-colors">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center sm:justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 sm:px-4 py-1 transition-all ${
                activeTab === tab.id ? 'text-school-blue scale-110' : 'text-slate-400 dark:text-slate-600 hover:text-slate-500'
              }`}
            >
              <div className={`p-2 rounded-2xl ${activeTab === tab.id ? 'bg-primary-soft dark:bg-primary-dark/30' : 'bg-transparent'}`}>
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              </div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
