/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { MealUpdate } from './components/MealUpdate';
import { FacilityTour } from './components/FacilityTour';
import { StudentStars } from './components/StudentStars';
import { Feedback } from './components/Feedback';
import { Profile } from './components/Profile';

const AppContent: React.FC = () => {
  const { user, loading, t } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-bold text-school-blue animate-pulse">
        {t('appName')}...
      </div>
    );
  }

  // For the preview, we'll allow "Guest" access if user is not logged in 
  // but we can also force login. Let's make it interactive.
  if (!user) {
    // If you want to force login: return <Login />;
    // But since phone OTP is hard in preview, let's allow dashboard access for now 
    // unless the user clicks a restricted button. 
    // Wait, the prompt says "Auth required for posting".
    // Let's force a "Simulated Login" screen.
    // For now, I'll show the Dashboard and use a simulated user if guest.
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'meals': return <MealUpdate />;
      case 'facilities': return <FacilityTour />;
      case 'achievements': return <StudentStars />;
      case 'feedback': return <Feedback />;
      case 'profile': return <Profile />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  // For Demo: If not user, we show login. BUT to make it better for the agent turn, 
  // I'll add a "Skip to Demo" in the Login component.
  if (!user) return <Login />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
