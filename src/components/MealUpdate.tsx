import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { MealRecord } from '../types';
import { Utensils, Camera, Check, AlertCircle, X, Send, History, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MealUpdate: React.FC = () => {
  const { t, language, profile, userRoleIntent } = useAppContext();
  const [meal, setMeal] = useState<MealRecord | null>(null);
  const [pastMeals, setPastMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  
  // Post Form State
  const [newMenuEn, setNewMenuEn] = useState('');
  const [newMenuKn, setNewMenuKn] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [selectedPastMeal, setSelectedPastMeal] = useState<MealRecord | null>(null);

  useEffect(() => {
    setIsAdmin(profile?.role === 'admin' && userRoleIntent === 'admin');
  }, [profile, userRoleIntent]);

  const [deletedMockIds, setDeletedMockIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shale_deleted_meals');
    return saved ? JSON.parse(saved) : [];
  });

  const [hasAddedRealData, setHasAddedRealData] = useState(() => {
    return localStorage.getItem('shale_has_real_meals') === 'true';
  });
  
  useEffect(() => {
    const q = query(collection(db, 'meals'), orderBy('date', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as MealRecord))
        .filter(m => !deletedMockIds.includes(m.id));

      if (docs.length > 0) {
        setHasAddedRealData(true);
        localStorage.setItem('shale_has_real_meals', 'true');
        setMeal(docs[0]);
        setPastMeals(docs.slice(1));
      } else if (!hasAddedRealData) {
        // Fallback for empty DB - Authentic Indian Veg School Meals
        const fallbackMeal: MealRecord = {
          id: 'default',
          date: '2026-05-02',
          menuEn: 'Rice with Mixed Vegetable Sambar',
          menuKn: 'ಅನ್ನ ಮತ್ತು ತರಕಾರಿ ಸಾಂಬಾರ್',
          photoUrl: '/img1.jpg',
          publisherId: 'system',
          updatedAt: new Date().toISOString()
        };
        
        const fallbackPast: MealRecord[] = [
          { id: 'p1', date: '2026-05-01', menuEn: 'Vegetable Pulao & Curd', menuKn: 'ತರಕಾರಿ ಪುಲಾವ್ ಮತ್ತು ಮೊಸರು', photoUrl: '/img2.jpg', publisherId: 'system', updatedAt: '' },
          { id: 'p2', date: '2026-04-30', menuEn: 'Lemon Rice & Chutney', menuKn: 'ಚಿತ್ರಾನ್ನ ಮತ್ತು ಚಟ್ನಿ', photoUrl: '/img3.jpg', publisherId: 'system', updatedAt: '' },
          { id: 'p3', date: '2026-04-29', menuEn: 'Ragi Mudde & Saaru', menuKn: 'ರಾಗಿ ಮುದ್ದೆ ಮತ್ತು ಸಾರು', photoUrl: '/img4.jpg', publisherId: 'system', updatedAt: '' },
          { id: 'p4', date: '2026-04-28', menuEn: 'Bisibelebath', menuKn: 'ಬಿಸಿಬೇಳೆಬಾತ್', photoUrl: '/img5.jpg', publisherId: 'system', updatedAt: '' },
        ];

        setMeal(deletedMockIds.includes('default') ? null : fallbackMeal);
        setPastMeals(fallbackPast.filter(m => !deletedMockIds.includes(m.id)));
      } else {
        // DB was interacted with but is now empty
        setMeal(null);
        setPastMeals([]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'meals');
      setLoading(false);
    });
    return unsubscribe;
  }, [deletedMockIds, hasAddedRealData]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePostMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !newMenuEn || !newMenuKn || !profile?.uid) return;

    // Calculate tomorrow's date
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    // Check if a meal for tomorrow already exists
    const alreadyPosted = [meal, ...pastMeals].some(m => m?.date === nextDayStr);
    if (alreadyPosted) {
      alert(t('mealAlreadyPosted'));
      return;
    }

    setPosting(true);
    try {
      await addDoc(collection(db, 'meals'), {
        date: nextDayStr,
        menuEn: newMenuEn,
        menuKn: newMenuKn,
        photoUrl: imagePreview,
        publisherId: profile.uid,
        updatedAt: new Date().toISOString()
      });
      setShowPostForm(false);
      setNewMenuEn('');
      setNewMenuKn('');
      setImagePreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'meals');
    } finally {
      setPosting(false);
    }
  };

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

  const handleDeleteMeal = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Removed window.confirm due to iframe restrictions
    // if (!confirm(t('delMealConfirm'))) return;

    // Track in deleted IDs to prevent re-appearance during fallback or sync delays
    setDeletedMockIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('shale_deleted_meals', JSON.stringify(next));
      return next;
    });

    // If it's a Firestore record, delete it permanently from the server
    if (id !== 'default' && !id.startsWith('p') && id.length >= 5) {
      try {
        await deleteDoc(doc(db, 'meals', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `meals/${id}`);
      }
    }
  };

  if (loading) return <div className="flex justify-center p-10 font-bold text-school-blue">{t('loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="child-card overflow-hidden !p-0">
        <div className="h-64 bg-slate-200 dark:bg-slate-800 relative group">
          {meal?.photoUrl ? (
            <img src={meal.photoUrl} alt="Today's Meal" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <Utensils size={48} className="mb-2 opacity-20" />
              <p>{t('noMealYet')}</p>
            </div>
          )}
          <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-1.5 rounded-full shadow-sm z-10">
            <span className="text-xs font-bold text-school-blue">{meal?.date}</span>
          </div>

          {isAdmin && meal && (
            <button 
              onClick={(e) => handleDeleteMeal(meal.id, e)}
              className="absolute top-4 right-4 p-2.5 bg-red-500/90 text-white rounded-full shadow-lg z-20 hover:scale-110 active:scale-95 transition-transform backdrop-blur-sm"
              title="Delete post"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('todayMeal')}</h3>
            {isAdmin && !showPostForm && (
              <button 
                onClick={() => {
                  const nextDay = new Date();
                  nextDay.setDate(nextDay.getDate() + 1);
                  const nextDayStr = nextDay.toISOString().split('T')[0];
                  const alreadyPosted = [meal, ...pastMeals].some(m => m?.date === nextDayStr);
                  
                  if (alreadyPosted) {
                    alert(t('mealAlreadyPosted'));
                  } else {
                    setShowPostForm(true);
                  }
                }}
                className="p-2 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-colors"
              >
                <Camera size={20} />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {language === 'en' ? meal?.menuEn : meal?.menuKn}
          </p>
          <div className="flex items-center gap-3 p-4 bg-secondary-soft dark:bg-secondary-dark/20 rounded-2xl border border-green-100 dark:border-green-900/30">
            <div className="w-10 h-10 rounded-full bg-school-green/10 flex items-center justify-center text-school-green shadow-inner">
              <Check size={20} />
            </div>
            <p className="text-[12px] font-bold text-green-700 dark:text-green-300">{t('mealDesc')}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPostForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-amber-200 dark:border-amber-900/50 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Camera size={18} className="text-amber-500" />
                  {t('postMeal')}
                </h4>
                <button onClick={() => setShowPostForm(false)} className="text-slate-400 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('uploadPhoto')}</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={32} className="text-amber-300 mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold">{t('uploadFromCamera')}</span>
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
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                  <Check size={16} />
                </div>
                <p className="text-[11px] font-bold text-green-700 dark:text-green-300">
                  {t('strictlyVeg')}
                </p>
              </div>

              <div className="space-y-3">
                <input 
                  value={newMenuEn}
                  onChange={(e) => setNewMenuEn(e.target.value)}
                  placeholder={t('menuEn')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                />
                <input 
                  value={newMenuKn}
                  onChange={(e) => setNewMenuKn(e.target.value)}
                  placeholder={t('menuKn')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 dark:text-white"
                />
              </div>

              <button 
                onClick={handlePostMeal}
                disabled={posting || !imagePreview || !newMenuEn}
                className="w-full child-button bg-amber-500 text-white shadow-xl shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {posting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    {t('postMeal')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="space-y-4">
        <h3 className="font-bold text-slate-700 dark:text-slate-400 flex items-center gap-2 text-sm uppercase tracking-widest">
          <History size={16} />
          {t('pastMeals')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 md:grid-cols-3 gap-3 md:gap-4">
          {pastMeals.length > 0 ? (
            pastMeals.map((m) => (
              <div 
                key={m.id} 
                onClick={() => setSelectedPastMeal(m)}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm relative group cursor-pointer"
              >
                <img src={m.photoUrl} alt={m.date} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3">
                  <div className="flex justify-end p-2">
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeal(m.id, e);
                        }}
                        className="p-2 bg-red-500 text-white rounded-xl shadow-lg ring-2 ring-white/20 hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-white font-bold">{m.date}</p>
                    <p className="text-[9px] text-slate-300 truncate">{language === 'en' ? m.menuEn : m.menuKn}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))
          )}
        </div>
      </div>
      <AnimatePresence>
        {selectedPastMeal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-6"
            onClick={() => setSelectedPastMeal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedPastMeal(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>
              <div className="w-full h-80 relative">
                <img src={selectedPastMeal.photoUrl} alt={selectedPastMeal.date} className="w-full h-full object-cover" />
                {isAdmin && (
                  <button 
                    onClick={(e) => {
                      setSelectedPastMeal(null);
                      handleDeleteMeal(selectedPastMeal.id, e);
                    }}
                    className="absolute bottom-4 right-4 p-3 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-school-blue font-bold text-sm">
                  <History size={16} />
                  {selectedPastMeal.date}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {language === 'en' ? selectedPastMeal.menuEn : selectedPastMeal.menuKn}
                </h3>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
