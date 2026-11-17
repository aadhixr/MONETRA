// MONETRA V3 - Home Main Balance Card (Interactive Account Switcher & Balance Display)
import React, { useState } from 'react';
import { Eye, EyeOff, Edit2, ChevronDown, Landmark, PiggyBank } from 'lucide-react';
import { Card } from '../common/Card';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import {
  formatMonthShort,
  formatMonthName,
  isCurrentMonth,
  isPastMonth,
  isFutureMonth,
  getMonthEndDate,
} from '../../engine/dateUtils';

interface BalanceCardProps {
  onOpenAccounts: () => void;
  onEditPrimaryAccount?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  onOpenAccounts,
  onEditPrimaryAccount,
}) => {
  const {
    totalAvailableBalancePaise,
    liquidSpendingBalancePaise,
    totalSavingsBalancePaise,
    totalNetWorthPaise,
    accounts,
    spendingAccounts,
    savingsAccounts,
    transactions,
    settings,
    updateSettings,
    currentMonth,
    monthlyLedger,
    selectedAccountFilter,
    setSelectedAccountFilter,
  } = useFinancial();

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const isHidden = settings?.hide_balance || false;

  const toggleHide = () => {
    updateSettings({ hide_balance: !isHidden });
  };

  const isCurMonth = isCurrentMonth(currentMonth);
  const upToDate = isCurMonth ? undefined : getMonthEndDate(currentMonth);

  // Active Selected Account
  const selectedAccount = selectedAccountFilter
    ? accounts.find((a) => a.id === selectedAccountFilter)
    : null;

  // Selected Account Balance calculation
  const activeBalancePaise = selectedAccount
    ? AccountingEngine.calculateAccountBalance(selectedAccount, transactions, upToDate)
    : selectedAccountFilter === null
    ? (isCurMonth ? liquidSpendingBalancePaise : monthlyLedger.closing_balance_paise)
    : totalNetWorthPaise;

  const activeAccountName = selectedAccount
    ? selectedAccount.name
    : spendingAccounts[0]?.name || 'Primary Bank';

  const activeAccountColor = selectedAccount
    ? selectedAccount.color || (selectedAccount.type === 'savings' ? '#A8E66A' : '#E7FF32')
    : '#E7FF32';

  const isSavingsSelected = selectedAccount?.type === 'savings';

  return (
    <Card className="relative overflow-visible bg-gradient-to-br from-[#1C2019] via-[#151812] to-[#1C2019] border-[#30352B] p-5 shadow-2xl rounded-[26px]">
      {/* Background neon contour glow */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#E7FF32]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: Bank Name Switcher with Down Arrow & Hide Toggle */}
      <div className="flex items-center justify-between">
        {/* Interactive Bank Name with Down Arrow */}
        <div className="relative z-30">
          <button
            type="button"
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#151812] border border-[#30352B] hover:border-[#E7FF32]/60 transition-all text-xs font-bold text-white shadow-sm"
          >
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px]"
              style={{
                backgroundColor: activeAccountColor,
                boxShadow: `0 0 8px ${activeAccountColor}`,
              }}
            />
            <span className="truncate max-w-[130px] sm:max-w-[200px]">
              {selectedAccount ? selectedAccount.name : 'Primary Bank'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#A1A69A] font-extrabold">
              {isSavingsSelected ? 'SAVINGS (PROTECTED)' : 'PRIMARY BALANCE'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#E7FF32] transition-transform duration-200 ${
                isAccountDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Account Switcher Dropdown */}
          {isAccountDropdownOpen && (
            <>
              {/* Invisible backdrop to dismiss */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsAccountDropdownOpen(false)}
              />

              <div className="absolute left-0 top-full mt-2 w-64 p-1.5 bg-[#151812] border border-[#30352B] rounded-2xl shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-[#A1A69A] uppercase tracking-wider">
                  Switch Account
                </div>

                {/* Spending Accounts */}
                {spendingAccounts.map((acc) => {
                  const bal = AccountingEngine.calculateAccountBalance(acc, transactions, upToDate);
                  const isSelected = selectedAccountFilter === acc.id || (!selectedAccountFilter && acc.id === spendingAccounts[0]?.id);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountFilter(acc.id);
                        setIsAccountDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#E7FF32] text-[#090B08]'
                          : 'text-white hover:bg-[#1C2019]'
                      }`}
                    >
                      <span className="flex items-center space-x-2 truncate mr-2">
                        <Landmark className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{acc.name}</span>
                      </span>
                      <span className="num-tabular font-bold shrink-0">
                        {formatPaise(bal)}
                      </span>
                    </button>
                  );
                })}

                {/* Savings Accounts */}
                {savingsAccounts.length > 0 && (
                  <>
                    <div className="border-t border-[#30352B]/60 my-1 pt-1 px-2.5 text-[10px] font-bold text-[#A8E66A] uppercase tracking-wider">
                      Savings Reserve
                    </div>
                    {savingsAccounts.map((acc) => {
                      const bal = AccountingEngine.calculateAccountBalance(acc, transactions, upToDate);
                      const isSelected = selectedAccountFilter === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountFilter(acc.id);
                            setIsAccountDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-[#A8E66A] text-[#090B08]'
                              : 'text-white hover:bg-[#1C2019]'
                          }`}
                        >
                          <span className="flex items-center space-x-2 truncate mr-2">
                            <PiggyBank className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{acc.name}</span>
                          </span>
                          <span className="num-tabular font-bold shrink-0">
                            {formatPaise(bal)}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Actions: Edit Bank & Visibility Toggle */}
        <div className="flex items-center space-x-1.5 z-10">
          <button
            onClick={onEditPrimaryAccount || onOpenAccounts}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#151812] border border-[#30352B] text-[11px] font-semibold text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 transition-colors"
            title="Edit or Add Bank Account Name"
          >
            <Edit2 className="w-3 h-3" />
            <span className="hidden min-[400px]:inline">Edit Bank</span>
          </button>

          <button
            onClick={toggleHide}
            className="p-1.5 rounded-full text-[#A1A69A] hover:text-[#E7FF32] transition-colors"
            title={isHidden ? 'Show Balance' : 'Hide Balance'}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Balance Figure */}
      <div className="mt-3 flex items-baseline justify-between z-10 relative">
        <div>
          <span
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight num-tabular ${
              isSavingsSelected ? 'text-[#A8E66A]' : 'text-[#E7FF32]'
            }`}
          >
            {isHidden ? '••••••••' : formatPaise(activeBalancePaise)}
          </span>

          {/* Subtitle: Strict distinction - Savings is NEVER available to spend */}
          <div className="text-xs text-[#A1A69A] mt-1.5">
            {isSavingsSelected ? (
              <span>
                Dedicated Savings Reserve • <strong className="text-[#A8E66A]">Protected Reserve (Not Spendable)</strong>
              </span>
            ) : (
              <span>
                {selectedAccount ? selectedAccount.name : 'Primary Bank'} • <strong className="text-[#E7FF32]">Available to Spend (Primary Only)</strong>
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs text-white block font-bold">
            {formatMonthName(currentMonth)}
          </span>
          <span className="text-[10px] text-[#A1A69A] block mt-0.5 uppercase tracking-wider">
            {isSavingsSelected ? 'Savings Reserve (Protected)' : 'Primary Spending Account'}
          </span>
        </div>
      </div>
    </Card>
  );
};
