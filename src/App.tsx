// AURIX PRO - Main Application Architecture & Orchestrator with Native Back Button Navigation
import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Header } from './components/layout/Header';
import { BottomNav, type TabType } from './components/layout/BottomNav';
import { HomeScreen } from './components/home/HomeScreen';
import { BudgetScreen } from './components/budget/BudgetScreen';
import { SavingsScreen } from './components/savings/SavingsScreen';
import { InsightsScreen } from './components/insights/InsightsScreen';
import { AdminTabScreen } from './components/licensing/AdminTabScreen';

import { AddTransactionModal } from './components/transaction/AddTransactionModal';
import { TransactionListModal } from './components/transaction/TransactionListModal';
import { AccountsModal } from './components/accounts/AccountsModal';
import { SalaryManagerModal } from './components/salary/SalaryManagerModal';
import { RecurringBillsModal } from './components/bills/RecurringBillsModal';
import { DebtManagerModal } from './components/debt/DebtManagerModal';
import { FinancialCalendarModal } from './components/calendar/FinancialCalendarModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { SplashScreen } from './components/common/SplashScreen';

import type { Transaction, TransactionType } from './types';

const MainAppContent: React.FC = () => {
  const { isLoading, settings, refreshData } = useFinancial();

  // Splash opening animation state
  const [showSplash, setShowSplash] = useState(false);

  // Navigation tab & history stack
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [tabHistory, setTabHistory] = useState<TabType[]>(['home']);

  // Modals state
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [addTxnInitialType, setAddTxnInitialType] = useState<TransactionType>('expense');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isSalaryOpen, setIsSalaryOpen] = useState(false);
  const [isBillsOpen, setIsBillsOpen] = useState(false);
  const [isDebtsOpen, setIsDebtsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTxnListOpen, setIsTxnListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tab change handler maintaining back navigation history stack
  const handleTabChange = (newTab: TabType) => {
    if (newTab !== currentTab) {
      setTabHistory((prev) => [...prev, newTab]);
      setCurrentTab(newTab);
    }
  };

  // Native Android Back Button Navigation Listener
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', () => {
      // 1. Close open modals first in priority order
      if (isAddTxnOpen) {
        setIsAddTxnOpen(false);
        setEditingTxn(null);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }
      if (isAccountsOpen) {
        setIsAccountsOpen(false);
        return;
      }
      if (isSalaryOpen) {
        setIsSalaryOpen(false);
        return;
      }
      if (isBillsOpen) {
        setIsBillsOpen(false);
        return;
      }
      if (isDebtsOpen) {
        setIsDebtsOpen(false);
        return;
      }
      if (isCalendarOpen) {
        setIsCalendarOpen(false);
        return;
      }
      if (isTxnListOpen) {
        setIsTxnListOpen(false);
        return;
      }

      // 2. Navigate back to previous window/tab in history
      if (tabHistory.length > 1) {
        setTabHistory((prev) => {
          const updated = [...prev];
          updated.pop();
          const prevTab = updated[updated.length - 1] || 'home';
          setCurrentTab(prevTab);
          return updated;
        });
        return;
      }

      // 3. Minimize app cleanly if on root home screen
      CapacitorApp.minimizeApp();
    });

    return () => {
      backListener.then((h) => h.remove());
    };
  }, [
    isAddTxnOpen,
    isSettingsOpen,
    isAccountsOpen,
    isSalaryOpen,
    isBillsOpen,
    isDebtsOpen,
    isCalendarOpen,
    isTxnListOpen,
    tabHistory,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090B08] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#30352B] border-t-[#E7FF32] animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#E7FF32]">
            Loading AURIX PRO...
          </span>
        </div>
      </div>
    );
  }

  // Show onboarding if not yet completed
  if (settings && !settings.onboarding_completed) {
    return <OnboardingFlow onComplete={refreshData} />;
  }

  const handleTriggerQuickAdd = (type: TransactionType) => {
    setEditingTxn(null);
    setAddTxnInitialType(type);
    setIsAddTxnOpen(true);
  };

  const handleEditTransaction = (txn: Transaction) => {
    setEditingTxn(txn);
    setIsAddTxnOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090B08] text-white flex flex-col selection:bg-[#E7FF32] selection:text-black">
      {/* Top Application Header & Desktop Responsive Nav */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAccounts={() => setIsAccountsOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onQuickAdd={() => handleTriggerQuickAdd('expense')}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        {currentTab === 'home' && (
          <HomeScreen
            onTriggerQuickAdd={handleTriggerQuickAdd}
            onEditTransaction={handleEditTransaction}
            onNavigateToTab={handleTabChange}
            onOpenAccounts={() => setIsAccountsOpen(true)}
            onOpenSalary={() => setIsSalaryOpen(true)}
            onOpenBills={() => setIsBillsOpen(true)}
            onOpenDebts={() => setIsDebtsOpen(true)}
            onOpenTransactionsList={() => setIsTxnListOpen(true)}
          />
        )}

        {currentTab === 'budget' && <BudgetScreen />}

        {currentTab === 'savings' && <SavingsScreen />}

        {currentTab === 'insights' && <InsightsScreen />}

        {currentTab === 'admin' && <AdminTabScreen />}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onQuickAdd={() => handleTriggerQuickAdd('expense')}
      />

      {/* Secondary & Modal Portals */}
      <AddTransactionModal
        isOpen={isAddTxnOpen}
        onClose={() => {
          setIsAddTxnOpen(false);
          setEditingTxn(null);
        }}
        initialType={addTxnInitialType}
        editingTransaction={editingTxn}
      />

      <AccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        onTriggerTransfer={() => handleTriggerQuickAdd('transfer')}
      />

      <SalaryManagerModal
        isOpen={isSalaryOpen}
        onClose={() => setIsSalaryOpen(false)}
      />

      <RecurringBillsModal
        isOpen={isBillsOpen}
        onClose={() => setIsBillsOpen(false)}
      />

      <DebtManagerModal
        isOpen={isDebtsOpen}
        onClose={() => setIsDebtsOpen(false)}
      />

      <FinancialCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />

      <TransactionListModal
        isOpen={isTxnListOpen}
        onClose={() => setIsTxnListOpen(false)}
        onEditTransaction={handleEditTransaction}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReplaySplash={() => setShowSplash(true)}
      />

      {/* Cinematic App Opening Animation */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <FinancialProvider>
      <MainAppContent />
    </FinancialProvider>
  );
}

