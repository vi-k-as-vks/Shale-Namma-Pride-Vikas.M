import React, { useState, useEffect } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { Utensils, Camera, Star, MessageSquare, TrendingUp, Users, Calendar, Library, Edit2, CheckCircle, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t, profile, userRoleIntent, language } = useAppContext();
  const [statsData, setStatsData] = useState({
    enrollment: '485',
    staff: '18',
    classes: '14'
  });
  const [notifications, setNotifications] = useState<{en: string, kn: string}[]>([]);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [newNoticeEn, setNewNoticeEn] = useState('');
  const [newNoticeKn, setNewNoticeKn] = useState('');

  const isAdmin = profile?.role === 'admin' && userRoleIntent === 'admin';
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [editStats, setEditStats] = useState(statsData);
  const [savingStats, setSavingStats] = useState(false);

  useEffect(() => {
    // Attempt to fetch real stats from Firestore
    const unsubStats = onSnapshot(doc(db, 'config', 'schoolStats'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newStats = {
          enrollment: data.enrollment || '485',
          staff: data.staff || '18',
          classes: data.classes || '14'
        };
        setStatsData(newStats);
        if (!isEditingStats) setEditStats(newStats);
      }
    });

    const unsubNotices = onSnapshot(doc(db, 'config', 'notifications'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().list || [];
        // Support legacy string format and new object format
        const formatted = data.map((item: any) => {
          if (typeof item === 'string') {
            return { en: item, kn: item };
          }
          return item;
        });
        setNotifications(formatted);
      } else {
        setNotifications([
          { en: t('notificationRain'), kn: t('notificationRain') },
          { en: t('notificationAnnual'), kn: t('notificationAnnual') }
        ]);
      }
    });

    return () => {
      unsubStats();
      unsubNotices();
    };
  }, [isEditingStats, language]);

  const handleSaveStats = async () => {
    setSavingStats(true);
    try {
      await setDoc(doc(db, 'config', 'schoolStats'), editStats);
      setIsEditingStats(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/schoolStats');
    } finally {
      setSavingStats(false);
    }
  };

  const handleAddNotice = async () => {
    if (!newNoticeEn.trim() && !newNoticeKn.trim()) return;
    const newList = [{ en: newNoticeEn, kn: newNoticeKn }, ...notifications].slice(0, 5);
    try {
      const currentDoc = await getDoc(doc(db, 'config', 'notifications'));
      const currentCount = currentDoc.exists() ? (currentDoc.data().totalCount || currentDoc.data().list?.length || 0) : 0;
      await setDoc(doc(db, 'config', 'notifications'), { 
        list: newList,
        totalCount: currentCount + 1 
      });
      setNewNoticeEn('');
      setNewNoticeKn('');
      setIsEditingNotice(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/notifications');
    }
  };

  const handleDeleteNotice = async (idx: number) => {
    const newList = notifications.filter((_, i) => i !== idx);
    try {
      await setDoc(doc(db, 'config', 'notifications'), { list: newList });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'config/notifications');
    }
  };

  const stats = [
    { key: 'enrollment', label: t('enrollment'), value: statsData.enrollment, icon: Users, color: 'bg-indigo-500' },
    { key: 'staff', label: t('staff'), value: statsData.staff, icon: Library, color: 'bg-emerald-500' },
    { key: 'classes', label: t('classes'), value: statsData.classes, icon: TrendingUp, color: 'bg-amber-500' },
  ];

  const features = [
    { id: 'meals', label: t('meals'), icon: Utensils, color: 'bg-emerald-100 text-emerald-600', description: t('lunchDesc') },
    { id: 'facilities', label: t('facilities'), icon: Camera, color: 'bg-sky-100 text-sky-600', description: t('seeSchool') },
    { id: 'achievements', label: t('achievements'), icon: Star, color: 'bg-rose-100 text-rose-600', description: t('celebratingSuccess') },
    { id: 'feedback', label: t('feedback'), icon: MessageSquare, color: 'bg-amber-100 text-amber-600', description: t('voiceThoughts') },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className={`rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-lg ${isAdmin ? 'bg-amber-400 shadow-amber-100' : 'bg-school-blue shadow-blue-200'}`}>
        <div className="relative z-10 flex items-center gap-4">
          {profile?.photoUrl ? (
            <img 
              src={profile.photoUrl} 
              alt={profile.name} 
              className="w-16 h-16 rounded-full object-cover border-4 border-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Users size={32} className="text-white/40" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {t('namaste')}, {profile?.name || (isAdmin ? 'Admin' : t('parentAuth'))}!
            </h2>
            <div className="flex flex-col">
              <p className="text-white text-sm opacity-90 max-w-[80%] font-medium">
                {isAdmin ? t('adminWelcomeMsg') : t('parentWelcomeMsg')}
              </p>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-1">
                {isAdmin ? t('adminModeLabel') : t('parentModeLabel')}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-4 right-4 animate-bounce">
          <Star className="text-yellow-300 fill-yellow-300" size={32} />
        </div>
      </div>

      {/* Stats row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {t('schoolStats')}
          </h3>
          {isAdmin && (
            <button 
              onClick={() => {
                if (isEditingStats) {
                  handleSaveStats();
                } else {
                  setIsEditingStats(true);
                  setEditStats(statsData);
                }
              }}
              disabled={savingStats}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                isEditingStats 
                ? 'bg-school-green text-white shadow-lg shadow-green-100' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {savingStats ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isEditingStats ? <CheckCircle size={12} /> : <Edit2 size={12} />
              )}
              {isEditingStats ? t('saveChanges') : t('editStats')}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className={`p-2 rounded-xl mb-2 ${stat.color} text-white`}>
                <stat.icon size={18} />
              </div>
              {isEditingStats ? (
                <input 
                  type="text"
                  value={editStats[stat.key as keyof typeof editStats]}
                  onChange={(e) => setEditStats(prev => ({ ...prev, [stat.key]: e.target.value }))}
                  className="w-full text-lg font-bold text-slate-800 dark:text-slate-200 text-center bg-slate-50 dark:bg-slate-800 rounded-lg border-b-2 border-school-blue outline-none"
                />
              ) : (
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stat.value}</span>
              )}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
        {isEditingStats && (
          <div className="flex justify-center">
            <button 
              onClick={() => setIsEditingStats(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {t('latestNotifications')}
          </h3>
          {isAdmin && (
            <button 
              onClick={() => setIsEditingNotice(true)}
              className="p-2 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {isEditingNotice && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-indigo-200 dark:border-indigo-900/50 shadow-lg space-y-3"
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-tighter">English</span>
                  <textarea 
                    value={newNoticeEn}
                    onChange={(e) => setNewNoticeEn(e.target.value)}
                    placeholder={t('shareIdea')}
                    className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-sm resize-none outline-none dark:text-white border border-transparent focus:border-indigo-200"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-tighter">ಕನ್ನಡ (Kannada)</span>
                  <textarea 
                    value={newNoticeKn}
                    onChange={(e) => setNewNoticeKn(e.target.value)}
                    placeholder={t('shareIdea')}
                    className="w-full h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 text-sm resize-none outline-none dark:text-white border border-transparent focus:border-indigo-200"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleAddNotice}
                  className="flex-1 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100"
                >
                  {t('postAchievement')}
                </button>
                <button 
                  onClick={() => setIsEditingNotice(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-bold"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          )}
          
          {notifications.map((note, i) => (
            <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-50 dark:border-slate-800 shadow-sm relative group">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {language === 'en' ? note.en : note.kn}
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteNotice(i)}
                  className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Calendar size={20} className="text-school-blue" />
          {t('schoolHighlights')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, idx) => (
            <motion.button
              key={feature.id}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onNavigate(feature.id)}
              className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm flex flex-col items-start gap-4 text-left group transition-all hover:shadow-md"
            >
              <div className={`p-3 rounded-2xl ${feature.color} dark:bg-slate-800 transition-transform group-hover:scale-110`}>
                <feature.icon size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">{feature.label}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{feature.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Daily Quote/Tip */}
      <div className="bg-accent-soft dark:bg-accent-dark/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30">
        <p className="text-sm italic text-amber-800 dark:text-amber-200 opacity-90">{t('quote')}</p>
      </div>
    </div>
  );
};
