// AURIX - Fixed Mobile Bottom Navigation Bar
import React from 'react';
import { Home, PieChart, PiggyBank, Sparkles, Plus, ShieldAlert } from 'lucide-react';

export type TabType = 'home' | 'budget' | 'savings' | 'insights' | 'admin';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  onQuickAdd,
}) => {
  const isAdminMode = typeof localStorage !== 'undefined' && localStorage.getItem('aurix_admin_authenticated') === 'true';

  const tabs = [
    { id: 'home' as TabType, label: 'HOME', icon: Home },
    { id: 'budget' as TabType, label: 'BUDGET', icon: PieChart },
    { id: 'savings' as TabType, label: 'SAVINGS', icon: PiggyBank },
    { id: 'insights' as TabType, label: 'INSIGHTS', icon: Sparkles },
    ...(isAdminMode ? [{ id: 'admin' as TabType, label: 'ADMIN', icon: ShieldAlert }] : []),
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E110C]/95 backdrop-blur-md border-t border-[#30352B]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between relative">
        {/* Left two tabs: HOME, BUDGET */}
        <div className="flex items-center space-x-6">
          {tabs.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
                  isActive ? 'text-[#E7FF32]' : 'text-[#A1A69A] hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#E7FF32] rounded-full shadow-[0_0_6px_#E7FF32]" />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wider mt-1.5">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Floating Neon Quick Add (+) Button */}
        <div className="relative -top-5">
          <button
            onClick={onQuickAdd}
            aria-label="Add Transaction"
            className="w-14 h-14 rounded-full bg-[#E7FF32] text-[#090B08] flex items-center justify-center shadow-[0_0_20px_rgba(231,255,50,0.45)] hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Right tabs: SAVINGS, INSIGHTS, ADMIN */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {tabs.slice(2, 5).map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 transition-colors ${
                  isActive ? 'text-[#E7FF32]' : 'text-[#A1A69A] hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#E7FF32] rounded-full shadow-[0_0_6px_#E7FF32]" />
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wider mt-1.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

