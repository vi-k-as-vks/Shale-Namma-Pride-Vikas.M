import React, { useState, useRef } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { auth, db, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LogOut, User, Phone, Globe, Shield, ExternalLink, Mail, Edit2, Check, X, Camera, Loader2, ChevronRight, MapPin, GraduationCap, BookOpen, Clock, Settings, Sun, Moon, Bell, BarChart3, Trash2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Profile: React.FC = () => {
  const { t, profile, language, setLanguage, user, userRoleIntent, schoolInfo, theme, setTheme } = useAppContext();
  const isAdmin = profile?.role === 'admin' && userRoleIntent === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingSchoolInfo, setIsEditingSchoolInfo] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editPhone, setEditPhone] = useState(profile?.phoneNumber || '');
  const [editSchoolName, setEditSchoolName] = useState(schoolInfo?.name || '');
  const [editSchoolDistrict, setEditSchoolDistrict] = useState(schoolInfo?.district || '');
  const [editSchoolVillage, setEditSchoolVillage] = useState(schoolInfo?.village || '');
  const [editSchoolMedium, setEditSchoolMedium] = useState(schoolInfo?.medium || '');
  const [editSchoolNameKn, setEditSchoolNameKn] = useState(schoolInfo?.name_kn || '');
  const [editSchoolDistrictKn, setEditSchoolDistrictKn] = useState(schoolInfo?.district_kn || '');
  const [editSchoolVillageKn, setEditSchoolVillageKn] = useState(schoolInfo?.village_kn || '');
  const [editSchoolMediumKn, setEditSchoolMediumKn] = useState(schoolInfo?.medium_kn || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photoUrl || null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifDailyMeal, setNotifDailyMeal] = useState(() => localStorage.getItem('notif_daily_meal') !== 'false');
  const [notifStudentStars, setNotifStudentStars] = useState(() => localStorage.getItem('notif_student_stars') !== 'false');
  const [notifAnnouncements, setNotifAnnouncements] = useState(() => localStorage.getItem('notif_announcements') !== 'false');
  const [saving, setSaving] = useState(false);
  const [activityStats, setActivityStats] = useState({ meals: 0, students: 0, feedback: 0, announcements: 0 });

  React.useEffect(() => {
    if (isAdmin) {
      const unsubMeals = onSnapshot(collection(db, 'meals'), (snap) => {
        let hasRealMeals = localStorage.getItem('shale_has_real_meals') === 'true';
        if (snap.size > 0 && !hasRealMeals) {
            localStorage.setItem('shale_has_real_meals', 'true');
            hasRealMeals = true;
        }
        const deletedMeals = JSON.parse(localStorage.getItem('shale_deleted_meals') || '[]');
        setActivityStats(s => ({ ...s, meals: hasRealMeals ? snap.size : 5 - deletedMeals.length }));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'meals'));
      
      const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
        let hasRealStars = localStorage.getItem('shale_has_real_stars') === 'true';
        if (snap.size > 0 && !hasRealStars) {
            localStorage.setItem('shale_has_real_stars', 'true');
            hasRealStars = true;
        }
        const deletedStars = JSON.parse(localStorage.getItem('shale_deleted_stars') || '[]');
        setActivityStats(s => ({ ...s, students: hasRealStars ? snap.size : 3 - deletedStars.length }));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'students'));
      
      const unsubFeedback = onSnapshot(collection(db, 'feedback'), (snap) => {
        setActivityStats(s => ({ ...s, feedback: snap.size }));
      }, (e) => handleFirestoreError(e, OperationType.GET, 'feedback'));
      
      const unsubNotices = onSnapshot(doc(db, 'config', 'notifications'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const listLength = data.list ? data.list.length : 0;
          setActivityStats(s => ({ ...s, announcements: data.totalCount !== undefined ? data.totalCount : listLength }));
        }
      });

      return () => {
        unsubMeals();
        unsubStudents();
        unsubFeedback();
        unsubNotices();
      };
    }
  }, [isAdmin]);

  const toggleNotification = (key: string, currentValue: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    const newValue = !currentValue;
    setter(newValue);
    localStorage.setItem(key, newValue.toString());
  };

  // Sync state with profile data when it loads/changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditName(profile?.name || '');
      setEditPhone(profile?.phoneNumber || '');
      setPhotoPreview(profile?.photoUrl || null);
      setPhotoFile(null);
    }
  }, [profile, isEditing]);

  React.useEffect(() => {
    if (!isEditingSchoolInfo) {
      setEditSchoolName(schoolInfo?.name || '');
      setEditSchoolDistrict(schoolInfo?.district || '');
      setEditSchoolVillage(schoolInfo?.village || '');
      setEditSchoolMedium(schoolInfo?.medium || '');
      setEditSchoolNameKn(schoolInfo?.name_kn || '');
      setEditSchoolDistrictKn(schoolInfo?.district_kn || '');
      setEditSchoolVillageKn(schoolInfo?.village_kn || '');
      setEditSchoolMediumKn(schoolInfo?.medium_kn || '');
    }
  }, [schoolInfo, isEditingSchoolInfo]);

  const handlePhotoClick = () => {
    if (isEditing) {
      if (photoPreview) {
        setShowPhotoOptions(true);
      } else {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    setShowPhotoOptions(false);
  };

  const handleChangePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
    setShowPhotoOptions(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image to ensure it fits in Firestore < 1MB limit
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 400px
          const MAX_SIZE = 400;
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
          
          // Use a modest quality for JPEG to keep base64 very small
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_role_intent');
    signOut(auth);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let finalPhotoUrl = profile?.photoUrl || '';

      if (photoPreview !== profile?.photoUrl) {
        finalPhotoUrl = photoPreview || '';
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
        phoneNumber: editPhone,
        photoUrl: finalPhotoUrl,
        updatedAt: new Date().toISOString()
      });

      setPhotoFile(null);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchoolInfo = async () => {
    if (!user || !isAdmin) return;
    setSaving(true);
    try {
      const newSchoolInfo = {
        name: editSchoolName,
        district: editSchoolDistrict,
        village: editSchoolVillage,
        medium: editSchoolMedium,
        name_kn: editSchoolNameKn,
        district_kn: editSchoolDistrictKn,
        village_kn: editSchoolVillageKn,
        medium_kn: editSchoolMediumKn
      };
      try {
        await updateDoc(doc(db, 'settings', 'school_info'), newSchoolInfo);
      } catch (error) {
        await setDoc(doc(db, 'settings', 'school_info'), newSchoolInfo);
      }
      setIsEditingSchoolInfo(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `settings/school_info`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Profile Header Banner */}
      <div className="bg-school-blue rounded-b-[2.5rem] relative overflow-hidden shadow-xl mb-4 w-full">
        {/* Abstract Background icons/shapes */}
        <div className="absolute inset-0 opacity-[0.04] flex justify-around items-center overflow-hidden pointer-events-none">
          <GraduationCap size={180} className="-rotate-12 -ml-8" />
          <Globe size={140} className="rotate-12 mb-32 -mr-8" />
          <BookOpen size={100} className="-rotate-45 mt-32 absolute right-0" />
        </div>

        <div className="relative z-10 px-6 pb-6 pt-16 flex flex-col items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />

          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors ring-1 ring-white/20"
              title={t('editProfile')}
            >
              <Edit2 size={16} />
            </button>
          )}

          <div 
            onClick={handlePhotoClick}
            className="w-28 h-28 mx-auto xl:w-36 xl:h-36 rounded-full bg-blue-500/20 shadow-inner flex items-center justify-center relative group mb-3 overflow-hidden border-[3px] border-white/80"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white/80" />
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white cursor-pointer transition-colors backdrop-blur-[2px]">
                <Camera size={24} />
              </div>
            )}
          </div>
          
          <div className="text-center w-full space-y-1">
            {isEditing ? (
              <input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold border-none text-center text-white bg-white/10 rounded-lg outline-none px-4 py-1.5 placeholder-white/50 w-full max-w-[250px] focus:bg-white/20 transition-colors shadow-inner"
                placeholder={t('enterName')}
              />
            ) : (
              <h2 className="text-[26px] font-bold text-white tracking-tight">{profile?.name || (isAdmin ? t('adminPortal') : t('parentModeLabel'))}</h2>
            )}

            <div className="flex justify-center items-center">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm ${isAdmin ? 'bg-green-500/90 text-white ring-1 ring-green-400' : 'bg-amber-400/90 text-amber-950 ring-1 ring-amber-300'}`}>
                {isAdmin ? t('schoolAdmin') : t('verifiedParent')}
                <Check size={12} strokeWidth={3} />
              </span>
            </div>

            <div className="pt-2 space-y-0.5">
              <h3 className="text-[15px] font-semibold text-white/95">
                {language === 'kn' ? (schoolInfo?.name_kn || schoolInfo?.name) : (!schoolInfo?.name || schoolInfo.name === 'Government Higher Primary School' ? t('defaultSchoolName') : schoolInfo.name)}
              </h3>
              <p className="text-[13px] text-white/80 flex items-center justify-center gap-1.5 font-medium">
                <MapPin size={14} className="opacity-80" />
                {language === 'kn' ? (
                  `${schoolInfo?.village_kn || schoolInfo?.village || t('defaultVillage')}, ${schoolInfo?.district_kn || schoolInfo?.district || t('defaultDistrict')}`
                ) : (
                  `${(!schoolInfo?.village || schoolInfo.village === 'Kudur') ? t('defaultVillage') : schoolInfo.village}${schoolInfo?.district ? `, ${(!schoolInfo?.district || schoolInfo.district === 'Tumakuru') ? t('defaultDistrict') : schoolInfo.district}` : ''}`
                )}
              </p>
              {isEditing ? (
                <div className="text-[13px] text-white/80 flex items-center justify-center gap-1.5 font-medium">
                  <Phone size={14} className="opacity-80" />
                  <input 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-[110px] text-center bg-white/20 border-none rounded-full px-2 py-0.5 outline-none text-white focus:bg-white/30 transition-colors shadow-inner"
                    placeholder="Phone"
                  />
                </div>
              ) : (
                <p className="text-[13px] text-white/80 flex items-center justify-center gap-1.5 font-medium">
                  <Phone size={14} className="opacity-80" />
                  {profile?.phoneNumber || t('notLinked')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="child-card flex gap-2 mx-6">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-school-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
            {t('saveChanges')}
          </button>
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditName(profile?.name || '');
              setEditPhone(profile?.phoneNumber || '');
              setPhotoPreview(profile?.photoUrl || null);
              setPhotoFile(null);
            }}
            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="space-y-4 px-6">
        {/* Activity Summary */}
        {isAdmin && (
          <div className="child-card space-y-4 bg-red-50/50 dark:bg-rose-950/20 border-red-100 dark:border-rose-900/30">
            <div className="flex items-center gap-2 text-red-600 dark:text-rose-500 mb-2">
              <BarChart3 size={20} className="shrink-0" />
              <h3 className="font-bold text-sm tracking-wide uppercase">{t('activitySummary')}</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('mealPosts'), value: activityStats.meals, color: 'text-school-blue', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/30' },
                { label: t('studentStarsStat'), value: activityStats.students, color: 'text-school-green', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-800/30' },
                { label: t('feedbackReviewed'), value: activityStats.feedback, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/30' },
                { label: t('announcementsPosted'), value: activityStats.announcements, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/30' }
              ].map((stat, i) => (
                <div key={i} className={`flex flex-col items-center justify-center p-4 rounded-3xl border ${stat.bg} ${stat.border}`}>
                  <span className={`text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 text-center leading-tight">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* School Information Card */}
        <div className="child-card space-y-4 bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30 relative">
          {isAdmin && !isEditingSchoolInfo && (
              <button 
                onClick={() => setIsEditingSchoolInfo(true)}
                className="absolute top-4 right-4 p-2 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-500 hover:bg-green-200 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            )}
            <div className="flex items-center gap-2 text-green-700 dark:text-green-500 mb-2">
              <BookOpen size={20} className="shrink-0" />
              <h3 className="font-bold text-sm tracking-wide uppercase">{t('schoolInformation')}</h3>
            </div>
            
            <div className="space-y-3">
              {[
                {
                  icon: <GraduationCap size={16} />,
                  label: t('schoolNameLabel'),
                  valueEn: (!schoolInfo?.name || schoolInfo.name === 'Government Higher Primary School') ? t('defaultSchoolName') : schoolInfo.name,
                  valueKn: schoolInfo?.name_kn || t('defaultSchoolName'),
                  editField: editSchoolName,
                  setEditField: setEditSchoolName,
                  editFieldKn: editSchoolNameKn,
                  setEditFieldKn: setEditSchoolNameKn,
                  placeholder: 'School Name (English)',
                  placeholderKn: 'ಶಾಲೆಯ ಹೆಸರು (Kannada)'
                },
                {
                  icon: <MapPin size={16} />,
                  label: t('districtLabel'),
                  valueEn: (!schoolInfo?.district || schoolInfo.district === 'Tumakuru') ? t('defaultDistrict') : schoolInfo.district,
                  valueKn: schoolInfo?.district_kn || t('defaultDistrict'),
                  editField: editSchoolDistrict,
                  setEditField: setEditSchoolDistrict,
                  editFieldKn: editSchoolDistrictKn,
                  setEditFieldKn: setEditSchoolDistrictKn,
                  placeholder: 'District (English)',
                  placeholderKn: 'ಜಿಲ್ಲೆ (Kannada)'
                },
                {
                  icon: <Globe size={16} />,
                  label: t('villageLabel'),
                  valueEn: (!schoolInfo?.village || schoolInfo.village === 'Kudur') ? t('defaultVillage') : schoolInfo.village,
                  valueKn: schoolInfo?.village_kn || t('defaultVillage'),
                  editField: editSchoolVillage,
                  setEditField: setEditSchoolVillage,
                  editFieldKn: editSchoolVillageKn,
                  setEditFieldKn: setEditSchoolVillageKn,
                  placeholder: 'Village (English)',
                  placeholderKn: 'ಗ್ರಾಮ (Kannada)'
                },
                {
                  icon: <BookOpen size={16} />,
                  label: t('mediumLabel'),
                  valueEn: (!schoolInfo?.medium || schoolInfo.medium === 'Kannada') ? t('defaultMedium') : schoolInfo.medium,
                  valueKn: schoolInfo?.medium_kn || t('defaultMedium'),
                  editField: editSchoolMedium,
                  setEditField: setEditSchoolMedium,
                  editFieldKn: editSchoolMediumKn,
                  setEditFieldKn: setEditSchoolMediumKn,
                  placeholder: 'Medium (English)',
                  placeholderKn: 'ಮಾಧ್ಯಮ (Kannada)'
                }
              ].map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-start py-2 border-b border-green-100/50 dark:border-green-900/20 last:border-0 gap-1 sm:gap-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500 sm:w-1/3 sm:mt-1">
                    <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/50">
                      {item.icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">{item.label}</span>
                  </div>
                  <div className="flex-1 pl-8 sm:pl-0 space-y-2">
                    {isEditingSchoolInfo ? (
                      <>
                        <input 
                          value={item.editField}
                          onChange={(e) => item.setEditField(e.target.value)}
                          className="w-full font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-b-2 border-green-300 dark:border-green-700 outline-none text-sm py-1 px-2 rounded-t transition-colors focus:border-green-500 dark:focus:border-green-400"
                          placeholder={item.placeholder}
                        />
                        <input 
                          value={item.editFieldKn}
                          onChange={(e) => item.setEditFieldKn(e.target.value)}
                          className="w-full font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-b-2 border-green-300 dark:border-green-700 outline-none text-sm py-1 px-2 rounded-t transition-colors focus:border-green-500 dark:focus:border-green-400"
                          placeholder={item.placeholderKn}
                        />
                      </>
                    ) : (
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {language === 'kn' ? item.valueKn || item.valueEn : item.valueEn}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {isEditingSchoolInfo && (
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveSchoolInfo}
                  disabled={saving}
                  className="flex-1 py-3 bg-school-green text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
                  {t('saveChanges')}
                </button>
                <button 
                  onClick={() => {
                    setIsEditingSchoolInfo(false);
                    setEditSchoolName(schoolInfo?.name || '');
                    setEditSchoolDistrict(schoolInfo?.district || '');
                    setEditSchoolVillage(schoolInfo?.village || '');
                    setEditSchoolMedium(schoolInfo?.medium || '');
                    setEditSchoolNameKn(schoolInfo?.name_kn || '');
                    setEditSchoolDistrictKn(schoolInfo?.district_kn || '');
                    setEditSchoolVillageKn(schoolInfo?.village_kn || '');
                    setEditSchoolMediumKn(schoolInfo?.medium_kn || '');
                  }}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
          
        {/* App Preferences */}
        <div className="child-card space-y-4 bg-[#FFFAF0] dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 mb-2">
            <Settings size={20} className="shrink-0" />
            <h3 className="font-bold text-sm tracking-wide uppercase">{t('appPreferences')}</h3>
          </div>
          
          <div className="space-y-4 pt-2">
            {/* Language Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-orange-100 dark:border-orange-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-school-blue/10 text-school-blue">
                  <Globe size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('languagePref')}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t('languageDesc')}</p>
                </div>
              </div>
              <div className="flex bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-0.5 shrink-0 self-start sm:self-auto">
                <button 
                  onClick={() => setLanguage('kn')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${language === 'kn' ? 'bg-white dark:bg-slate-700 text-school-blue shadow-sm border border-school-blue/40 ring-1 ring-school-blue/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  ಕನ್ನಡ
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${language === 'en' ? 'bg-white dark:bg-slate-700 text-school-blue shadow-sm border border-school-blue/40 ring-1 ring-school-blue/20' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-orange-100 dark:border-orange-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-school-blue">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} className="text-orange-500" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('themePref')}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t('themeDesc')}</p>
                </div>
              </div>
              <div className="flex bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm p-0.5 relative">
                <button 
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center justify-center relative z-10 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <Sun size={16} className={theme === 'light' ? 'fill-amber-500' : ''} />
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center justify-center relative z-10 ${theme === 'dark' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <Moon size={16} className={theme === 'dark' ? 'fill-slate-700 dark:fill-slate-200' : ''} />
                </button>
                {/* Active Indicator Background */}
                <div 
                  className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-amber-50 dark:bg-slate-700 rounded-full shadow border border-amber-200 dark:border-slate-600 transition-all duration-300 ease-in-out ${theme === 'light' ? 'left-0.5' : 'left-[calc(50%+1.5px)]'}`}
                />
              </div>
            </div>

            {/* Notifications */}
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="w-full flex items-center justify-between py-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-school-blue/10 text-school-blue group-hover:bg-school-blue group-hover:text-white transition-colors">
                  <Bell size={18} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-school-blue transition-colors">{t('notificationsPref')}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t('notificationsDesc')}</p>
                </div>
              </div>
              <div className="p-1 text-slate-400 group-hover:text-school-blue transition-colors">
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </div>

        {/* Links Card */}
        <div className="child-card space-y-4">
          <a 
            href="https://schooleducation.karnataka.gov.in/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:text-school-blue transition-colors">
                <Globe size={20} />
              </div>
              <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{t('schoolWebsite')}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover:text-school-blue transition-colors">
              <ExternalLink size={14} />
            </div>
          </a>

          <div className="h-px bg-slate-50 dark:bg-slate-800"></div>

          <button 
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:text-school-blue transition-colors">
                <Shield size={20} />
              </div>
              <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{t('privacyTitle')}</span>
            </div>
            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 transition-all ${showPrivacy ? 'rotate-90 text-school-blue' : 'text-slate-300 dark:text-slate-600 group-hover:text-school-blue'}`}>
              <ChevronRight size={14} />
            </div>
          </button>
          
          <AnimatePresence>
            {showPrivacy && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {t('privacyContent')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Developer Contact Card */}
        <div className="child-card bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-indigo-500" />
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">{t('developerContact')}</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-400 dark:text-indigo-500 font-bold uppercase tracking-wider">{t('nameLabel')}</span>
              <span className="text-indigo-800 dark:text-indigo-300 font-bold">Vikas M</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-400 dark:text-indigo-500 font-bold uppercase tracking-wider">{t('email')}</span>
              <a 
                href="mailto:vikasm1013@gmail.com" 
                onClick={(e) => {
                  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  if (!isMobile) {
                    e.preventDefault();
                    window.open('https://mail.google.com/mail/?view=cm&fs=1&to=vikasm1013@gmail.com', 'GmailCompose', 'width=800,height=600,scrollbars=yes,resizable=yes');
                  }
                  // On mobile, we allow the default href="mailto:..." behavior which triggers the native app
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold underline flex items-center gap-1"
              >
                vikasm1013@gmail.com
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full child-button bg-error-soft dark:bg-error-dark/20 text-red-500 shadow-sm border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all transition-colors"
      >
        <LogOut size={20} />
        {t('logout')}
      </button>

      {/* Footer */}
      <div className="text-center space-y-2 pb-8">
        <p className="text-[11px] text-slate-400 dark:text-slate-600 font-bold flex items-center justify-center gap-1 transition-colors">
          <span className="text-school-blue">Vikas M</span>
        </p>
        <p className="text-[9px] text-slate-300 dark:text-slate-700 font-medium uppercase tracking-[0.3em] transition-colors">
          {t('madeWithPride')}
        </p>
      </div>

      {/* Notifications Modal Overlay */}
      <AnimatePresence>
        {showNotificationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowNotificationsModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-school-blue">
                  <div className="p-2 bg-school-blue/10 rounded-xl">
                    <Bell size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('notificationsPref')}</h3>
                </div>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <p className="text-sm font-medium text-slate-500 mb-2">{t('notificationsDesc')}</p>
                
                <div className="space-y-4">
                  {/* Daily Meal Updates */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-slate-400" />
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('dailyMealUpdates')}</span>
                    </div>
                    <button 
                      onClick={() => toggleNotification('notif_daily_meal', notifDailyMeal, setNotifDailyMeal)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifDailyMeal ? 'bg-school-blue' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifDailyMeal ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Student Stars */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-slate-400" />
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('studentStarsNotifications')}</span>
                    </div>
                    <button 
                      onClick={() => toggleNotification('notif_student_stars', notifStudentStars, setNotifStudentStars)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifStudentStars ? 'bg-school-blue' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifStudentStars ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Announcements */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-slate-400" />
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t('schoolAnnouncements')}</span>
                    </div>
                    <button 
                      onClick={() => toggleNotification('notif_announcements', notifAnnouncements, setNotifAnnouncements)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifAnnouncements ? 'bg-school-blue' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifAnnouncements ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showPhotoOptions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
            onClick={() => setShowPhotoOptions(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('profilePhoto')}</h3>
                <button 
                  onClick={() => setShowPhotoOptions(false)}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <button
                  onClick={handleChangePhoto}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors font-semibold text-slate-700 dark:text-slate-200"
                >
                  <ImageIcon size={20} className="text-school-blue" />
                  {t('uploadNewPhoto') || 'Upload New Photo'}
                </button>
                <button
                  onClick={handleRemovePhoto}
                  className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-rose-950/20 hover:bg-red-100 dark:hover:bg-rose-900/30 rounded-2xl transition-colors font-semibold text-red-600 dark:text-rose-500"
                >
                  <Trash2 size={20} />
                  {t('removePhoto') || 'Remove Photo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
