// AURIX - Home Monthly Overview Component (Interactive Ledger Breakdown Popups)
import React, { useState, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, Target, CalendarDays, PiggyBank, Landmark, Layers, CheckCircle2, ChevronRight, X, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toRupees } from '../../engine/currency';

interface MonthlyOverviewProps {
  onNavigateToBudget: () => void;
}

export const MonthlyOverview: React.FC<MonthlyOverviewProps> = ({ onNavigateToBudget }) => {
  const {
    monthlyLedger,
    monthlyBudget,
    currentMonth,
    transactions,
    categories,
    accounts,
    spendingAccounts,
    savingsAccounts,
    selectedAccountFilter,
    liquidSpendingBalancePaise,
    totalSavingsBalancePaise,
    totalNetWorthPaise,
  } = useFinancial();

  // Active Popup Modal State: 'incoming' | 'spent' | 'balance' | null
  const [activeModal, setActiveModal] = useState<'incoming' | 'spent' | 'balance' | null>(null);

  const activeAccount = useMemo(() => {
    if (selectedAccountFilter) {
      return accounts.find((a) => a.id === selectedAccountFilter) || spendingAccounts[0];
    }
    return spendingAccounts[0] || accounts[0];
  }, [accounts, selectedAccountFilter, spendingAccounts]);

  const activeAccountName = activeAccount?.name || 'Primary Bank';

  const hasBudget = (monthlyBudget && monthlyBudget.total_limit_paise > 0) || monthlyLedger.budget_total_paise > 0;

  // Format month name
  const formatMonthName = (mStr: string) => {
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Month transactions
  const monthTxns = useMemo(() => {
    return transactions.filter(
      (t) => !t.is_deleted && t.date && t.date.startsWith(currentMonth)
    );
  }, [transactions, currentMonth]);

  // Live account-specific income, spent, opening, and closing figures for the month
  const accountMonthMetrics = useMemo(() => {
    if (!activeAccount) {
      return {
        openingPaise: monthlyLedger.opening_balance_paise,
        incomePaise: monthlyLedger.total_income_paise,
        spentPaise: monthlyLedger.total_spent_paise || monthlyLedger.total_expenses_paise,
        closingPaise: monthlyLedger.closing_balance_paise,
      };
    }

    const openingPaise = activeAccount.opening_balance_paise || 0;

    const incomePaise = monthTxns
      .filter((t) => (t.type === 'income' && t.account_id === activeAccount.id) || (t.type === 'transfer' && t.to_account_id === activeAccount.id))
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

    const spentPaise = monthTxns
      .filter((t) => (t.type === 'expense' && t.account_id === activeAccount.id) || (t.type === 'transfer' && t.account_id === activeAccount.id))
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

    const closingPaise = openingPaise + incomePaise - spentPaise;

    return { openingPaise, incomePaise, spentPaise, closingPaise };
  }, [activeAccount, monthTxns, monthlyLedger]);

  const spendingAccountIds = useMemo(() => {
    return new Set(accounts.filter((a) => !a.is_archived && a.type !== 'savings').map((a) => a.id));
  }, [accounts]);

  // Incoming Transactions & Category Breakdown
  const { incomeTransactions, incomeCategoryBreakdown } = useMemo(() => {
    const txns = monthTxns.filter((t) => {
      if (t.type === 'income') return true;
      // Also include transfers from savings into spending (withdrawal into spending account)
      if (t.type === 'transfer' && !spendingAccountIds.has(t.account_id) && spendingAccountIds.has(t.to_account_id || '')) {
        return true;
      }
      return false;
    });

    const catMap: Record<string, { id: string; name: string; icon: string; color: string; amountPaise: number; count: number }> = {};

    for (const t of txns) {
      if (t.type === 'income') {
        const cat = categories.find((c) => c.id === t.category_id);
        const catId = t.category_id || 'other_inc';
        if (!catMap[catId]) {
          catMap[catId] = {
            id: catId,
            name: cat?.name || 'Income',
            icon: cat?.icon || 'TrendingUp',
            color: cat?.color || '#A8E66A',
            amountPaise: 0,
            count: 0,
          };
        }
        catMap[catId].amountPaise += t.amount_paise || 0;
        catMap[catId].count += 1;
      } else if (t.type === 'transfer') {
        const catId = 'transfer_from_savings';
        if (!catMap[catId]) {
          catMap[catId] = {
            id: catId,
            name: 'Savings Withdrawal',
            icon: 'PiggyBank',
            color: '#38BDF8',
            amountPaise: 0,
            count: 0,
          };
        }
        catMap[catId].amountPaise += t.amount_paise || 0;
        catMap[catId].count += 1;
      }
    }

    const breakdown = Object.values(catMap).sort((a, b) => b.amountPaise - a.amountPaise);
    return { incomeTransactions: txns, incomeCategoryBreakdown: breakdown };
  }, [monthTxns, categories, spendingAccountIds]);

  // Spent & Transferred Transactions & Category Breakdown
  // "AND ANY TRANSFER SHOULD BE MENTIONED AS SPENT EVEN TO SAVINGS OKAY"
  const { spentTransactions, spentCategoryBreakdown } = useMemo(() => {
    const txns = monthTxns.filter((t) => {
      if (t.type === 'expense') return true;
      // Transfers OUT of spending accounts (to savings or external)
      if (t.type === 'transfer' && spendingAccountIds.has(t.account_id) && !spendingAccountIds.has(t.to_account_id || '')) {
        return true;
      }
      return false;
    });

    const catMap: Record<string, { id: string; name: string; icon: string; color: string; amountPaise: number; count: number }> = {};

    for (const t of txns) {
      if (t.type === 'expense') {
        const cat = categories.find((c) => c.id === t.category_id);
        const catId = t.category_id || 'other_exp';
        if (!catMap[catId]) {
          catMap[catId] = {
            id: catId,
            name: cat?.name || 'Expense',
            icon: cat?.icon || 'TrendingDown',
            color: cat?.color || '#FF6868',
            amountPaise: 0,
            count: 0,
          };
        }
        catMap[catId].amountPaise += t.amount_paise || 0;
        catMap[catId].count += 1;
      } else if (t.type === 'transfer') {
        const catId = 'transfer_to_savings';
        if (!catMap[catId]) {
          catMap[catId] = {
            id: catId,
            name: 'Transfer to Savings',
            icon: 'PiggyBank',
            color: '#38BDF8',
            amountPaise: 0,
            count: 0,
          };
        }
        catMap[catId].amountPaise += t.amount_paise || 0;
        catMap[catId].count += 1;
      }
    }

    const breakdown = Object.values(catMap).sort((a, b) => b.amountPaise - a.amountPaise);
    return { spentTransactions: txns, spentCategoryBreakdown: breakdown };
  }, [monthTxns, categories, spendingAccountIds]);

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Account';
  };

  return (
    <>
      <Card className="p-5 my-4 bg-[#1C2019] border-[#30352B] rounded-[24px] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Monthly Ledger Summary
            </h3>
            <span className="text-[11px] text-[#A1A69A]">
              Click any tile below to inspect breakdown
            </span>
          </div>
          {hasBudget ? (
            <button
              onClick={onNavigateToBudget}
              className="text-xs text-[#E7FF32] hover:underline font-semibold"
            >
              Adjust Budget
            </button>
          ) : (
            <button
              onClick={onNavigateToBudget}
              className="text-xs text-[#E7FF32] hover:underline font-semibold"
            >
              + Set Budget
            </button>
          )}
        </div>

        {/* Starting Carry-Forward & Closing Balance Banner */}
        <div className="p-3 bg-[#151812] border border-[#30352B] rounded-2xl mb-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[#A1A69A] uppercase tracking-wider block">
              Opening Balance (Start of Month)
            </span>
            <span className="text-sm font-bold text-white num-tabular">
              {formatPaise(accountMonthMetrics.openingPaise)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#A1A69A] uppercase tracking-wider block truncate">
              Closing Balance ({activeAccountName})
            </span>
            <span className="text-sm font-bold text-[#E7FF32] num-tabular">
              {formatPaise(accountMonthMetrics.closingPaise)}
            </span>
          </div>
        </div>

        {/* 3 Interactive Clickable Stat Tiles: INCOMING, SPENT, BALANCE */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-4">
          {/* 1. Total Money Incoming Tile */}
          <div
            onClick={() => setActiveModal('incoming')}
            className="p-2.5 sm:p-3 bg-[#151812] border border-[#30352B] hover:border-[#A8E66A] rounded-2xl cursor-pointer transition-all active:scale-[0.98] group shadow-sm"
            title="Click to view incoming categories & transactions"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-[#A8E66A]">
                <div className="w-5 h-5 rounded-full bg-[#A8E66A]/10 text-[#A8E66A] flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
                  Incoming
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-[#A1A69A] group-hover:text-[#A8E66A] transition-colors" />
            </div>
            <div className="mt-1.5 text-sm sm:text-base lg:text-lg font-black text-[#A8E66A] num-tabular truncate">
              +{formatPaise(accountMonthMetrics.incomePaise)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#A1A69A] block mt-0.5 truncate">
              Money Credited
            </span>
          </div>

          {/* 2. Total Money Spent Tile */}
          <div
            onClick={() => setActiveModal('spent')}
            className="p-2.5 sm:p-3 bg-[#151812] border border-[#30352B] hover:border-[#FF6868] rounded-2xl cursor-pointer transition-all active:scale-[0.98] group shadow-sm"
            title="Click to view spent & transfers breakdown"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-[#FF6868]">
                <div className="w-5 h-5 rounded-full bg-[#FF6868]/10 text-[#FF6868] flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
                  Spent
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-[#A1A69A] group-hover:text-[#FF6868] transition-colors" />
            </div>
            <div className="mt-1.5 text-sm sm:text-base lg:text-lg font-black text-[#FF6868] num-tabular truncate">
              -{formatPaise(accountMonthMetrics.spentPaise)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#A1A69A] block mt-0.5 truncate">
              Debits & Transfers
            </span>
          </div>

          {/* 3. Balance Tile */}
          <div
            onClick={() => setActiveModal('balance')}
            className="p-2.5 sm:p-3 bg-[#151812] border border-[#30352B] hover:border-[#E7FF32] rounded-2xl cursor-pointer transition-all active:scale-[0.98] group shadow-sm"
            title="Click to audit balance equation & account allocation"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs text-[#E7FF32]">
                <div className="w-5 h-5 rounded-full bg-[#E7FF32]/10 text-[#E7FF32] flex items-center justify-center shrink-0">
                  <Wallet className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">
                  Balance
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-[#A1A69A] group-hover:text-[#E7FF32] transition-colors" />
            </div>
            <div className="mt-1.5 text-sm sm:text-base lg:text-lg font-black text-[#E7FF32] num-tabular truncate">
              {formatPaise(accountMonthMetrics.closingPaise)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#A1A69A] block mt-0.5 truncate">
              {activeAccountName} Only
            </span>
          </div>
        </div>
      </Card>

      {/* POPUP MODAL 1: INCOMING BREAKDOWN */}
      <Modal
        isOpen={activeModal === 'incoming'}
        onClose={() => setActiveModal(null)}
        title="Incoming Money Breakdown"
        subtitle={`All credits and deposits for ${formatMonthName(currentMonth)}`}
      >
        <div className="space-y-4 p-1">
          {/* Hero Banner */}
          <div className="p-4 rounded-2xl bg-[#1C2019] border border-[#A8E66A]/30 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-[#A1A69A] tracking-wider block">
                Total Money Incoming
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#A8E66A] num-tabular">
                +{formatPaise(monthlyLedger.total_income_paise)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#A8E66A]/15 text-[#A8E66A] flex items-center justify-center">
              <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              By Category ({incomeCategoryBreakdown.length})
            </h4>
            {incomeCategoryBreakdown.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#181C15] text-center text-xs text-[#A1A69A]">
                No incoming transactions recorded for this month.
              </div>
            ) : (
              <div className="space-y-2">
                {incomeCategoryBreakdown.map((cat) => {
                  const percent = monthlyLedger.total_income_paise > 0
                    ? ((cat.amountPaise / monthlyLedger.total_income_paise) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-xl bg-[#1C2019] border border-[#30352B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{cat.name}</span>
                          <span className="text-[10px] text-[#A1A69A]">
                            {cat.count} credit{cat.count === 1 ? '' : 's'} • {percent}% of incoming
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-[#A8E66A] num-tabular shrink-0">
                        +{formatPaise(cat.amountPaise)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Transaction List */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Transaction History ({incomeTransactions.length})
            </h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {incomeTransactions.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#181C15] border border-[#30352B]/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 mr-2">
                    <span className="font-medium text-white block truncate">
                      {t.description || 'Income Credit'}
                    </span>
                    <span className="text-[10px] text-[#A1A69A] flex items-center space-x-1.5 mt-0.5">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span>{getAccountName(t.account_id)}</span>
                    </span>
                  </div>
                  <span className="font-bold text-[#A8E66A] num-tabular shrink-0">
                    +{formatPaise(t.amount_paise)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* POPUP MODAL 2: SPENT & TRANSFERS BREAKDOWN */}
      <Modal
        isOpen={activeModal === 'spent'}
        onClose={() => setActiveModal(null)}
        title="Spent & Transfers Breakdown"
        subtitle={`All expenses and outgoing transfers for ${formatMonthName(currentMonth)}`}
      >
        <div className="space-y-4 p-1">
          {/* Hero Banner */}
          <div className="p-4 rounded-2xl bg-[#1C2019] border border-[#FF6868]/30 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-[#A1A69A] tracking-wider block">
                Total Money Debited & Transferred
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#FF6868] num-tabular">
                -{formatPaise(monthlyLedger.total_spent_paise || monthlyLedger.total_expenses_paise)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FF6868]/15 text-[#FF6868] flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              By Category & Transfers ({spentCategoryBreakdown.length})
            </h4>
            {spentCategoryBreakdown.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#181C15] text-center text-xs text-[#A1A69A]">
                No expenses or transfers recorded for this month.
              </div>
            ) : (
              <div className="space-y-2">
                {spentCategoryBreakdown.map((cat) => {
                  const totalSpent = monthlyLedger.total_spent_paise || monthlyLedger.total_expenses_paise;
                  const percent = totalSpent > 0
                    ? ((cat.amountPaise / totalSpent) * 100).toFixed(1)
                    : '0.0';
                  const isTransfer = cat.id === 'transfer_to_savings';
                  return (
                    <div
                      key={cat.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isTransfer ? 'bg-[#1C2019] border-[#38BDF8]/40' : 'bg-[#1C2019] border-[#30352B]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <CategoryIcon name={cat.icon} color={cat.color} size={16} />
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white truncate">{cat.name}</span>
                            {isTransfer && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                                Protected in Savings
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#A1A69A]">
                            {cat.count} debit{cat.count === 1 ? '' : 's'} • {percent}% of spent
                          </span>
                        </div>
                      </div>
                      <span className={`font-bold num-tabular shrink-0 ${isTransfer ? 'text-[#38BDF8]' : 'text-[#FF6868]'}`}>
                        -{formatPaise(cat.amountPaise)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Transaction List */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Transaction History ({spentTransactions.length})
            </h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {spentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#181C15] border border-[#30352B]/60 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 mr-2">
                    <span className="font-medium text-white block truncate">
                      {t.description || (t.type === 'transfer' ? 'Transfer to Savings' : 'Expense')}
                    </span>
                    <span className="text-[10px] text-[#A1A69A] flex items-center space-x-1.5 mt-0.5">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span>From: {getAccountName(t.account_id)}</span>
                      {t.to_account_id && <span>To: {getAccountName(t.to_account_id)}</span>}
                    </span>
                  </div>
                  <span className={`font-bold num-tabular shrink-0 ${t.type === 'transfer' ? 'text-[#38BDF8]' : 'text-[#FF6868]'}`}>
                    -{formatPaise(t.amount_paise)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* POPUP MODAL 3: BALANCE RECONCILIATION & AUDIT */}
      <Modal
        isOpen={activeModal === 'balance'}
        onClose={() => setActiveModal(null)}
        title="Balance Audit & Reconciliation"
        subtitle={`Live cashflow math for ${formatMonthName(currentMonth)}`}
      >
        <div className="space-y-4 p-1">
          {/* Hero Banner */}
          <div className="p-4 rounded-2xl bg-[#1C2019] border border-[#E7FF32]/30 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-[#A1A69A] tracking-wider block">
                Primary Account Spendable Balance
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#E7FF32] num-tabular">
                {formatPaise(monthlyLedger.closing_balance_paise)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center">
              <Wallet className="w-6 h-6 stroke-[2.5]" />
            </div>
          </div>

          {/* Exact Mathematical Formula Box */}
          <div className="p-4 rounded-2xl bg-[#151812] border border-[#30352B] text-xs space-y-2">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-2">
              Primary Account Cashflow Formula
            </h4>

            <div className="flex justify-between items-center text-[#A1A69A]">
              <span>Opening Balance (Primary Bank Start)</span>
              <span className="text-white font-bold num-tabular">
                {formatPaise(monthlyLedger.opening_balance_paise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#A8E66A]">
              <span>(+) Total Incoming Credited</span>
              <span className="font-bold num-tabular">
                +{formatPaise(monthlyLedger.total_income_paise)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#FF6868]">
              <span>(-) Total Spent & Transferred to Savings</span>
              <span className="font-bold num-tabular">
                -{formatPaise(monthlyLedger.total_spent_paise || monthlyLedger.total_expenses_paise)}
              </span>
            </div>

            <div className="pt-2 border-t border-[#30352B] flex justify-between items-center text-sm font-extrabold text-[#E7FF32]">
              <span>(=) Spendable Balance (Savings Excluded)</span>
              <span className="num-tabular">
                {formatPaise(monthlyLedger.closing_balance_paise)}
              </span>
            </div>
          </div>

          {/* Account Allocation Matrix */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Where Your Money Is
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Primary Bank */}
              <div className="p-3 rounded-xl bg-[#1C2019] border border-[#30352B]">
                <div className="flex items-center space-x-1.5 text-[#E7FF32] text-xs font-semibold mb-1">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Primary Bank</span>
                </div>
                <div className="text-base font-extrabold text-white num-tabular">
                  {formatPaise(liquidSpendingBalancePaise)}
                </div>
                <span className="text-[10px] text-[#A1A69A]">Available to Spend</span>
              </div>

              {/* Savings Reserve */}
              <div className="p-3 rounded-xl bg-[#1C2019] border border-[#A8E66A]/30">
                <div className="flex items-center space-x-1.5 text-[#A8E66A] text-xs font-semibold mb-1">
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Savings Reserve</span>
                </div>
                <div className="text-base font-extrabold text-[#A8E66A] num-tabular">
                  {formatPaise(totalSavingsBalancePaise)}
                </div>
                <span className="text-[10px] text-[#A8E66A]">Protected (Not Spendable)</span>
              </div>
            </div>

            {/* Total Net Worth */}
            <div className="mt-2 p-3 rounded-xl bg-[#181C15] border border-[#30352B] flex items-center justify-between text-xs">
              <span className="text-[#A1A69A]">Combined Total Net Worth:</span>
              <span className="font-extrabold text-white num-tabular text-sm">
                {formatPaise(totalNetWorthPaise)}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

