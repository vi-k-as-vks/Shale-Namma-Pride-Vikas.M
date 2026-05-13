import React, { useState } from 'react';
import { useAppContext, handleFirestoreError, OperationType } from '../context/AppContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Send, ShieldCheck, Bug, Info, UserX, User, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { FeedbackRecord } from '../types';

export const Feedback: React.FC = () => {
  const { t, user, profile, userRoleIntent } = useAppContext();
  const [text, setText] = useState('');
  const [type, setType] = useState<'suggestion' | 'bug'>('suggestion');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    const isActuallyAdmin = profile?.role === 'admin' && userRoleIntent === 'admin';
    setIsAdmin(isActuallyAdmin);
    
    if (isActuallyAdmin) {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFeedbackList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedbackRecord)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'feedback');
      });
      return unsubscribe;
    }
  }, [profile, userRoleIntent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        text,
        type,
        isAnonymous,
        userId: isAnonymous ? null : (user?.uid || null),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
      setText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: 'pending' | 'reviewed') => {
    try {
      await updateDoc(doc(db, 'feedback', id), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `feedback/${id}`);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck size={40} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('thankYou')}</h3>
        <p className="text-slate-500 dark:text-slate-400">{t('feedbackSentInfo')}</p>
        <button onClick={() => setSubmitted(false)} className="text-school-blue font-bold">{t('sendAnother')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('feedback')}</h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm">{t('helpImprove')}</p>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        {(['suggestion', 'bug'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setType(opt)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              type === opt ? 'bg-school-blue text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {opt === 'suggestion' ? <Info size={16} /> : <Bug size={16} />}
            {opt === 'suggestion' ? t('suggestionLabel') : t('bugReportLabel')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="child-card !p-0 overflow-hidden focus-within:ring-2 focus-within:ring-school-blue transition-all">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === 'suggestion' ? t('shareIdea') : t('describeBug')}
            className="w-full h-48 p-6 text-slate-700 dark:text-slate-200 bg-transparent resize-none outline-none text-sm leading-relaxed"
          ></textarea>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <button 
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                isAnonymous 
                ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 shadow-md ring-2 ring-slate-200 dark:ring-slate-700' 
                : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isAnonymous ? <UserX size={14} /> : <User size={14} />}
              {t('anonymous')}
            </button>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
              {text.length} / 3000
            </span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !text.trim()}
          className="w-full child-button bg-school-blue text-white shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Send size={20} />
              {t('submitFeedback')}
            </>
          )}
        </button>
      </form>

      <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex gap-4">
        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-600 flex-shrink-0">
          <MessageSquare size={24} />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
          {t('sdmcPrivacy')}
        </p>
      </div>

      {isAdmin && feedbackList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-school-blue" />
            {t('adminFeedbackView')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="child-card !p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${fb.type === 'bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {fb.type === 'bug' ? <Bug size={14} /> : <Info size={14} />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {fb.isAnonymous ? 'Anonymous' : 'Parent'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">{new Date(fb.createdAt).toLocaleDateString()}</span>
                    <button 
                      onClick={() => handleStatusUpdate(fb.id, fb.status === 'pending' ? 'reviewed' : 'pending')}
                      className={`p-1.5 rounded-lg transition-colors ${fb.status === 'reviewed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      {fb.status === 'reviewed' ? <CheckCircle size={16} /> : <Clock size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{fb.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
