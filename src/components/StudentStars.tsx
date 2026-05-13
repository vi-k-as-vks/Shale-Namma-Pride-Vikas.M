import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { StudentStar } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Trophy, Medal as MedalIcon, Plus, X, Camera, Send, Trash2 } from 'lucide-react';

export const StudentStars: React.FC = () => {
  const { t, language, profile, userRoleIntent } = useAppContext();
  const [stars, setStars] = useState<StudentStar[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Add Form State
  const [newName, setNewName] = useState('');
  const [newAchievementEn, setNewAchievementEn] = useState('');
  const [newAchievementKn, setNewAchievementKn] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletedMockIds, setDeletedMockIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shale_deleted_stars');
    return saved ? JSON.parse(saved) : [];
  });

  const [hasAddedRealData, setHasAddedRealData] = useState(() => {
    return localStorage.getItem('shale_has_real_stars') === 'true';
  });

  useEffect(() => {
    setIsAdmin(profile?.role === 'admin' && userRoleIntent === 'admin');
  }, [profile, userRoleIntent]);

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as StudentStar))
        .filter(s => !deletedMockIds.includes(s.id));

      if (docs.length > 0) {
        setHasAddedRealData(true);
        localStorage.setItem('shale_has_real_stars', 'true');
        setStars(docs);
      } else if (!hasAddedRealData) {
        // Mock data for demo
        const mockStars: StudentStar[] = [
          { id: '1', name: 'Rahul K.', achievementEn: 'Winner of District Level Science Fair 2024.', achievementKn: 'ಜಿಲ್ಲಾ ಮಟ್ಟದ ವಿಜ್ಞಾನ ಮೇಳ 2024 ರ ವಿಜೇತ.', photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul', date: '2024-05-10', updatedAt: '' },
          { id: '2', name: 'Sophia M.', achievementEn: 'Perfect 100% attendance for the academic year.', achievementKn: 'ಶೈಕ್ಷಣಿಕ ವರ್ಷದಲ್ಲಿ 100% ಹಾಜರಾತಿ.', photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia', date: '2024-05-08', updatedAt: '' },
          { id: '3', name: 'Kiran P.', achievementEn: 'Gold medal in 100m sprint.', achievementKn: '100 ಮೀ ಓಟದಲ್ಲಿ ಚಿನ್ನದ ಪದಕ.', photoUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kiran', date: '2024-05-05', updatedAt: '' },
        ];
        setStars(mockStars.filter(s => !deletedMockIds.includes(s.id)));
      } else {
        setStars([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });
    return unsubscribe;
  }, [deletedMockIds, hasAddedRealData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setImagePreview(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAchievementEn || !newAchievementKn || !imagePreview) return;

    setPosting(true);
    try {
      await addDoc(collection(db, 'students'), {
        name: newName,
        achievementEn: newAchievementEn,
        achievementKn: newAchievementKn,
        photoUrl: imagePreview,
        date: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      });
      setShowAddForm(false);
      setNewName('');
      setNewAchievementEn('');
      setNewAchievementKn('');
      setImagePreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteStar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Removed window.confirm due to iframe restrictions
    // if (!confirm(t('delAchievementConfirm'))) return;

    // Track in deleted IDs
    setDeletedMockIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('shale_deleted_stars', JSON.stringify(next));
      return next;
    });

    if (id.length >= 5) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex-1 text-left">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('studentStars')}</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('starTitleDesc')}</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-3 bg-school-pink text-white rounded-2xl shadow-lg shadow-pink-200 hover:scale-105 active:scale-95 transition-all ml-4 flex-shrink-0"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]">
              <button 
                onClick={() => setShowAddForm(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>

              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('addStudent')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('fillDetails')}</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 mx-auto bg-slate-50 dark:bg-slate-800 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold">{t('photo')}</span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('studentName')}</label>
                  <input 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('enterStudentName')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-pink dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('achievementEn')}</label>
                  <textarea 
                    value={newAchievementEn}
                    onChange={(e) => setNewAchievementEn(e.target.value)}
                    placeholder={t('achieveEnPlaceholder')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-pink dark:text-white h-20 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('achievementKn')}</label>
                  <textarea 
                    value={newAchievementKn}
                    onChange={(e) => setNewAchievementKn(e.target.value)}
                    placeholder={t('achieveKnPlaceholder')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-pink dark:text-white h-20 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddStudent}
                disabled={posting || !newName || !imagePreview}
                className="w-full child-button bg-school-pink text-white shadow-xl shadow-pink-100 dark:shadow-none flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {posting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    {t('postAchievement')}
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stars.map((star, idx) => (
          <motion.div
            key={star.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="child-card border-l-8 border-l-school-pink flex items-center gap-5 relative overflow-hidden group hover:shadow-lg transition-shadow"
          >
            <div className="absolute -right-4 -top-4 text-school-pink opacity-5 rotate-12 group-hover:scale-110 transition-transform">
              <Trophy size={100} />
            </div>
            
            <div className="w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-900/10 border-4 border-white dark:border-slate-800 shadow-sm flex-shrink-0 flex items-center justify-center overflow-hidden z-10">
              <img src={star.photoUrl} alt={star.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{star.name}</h4>
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDeleteStar(star.id, e)}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug italic font-medium">
                "{language === 'en' ? star.achievementEn : star.achievementKn}"
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider">
                <span>{star.date}</span>
                <span>•</span>
                <span className="text-school-pink">{t('prideOfSchool')}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-8 bg-pink-50 dark:bg-pink-950/20 rounded-3xl border border-dashed border-pink-200 dark:border-pink-900/30 text-center">
        <div className="inline-flex p-3 rounded-full bg-white dark:bg-slate-800 text-school-pink mb-3 shadow-sm">
          <Star size={24} />
        </div>
        <h4 className="font-bold text-pink-800 dark:text-pink-300">{t('everyChildIsStar')}</h4>
        <p className="text-sm text-pink-600 dark:text-pink-400">{t('celebrateEffort')}</p>
      </div>
    </div>
  );
};
