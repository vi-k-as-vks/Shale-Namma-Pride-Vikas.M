import React, { useState, useEffect } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { FacilityRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, MapPin, Plus, X, Camera, Send, Trash2 } from 'lucide-react';

export const FacilityTour: React.FC = () => {
  const { t, language, profile, userRoleIntent } = useAppContext();
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Add Form State
  const [newCategory, setNewCategory] = useState('');
  const [newCaptionEn, setNewCaptionEn] = useState('');
  const [newCaptionKn, setNewCaptionKn] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [deletedMockIds, setDeletedMockIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('shale_deleted_facilities');
    return saved ? JSON.parse(saved) : [];
  });

  const [hasAddedRealData, setHasAddedRealData] = useState(() => {
    return localStorage.getItem('shale_has_real_facilities') === 'true';
  });

  useEffect(() => {
    setIsAdmin(profile?.role === 'admin' && userRoleIntent === 'admin');
  }, [profile, userRoleIntent]);

  useEffect(() => {
    // Mock data if Firestore is empty for demo
    const mockFacilities: FacilityRecord[] = [
      { id: '1', category: 'Smart Classroom', photoUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80', captionEn: 'Digital learning with interactive smart boards.', captionKn: 'ಸಂವಾದಾತ್ಮಕ ಸ್ಮಾರ್ಟ್ ಬೋರ್ಡ್‌ಗಳೊಂದಿಗೆ ಡಿಜಿಟಲ್ ಕಲಿಕೆ.', updatedAt: '' },
      { id: '2', category: 'Library', photoUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80', captionEn: 'Our quiet space for reading and knowledge.', captionKn: 'ಓದುವಿಕೆ ಮತ್ತು ಜ್ಞಾನಕ್ಕಾಗಿ ನಮ್ಮ ಶಾಂತಿಯುತ ಸ್ಥಳ.', updatedAt: '' },
      { id: '3', category: 'Science Lab', photoUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80', captionEn: 'Hands-on experiments in our science laboratory.', captionKn: 'ನಮ್ಮ ವಿಜ್ಞಾನ ಪ್ರಯೋಗಾಲಯದಲ್ಲಿ ಪ್ರಾಯೋಗಿಕ ಕಲಿಕೆ.', updatedAt: '' },
      { id: '4', category: 'Computer Lab', photoUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80', captionEn: 'Developing digital skills for the future.', captionKn: 'ಭವಿಷ್ಯಕ್ಕಾಗಿ ಡಿಜಿಟಲ್ ಕೌಶಲ್ಯಗಳನ್ನು ಅಭಿವೃದ್ಧಿಪಡಿಸುವುದು.', updatedAt: '' },
      { id: '5', category: 'Playground', photoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80', captionEn: 'Spacious ground for sports and physical training.', captionKn: 'ಕ್ರೀಡೆ ಮತ್ತು ದೈಹಿಕ ತರಬೇತಿಗಾಗಿ ವಿಶಾಲವಾದ ಮೈದಾನ.', updatedAt: '' },
      { id: '6', category: 'Kitchen', photoUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80', captionEn: 'Clean and hygienic midday meal preparation area.', captionKn: 'ಶುದ್ಧ ಮತ್ತು ಆರೋಗ್ಯಕರ ಮಧ್ಯಾಹ್ನದ ಊಟ ತಯಾರಿಸುವ ಸ್ಥಳ.', updatedAt: '' },
    ];

    const unsubscribe = onSnapshot(collection(db, 'facilities'), (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as FacilityRecord))
        .filter(f => !deletedMockIds.includes(f.id));

      if (docs.length > 0) {
        setHasAddedRealData(true);
        localStorage.setItem('shale_has_real_facilities', 'true');
        setFacilities(docs);
      } else if (!hasAddedRealData) {
        setFacilities(mockFacilities.filter(f => !deletedMockIds.includes(f.id)));
      } else {
        setFacilities([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'facilities');
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

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newCaptionEn || !newCaptionKn || !imagePreview) return;

    setPosting(true);
    try {
      await addDoc(collection(db, 'facilities'), {
        category: newCategory,
        captionEn: newCaptionEn,
        captionKn: newCaptionKn,
        photoUrl: imagePreview,
        updatedAt: new Date().toISOString()
      });
      setShowAddForm(false);
      setNewCategory('');
      setNewCaptionEn('');
      setNewCaptionKn('');
      setImagePreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'facilities');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteFacility = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Removed window.confirm due to iframe restrictions
    // if (!confirm(t('delFacilityConfirm'))) return;

    // Track in deleted IDs
    setDeletedMockIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('shale_deleted_facilities', JSON.stringify(next));
      return next;
    });
    
    // Decrease index if needed
    if (currentIndex >= facilities.length - 1) {
      setCurrentIndex(Math.max(0, facilities.length - 2));
    }

    if (id.length >= 5) {
      try {
        await deleteDoc(doc(db, 'facilities', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `facilities/${id}`);
      }
    }
  };

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % facilities.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + facilities.length) % facilities.length);

  if (facilities.length === 0) return null;

  const current = facilities[currentIndex];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 text-left">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('facilityGallery')}</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('tourFacilitiesDesc')}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-3 bg-school-blue text-white rounded-2xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all ml-4 flex-shrink-0"
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
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('addFacilityPhoto')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('showcaseEnvironment')}</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold">{t('uploadPhoto')}</span>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('categoryName')}</label>
                  <input 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder={t('egScienceLab')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-blue dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('captionEn')}</label>
                  <textarea 
                    value={newCaptionEn}
                    onChange={(e) => setNewCaptionEn(e.target.value)}
                    placeholder={t('achieveEnPlaceholder')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-blue dark:text-white h-20 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('captionKn')}</label>
                  <textarea 
                    value={newCaptionKn}
                    onChange={(e) => setNewCaptionKn(e.target.value)}
                    placeholder={t('achieveKnPlaceholder')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-school-blue dark:text-white h-20 resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddFacility}
                disabled={posting || !newCategory || !imagePreview}
                className="w-full child-button bg-school-blue text-white shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {posting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Post Facility Photo
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative child-card !p-0 overflow-hidden shadow-xl shadow-blue-100 dark:shadow-none aspect-[4/5]">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.photoUrl}
            alt={current.category}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute top-4 right-4 z-20">
          {isAdmin && (
            <button 
              onClick={(e) => handleDeleteFacility(current.id, e)}
              className="p-2.5 bg-red-500/80 backdrop-blur-md text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-school-blue rounded-lg">
              <MapPin size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">{current.category}</span>
          </div>
          <p className="text-lg font-medium leading-snug">
            {language === 'en' ? current.captionEn : current.captionKn}
          </p>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 left-4">
          <button onClick={prevSlide} className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-4">
          <button onClick={nextSlide} className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {facilities.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-school-blue' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
        {facilities.map((f, i) => (
          <button 
            key={f.id} 
            onClick={() => setCurrentIndex(i)}
            className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-school-blue ring-4 ring-blue-50 dark:ring-blue-900/20' : 'border-transparent'}`}
          >
            <img src={f.photoUrl} alt={f.category} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};
