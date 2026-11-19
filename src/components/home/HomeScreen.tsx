// AURIX - Primary Screen 1: Home Dashboard (Primary Spending Only - No Savings, No Net Worth)
import React from 'react';
import { ChevronRight, Receipt, Landmark, Plus, Edit2, Wallet } from 'lucide-react';
import { BalanceCard } from './BalanceCard';
import { QuickActions } from './QuickActions';
import { MonthlyOverview } from './MonthlyOverview';
import { RecentTransactions } from './RecentTransactions';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import { isCurrentMonth, getMonthEndDate } from '../../engine/dateUtils';
import type { Transaction, TransactionType } from '../../types';

interface HomeScreenProps {
  onTriggerQuickAdd: (type: TransactionType) => void;
  onEditTransaction: (txn: Transaction) => void;
  onNavigateToTab: (tab: 'budget' | 'savings' | 'insights') => void;
  onOpenAccounts: () => void;
  onOpenSalary: () => void;
  onOpenBills: () => void;
  onOpenDebts: () => void;
  onOpenTransactionsList: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onTriggerQuickAdd,
  onEditTransaction,
  onOpenAccounts,
  onOpenSalary,
  onOpenBills,
  onOpenDebts,
  onOpenTransactionsList,
}) => {
  const { recurringBills, payRecurringBill, accounts, spendingAccounts, transactions, currentMonth } = useFinancial();

  // Upcoming bills due in next 30 days
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBills = recurringBills
    .filter((b) => b.is_active && b.next_due_date >= todayStr)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, 3);

  const primaryAcc = accounts.find((a) => a.type === 'bank' && !a.is_archived) || spendingAccounts[0];
  const upToDate = isCurrentMonth(currentMonth) ? undefined : getMonthEndDate(currentMonth);

  return (
    <div className="w-full max-w-5xl mx-auto overflow-x-hidden grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 pb-28 md:pb-12">
      {/* Primary Column: Hero Balance, Quick Actions, and Monthly Overview */}
      <div className="lg:col-span-7 space-y-4 sm:space-y-5">
        {/* 1. Main Balance Hero Card (Available Spending Only - No Savings, No Net Worth) */}
        <BalanceCard
          onOpenAccounts={onOpenAccounts}
          onEditPrimaryAccount={onOpenAccounts}
        />

        {/* 2. Quick Actions (+Expense Debit, +Income Credit, Transfer, Salary) */}
        <QuickActions
          onTriggerAction={onTriggerQuickAdd}
          onOpenSalary={onOpenSalary}
        />

        {/* 3. Monthly Financial Overview (Opening carry-forward, debits, credits, closing balance) */}
        <MonthlyOverview onNavigateToBudget={() => {}} />
      </div>

      {/* Secondary Column: Live Transactions, Upcoming Bills & Bank Accounts Manager */}
      <div className="lg:col-span-5 space-y-4 sm:space-y-5">
        {/* 4. Recent Transactions (Validated Debits & Credits) */}
        <RecentTransactions
          onEditTransaction={onEditTransaction}
          onViewAll={onOpenTransactionsList}
        />

        {/* 5. Connected Bank Accounts (Quick Edit Name & Add Bank Account Option) */}
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-[24px] shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <Landmark className="w-3.5 h-3.5 mr-1.5 text-[#E7FF32]" />
              Primary Bank Account
            </h3>
            <button
              onClick={onOpenAccounts}
              className="text-xs text-[#E7FF32] font-semibold hover:underline flex items-center space-x-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit / Add Bank</span>
            </button>
          </div>

          <div className="p-3 bg-[#151812] border border-[#30352B] rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span>{primaryAcc?.name || 'Primary Bank'}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#1C2019] border border-[#30352B] text-[#A1A69A]">
                    Primary
                  </span>
                </div>
                <div className="text-[11px] text-[#A1A69A] mt-0.5">
                  {primaryAcc?.institution_name || 'Bank Account'} • Active
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-extrabold text-[#E7FF32] num-tabular">
                {primaryAcc
                  ? formatPaise(AccountingEngine.calculateAccountBalance(primaryAcc, transactions, upToDate))
                  : formatPaise(0)}
              </div>
              <button
                onClick={onOpenAccounts}
                className="text-[10px] text-[#A1A69A] hover:text-[#E7FF32] flex items-center justify-end space-x-1 mt-0.5"
              >
                <span>Edit Name</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 6. Upcoming Bills Preview (if any) */}
        {upcomingBills.length > 0 && (
          <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-[24px] shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                <Receipt className="w-3.5 h-3.5 mr-1.5 text-[#E7FF32]" />
                Upcoming Bills ({upcomingBills.length})
              </h3>
              <button
                onClick={onOpenBills}
                className="text-xs text-[#E7FF32] font-semibold hover:underline flex items-center"
              >
                <span>Manage</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 bg-[#151812] border border-[#30352B] rounded-2xl"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{bill.title}</div>
                    <div className="text-[11px] text-[#A1A69A] mt-0.5">
                      Due: {bill.next_due_date} ({bill.frequency})
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5 shrink-0">
                    <span className="text-xs font-bold text-[#FF6868] num-tabular">
                      {formatPaise(bill.amount_paise)}
                    </span>
                    <button
                      onClick={() => {
                        if (accounts.length > 0) {
                          payRecurringBill(bill.id, accounts[0].id);
                        }
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#E7FF32] text-[#090B08] text-[11px] font-bold hover:bg-[#C9E927] transition-colors"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

