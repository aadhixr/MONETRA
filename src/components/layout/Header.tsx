// MONETRA V3 - Top Application Header & Responsive Desktop Navigation
import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  PieChart,
  PiggyBank,
  Sparkles,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  getPreviousMonth,
  getNextMonth,
  formatMonthShort,
  getCurrentMonthStr,
  isCurrentMonth,
} from '../../engine/dateUtils';
import type { TabType } from './BottomNav';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAccounts: () => void;
  onOpenCalendar: () => void;
  currentTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onQuickAdd?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenAccounts,
  onOpenCalendar,
  currentTab = 'home',
  onTabChange,
  onQuickAdd,
}) => {
  const { settings, currentMonth, setCurrentMonth } = useFinancial();
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedYear, setSelectedYear] = useState(() => {
    return parseInt(currentMonth.slice(0, 4));
  });

  // Sync selectedYear if currentMonth changes externally
  useEffect(() => {
    setSelectedYear(parseInt(currentMonth.slice(0, 4)));
  }, [currentMonth]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
    };
    if (showMonthDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMonthDropdown]);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = settings?.user_name || 'Alex';

  const handlePrevMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  const handleSelectMonth = (monthIndex: number) => {
    const monthPadded = String(monthIndex + 1).padStart(2, '0');
    setCurrentMonth(`${selectedYear}-${monthPadded}`);
    setShowMonthDropdown(false);
  };

  const handleResetToCurrentMonth = () => {
    const cur = getCurrentMonthStr();
    setCurrentMonth(cur);
    setSelectedYear(parseInt(cur.slice(0, 4)));
    setShowMonthDropdown(false);
  };

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const navTabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'budget' as TabType, label: 'Budget', icon: PieChart },
    { id: 'savings' as TabType, label: 'Savings', icon: PiggyBank },
    { id: 'insights' as TabType, label: 'Insights', icon: Sparkles },
  ];

  return (
    <header
      className="px-4 sm:px-6 lg:px-8 pb-2.5 bg-[#090B08]/95 backdrop-blur-md sticky top-0 z-30 border-b border-[#30352B]/50 transition-all"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Identity & User Profile */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.jpg"
              alt="AURIX"
              className="w-9 h-9 rounded-xl shadow-md border border-[#30352B]/70 object-cover shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={onOpenSettings}
              title="AURIX - Open Settings"
            />
            <div className="hidden min-[480px]:block cursor-pointer" onClick={onOpenSettings}>
              <div className="font-extrabold text-sm tracking-widest text-white flex items-center gap-1.5">
                AURIX
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#1C2019] text-[#D4AF37] border border-[#D4AF37]/40">PRO</span>
              </div>
              <div className="text-[10px] text-[#A1A69A]/70 uppercase tracking-wider font-medium">Wealth Ledger</div>
            </div>
          </div>

          <div className="h-5 w-px bg-[#30352B]/80 hidden min-[480px]:block" />

          <button
            onClick={onOpenSettings}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1C2019] border border-[#30352B] flex items-center justify-center text-[#E7FF32] font-bold text-xs hover:border-[#E7FF32] transition-colors shadow-sm cursor-pointer"
            title="Open Profile & Settings"
          >
            {userName.charAt(0).toUpperCase()}
          </button>
          <div className="hidden min-[680px]:block cursor-pointer" onClick={onOpenSettings} title="Click to open Profile">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-[#A1A69A]">{getGreeting()},</span>
              <span className="text-xs font-semibold text-white">{userName}</span>
            </div>
            <div className="text-[11px] text-[#A1A69A]/80 flex items-center space-x-1">
              <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Responsive Navigation Tabs (Visible on tablet & desktop) */}
        {onTabChange && (
          <nav className="hidden md:flex items-center space-x-1 bg-[#151812] border border-[#30352B] rounded-full p-1 shadow-inner">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#E7FF32] text-[#090B08] font-bold shadow-[0_0_12px_rgba(231,255,50,0.35)]'
                      : 'text-[#A1A69A] hover:text-white hover:bg-[#1C2019]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Actions (Month Navigator, Accounts, Calendar, Desktop Quick Add) */}
        <div className="flex items-center space-x-2 shrink-0 relative" ref={dropdownRef}>
          {/* Robust Month Navigator Capsule with Interactive Dropdown */}
          <div className="flex items-center bg-[#151812] border border-[#30352B] rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-[#A1A69A] hover:text-white hover:bg-[#1C2019] rounded-full transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Clickable Month Label to open Picker */}
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="px-1.5 sm:px-2 py-0.5 text-xs font-bold text-white hover:text-[#E7FF32] flex items-center space-x-1 transition-colors min-w-[70px] justify-center"
              title="Click to select month & year"
            >
              <span>{formatMonthShort(currentMonth)}</span>
              <ChevronDown className={`w-3 h-3 text-[#A1A69A] transition-transform ${showMonthDropdown ? 'rotate-180 text-[#E7FF32]' : ''}`} />
            </button>

            <button
              onClick={handleNextMonth}
              className="p-1 text-[#A1A69A] hover:text-white hover:bg-[#1C2019] rounded-full transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Month & Year Picker Dropdown */}
          {showMonthDropdown && (
            <div className="absolute top-12 right-0 sm:right-16 z-50 w-64 bg-[#151812] border border-[#30352B] rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Year Navigator */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30352B]">
                <button
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1 rounded-lg hover:bg-[#1C2019] text-[#A1A69A] hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-extrabold text-white">{selectedYear}</span>
                <button
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-1 rounded-lg hover:bg-[#1C2019] text-[#A1A69A] hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, idx) => {
                  const mStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                  const isSelected = mStr === currentMonth;
                  const isCurrent = isCurrentMonth(mStr);

                  return (
                    <button
                      key={name}
                      onClick={() => handleSelectMonth(idx)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#E7FF32] text-[#090B08] font-bold shadow-[0_0_10px_rgba(231,255,50,0.4)]'
                          : isCurrent
                          ? 'bg-[#1C2019] text-[#E7FF32] border border-[#E7FF32]/40'
                          : 'bg-[#1C2019]/60 text-[#A1A69A] hover:text-white hover:bg-[#1C2019]'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump to Current Month */}
              <div className="mt-2.5 pt-2 border-t border-[#30352B] flex items-center justify-between text-[11px]">
                <button
                  onClick={handleResetToCurrentMonth}
                  className="text-[#E7FF32] font-semibold hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Current Month</span>
                </button>
                <span className="text-[#A1A69A]">
                  Active: {formatMonthShort(currentMonth)}
                </span>
              </div>
            </div>
          )}

          {/* Accounts button */}
          <button
            onClick={onOpenAccounts}
            className="p-2 rounded-full bg-[#151812] border border-[#30352B] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 transition-colors shadow-sm"
            title="Manage Accounts"
          >
            <Wallet className="w-4 h-4" />
          </button>

          {/* Calendar button */}
          <button
            onClick={onOpenCalendar}
            className="p-2 rounded-full bg-[#151812] border border-[#30352B] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 transition-colors shadow-sm"
            title="Financial Calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full bg-[#151812] border border-[#30352B] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 transition-colors shadow-sm"
            title="Settings & Backup"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Desktop Direct "+ Add Transaction" Button */}
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              className="hidden md:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] shadow-[0_0_14px_rgba(231,255,50,0.35)] transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Transaction</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
