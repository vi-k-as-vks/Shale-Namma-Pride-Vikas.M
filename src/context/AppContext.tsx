import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Language, UserProfile } from '../types';
import { translations } from '../translations';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AppContextType {
  user: User | null;
  profile: UserProfile | null;
  userRoleIntent: 'parent' | 'admin' | null;
  setUserRoleIntent: (role: 'parent' | 'admin') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  loading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  schoolInfo: { name: string; name_kn?: string; location: string; district: string; district_kn?: string; village: string; village_kn?: string; medium: string; medium_kn?: string };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolInfo, setSchoolInfo] = useState({ 
    name: 'Government Higher Primary School',
    name_kn: 'ಸರ್ಕಾರಿ ಹಿರಿಯ ಪ್ರಾಥಮಿಕ ಶಾಲೆ',
    location: 'Tumakuru, Karnataka',
    district: 'Tumakuru',
    district_kn: 'ತುಮಕೂರು',
    village: 'Kudur',
    village_kn: 'ಕುದೂರು',
    medium: 'Kannada',
    medium_kn: 'ಕನ್ನಡ'
  });
  const [userRoleIntent, setUserRoleIntentState] = useState<'parent' | 'admin' | null>(() => {
    return localStorage.getItem('user_role_intent') as 'parent' | 'admin' | null;
  });
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [loading, setLoading] = useState(true);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setUserRoleIntent = (role: 'parent' | 'admin') => {
    setUserRoleIntentState(role);
    localStorage.setItem('user_role_intent', role);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    if (language === 'kn') {
      document.documentElement.classList.add('font-kannada');
    } else {
      document.documentElement.classList.remove('font-kannada');
    }
  }, [language]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    let schoolUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      if (schoolUnsubscribe) {
        schoolUnsubscribe();
        schoolUnsubscribe = null;
      }

      if (u) {
        schoolUnsubscribe = onSnapshot(doc(db, 'settings', 'school_info'), (docSnap) => {
          if (docSnap.exists()) {
            setSchoolInfo(docSnap.data() as any);
          }
        });

        const docRef = doc(db, 'users', u.uid);
        
        profileUnsubscribe = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            if (data.language) {
              setLanguageState(data.language);
            }
            setLoading(false);
          } else {
            // New user (including anonymous)
            // Determine if they are allowed to be admin
            const isAdminEmail = ['vikasm1013@gmail.com', 'redmonster496@gmail.com'].includes(u.email || '');
            const assignedRole = isAdminEmail ? 'admin' : 'parent';

            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'User',
              phoneNumber: u.phoneNumber || '',
              role: assignedRole,
              language: language,
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(docRef, newProfile);
              setLoading(false);
            } catch (error) {
              setLoading(false);
              handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
            }
          }
        }, (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (schoolUnsubscribe) schoolUnsubscribe();
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
    if (user) {
      setDoc(doc(db, 'users', user.uid), { language: lang, updatedAt: new Date().toISOString() }, { merge: true });
    }
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  };

  return (
    <AppContext.Provider value={{ user, profile, userRoleIntent, setUserRoleIntent, language, setLanguage, t, loading, schoolInfo, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
