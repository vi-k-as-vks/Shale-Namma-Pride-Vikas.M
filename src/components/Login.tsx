import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { auth } from '../firebase';
import { 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { ShieldCheck, Users, School, ArrowLeft, Mail, Phone, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { setLanguage, language, t, setUserRoleIntent } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'selection' | 'login'>('selection');
  const [selectedRole, setSelectedRole] = useState<'parent' | 'admin' | null>(null);

  const [error, setError] = useState<string | null>(null);
  
  // Auth states
  const [authMethod, setAuthMethod] = useState<'main' | 'email' | 'phone'>('main');
  const [isRegister, setIsRegister] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  useEffect(() => {
    // Reset states when changing views
    setAuthMethod('main');
    setError(null);
    setPhoneNumber('');
    setOtp('');
    setShowOtpInput(false);
    setConfirmationResult(null);
    setEmail('');
    setPassword('');
  }, [view, selectedRole]);

  const clearRecaptcha = () => {
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
      (window as any).recaptchaVerifier = null;
    }
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer) {
      recaptchaContainer.innerHTML = '';
    }
  };

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const setupRecaptcha = () => {
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer && recaptchaContainer.innerHTML !== "") {
      clearRecaptcha();
    }
    
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      if (selectedRole) setUserRoleIntent(selectedRole);
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedRole) setUserRoleIntent(selectedRole);
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Anonymous login failed:", error);
      if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
        setError('Anonymous auth is not enabled in Firebase Console. Please enable "Anonymous" in Authentication > Sign-in method.');
      } else {
        setError(error.message || "Failed to login as guest");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (selectedRole) setUserRoleIntent(selectedRole);
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again or create an account.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in Firebase. Please enable it in the Firebase Console.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`; // default to +91 if not provided
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
    } catch (error: any) {
      console.error("SMS failed:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setError('Phone auth (or your region) is not enabled in Firebase. Please configure Phone sign-in in Firebase Console.');
      } else {
        setError(error.message || "Failed to send OTP. Try with country code (e.g. +1... or +91...)");
      }
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);
    try {
      if (selectedRole) setUserRoleIntent(selectedRole);
      await confirmationResult.confirm(otp);
    } catch (error: any) {
      console.error("OTP failed:", error);
      setError(error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from)_0%,_transparent_25%),_radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from)_0%,_transparent_25%)] from-blue-50/50 dark:from-blue-900/10 transition-colors">
      <AnimatePresence mode="wait">
        {view === 'selection' ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm md:max-w-md lg:max-w-lg space-y-8 text-center"
          >
            <div className="space-y-3">
              <div className="inline-flex p-4 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-blue-100 dark:shadow-none mb-4">
                <School size={48} className="text-school-blue" />
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                {t('appName').split('-')[0]} <span className="text-school-blue">{t('appName').includes('-') ? t('appName').split('-')[1].trim() : 'Portal'}</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                {t('welcomeCommunity')}
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => { setSelectedRole('parent'); setView('login'); }}
                className="w-full p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg shadow-blue-50 dark:shadow-none border-2 border-transparent hover:border-school-blue transition-all group flex items-center gap-6"
              >
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-school-blue group-hover:scale-110 transition-transform">
                  <Users size={28} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('parentsLogin')}</h3>
                  <p className="text-sm text-slate-400">{t('parentLoginDesc')}</p>
                </div>
              </button>

              <button 
                onClick={() => { setSelectedRole('admin'); setView('login'); }}
                className="w-full p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg shadow-blue-50 dark:shadow-none border-2 border-transparent hover:border-amber-400 transition-all group flex items-center gap-6"
              >
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={28} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('adminLogin')}</h3>
                  <p className="text-sm text-slate-400">{t('adminLoginDesc')}</p>
                </div>
              </button>
            </div>

            <div className="pt-8">
               <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden w-full max-w-[200px] mx-auto shadow-sm">
                  <button 
                    onClick={() => setLanguage('kn')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${language === 'kn' ? 'bg-school-blue text-white shadow-md' : 'text-slate-400'}`}
                  >ಕನ್ನಡ</button>
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${language === 'en' ? 'bg-school-blue text-white shadow-md' : 'text-slate-400'}`}
                  >English</button>
                </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm md:max-w-md lg:max-w-lg space-y-6"
          >
            <button 
              onClick={() => setView('selection')}
              className="group flex items-center gap-3 text-slate-400 hover:text-school-blue font-bold text-xs uppercase tracking-widest transition-colors mb-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                <ArrowLeft size={16} />
              </div>
              Back to selection
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-2xl shadow-blue-100 dark:shadow-none space-y-6 border border-white dark:border-slate-800 relative overflow-hidden">
              <div id="recaptcha-container" className="absolute bottom-4 left-4"></div>
              
              <div className="text-center space-y-2">
                <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-white mb-6 transform rotate-3 shadow-lg ${selectedRole === 'admin' ? 'bg-amber-400 shadow-amber-100' : 'bg-school-blue shadow-blue-100 dark:shadow-none'}`}>
                  {selectedRole === 'admin' ? <ShieldCheck size={32} /> : <Users size={32} />}
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                  {selectedRole === 'admin' ? t('adminPortal') : t('parentPortal')}
                </h2>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-500 font-bold text-xs p-3 rounded-xl border border-red-100 dark:border-red-900/50 text-center">
                  {error}
                </div>
              )}

              {authMethod === 'main' && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 pt-2">
                  <button 
                    onClick={() => setAuthMethod('email')}
                    disabled={loading}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <Mail size={18} />
                    Continue with Email
                  </button>

                  <button 
                    onClick={() => setAuthMethod('phone')}
                    disabled={loading}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <Phone size={18} />
                    Continue with Phone
                  </button>
                  
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
                  </div>

                  <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  {selectedRole === 'parent' && (
                    <button 
                      onClick={handleGuestLogin}
                      disabled={loading}
                      className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 border-slate-100 dark:border-slate-700 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 mt-4"
                    >
                      Guest Login
                    </button>
                  )}
                </motion.div>
              )}

              {authMethod === 'email' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setAuthMethod('main')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <ArrowLeft size={20} />
                    </button>
                    <h3 className="font-bold text-slate-800 dark:text-white">Email Authentication</h3>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="email"
                          required
                          placeholder="Email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-school-blue outline-none py-3 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-800 dark:text-white transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="password"
                          required
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-school-blue outline-none py-3 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-800 dark:text-white transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-school-blue text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isRegister ? 'Create Account' : 'Sign In')}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button 
                      onClick={() => setIsRegister(!isRegister)}
                      className="text-sm font-bold text-school-blue hover:text-blue-600 transition-colors"
                    >
                      {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                    </button>
                  </div>
                </motion.div>
              )}

              {authMethod === 'phone' && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => {
                      setAuthMethod('main');
                      setShowOtpInput(false);
                      setPhoneNumber('');
                      setOtp('');
                    }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      <ArrowLeft size={20} />
                    </button>
                    <h3 className="font-bold text-slate-800 dark:text-white">Phone Authentication</h3>
                  </div>

                  {!showOtpInput ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="tel"
                          required
                          placeholder="Phone number (e.g. 9876543210)"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-school-blue outline-none py-3 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-800 dark:text-white transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Please enter your phone number with country code if not from India, else we will assume +91.</p>
                      
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-school-blue text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center"
                      >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Send OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          required
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          maxLength={6}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-school-blue outline-none py-3 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-800 dark:text-white transition-all text-center tracking-widest text-lg"
                        />
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-school-green text-white py-4 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center"
                      >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Verify & Login'}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}

              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  {t('privacyDisclaimer')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


