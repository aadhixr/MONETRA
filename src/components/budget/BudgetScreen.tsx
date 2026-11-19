// AURIX - Primary Screen 2: Budget Planner (Based on Reference Design Phone 2)
import React, { useState } from 'react';
import { Plus, Copy, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Edit3, Trash2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { CategoryIcon } from '../common/CategoryIcon';
import { Modal } from '../common/Modal';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise, toRupees } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import { getPreviousMonth } from '../../engine/dateUtils';

export const BudgetScreen: React.FC = () => {
  const {
    monthlyBudget,
    monthlyLedger,
    categoryBudgets,
    categories,
    transactions,
    accounts,
    currentMonth,
    setMonthlyBudget,
    setCategoryBudget,
    copyPreviousMonthBudget,
  } = useFinancial();

  // Modals state
  const [showEditTotalModal, setShowEditTotalModal] = useState(false);
  const [showAddCategoryBudgetModal, setShowAddCategoryBudgetModal] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [catBudgetInput, setCatBudgetInput] = useState<string>('');

  // Spending accounts (excluding savings)
  const spendingAccountIds = new Set(
    accounts.filter((a) => !a.is_archived && a.type !== 'savings').map((a) => a.id)
  );

  // Overall budget calculation - automatically calibrated from primary salary or manual setting
  // "ON THE BUDGET TAB DONT CONSIDER SAVINGS IN THAT JUST ACTUAL SPEND LEFT THAT NEEDED TO BE CONSIDERD ONLY"
  const totalBudgetPaise = (monthlyBudget && monthlyBudget.total_limit_paise > 0)
    ? monthlyBudget.total_limit_paise
    : monthlyLedger.budget_total_paise;

  const categorySpending = AccountingEngine.getCategorySpending(currentMonth, transactions);

  // Check if salary is credited to primary spending account for this month
  const monthSalaryTxns = transactions.filter((t) => {
    if (t.is_deleted || t.type !== 'income' || !t.date?.startsWith(currentMonth)) return false;
    if (!spendingAccountIds.has(t.account_id)) return false; // Exclude savings!
    return (
      t.category_id === 'cat_inc_1' ||
      (t.description || '').toLowerCase().includes('salary') ||
      (t.description || '').toLowerCase().includes('payroll') ||
      (t.description || '').toLowerCase().includes('paycheck')
    );
  });
  const creditedSalaryPaise = monthSalaryTxns.reduce((sum, t) => sum + (t.amount_paise || 0), 0);
  const isAutoSalaryBudget = creditedSalaryPaise > 0 && totalBudgetPaise === creditedSalaryPaise;

  // Total spent across budget (including expenses and transfers to savings):
  // "AND ANY TRANSFER SHOULD BE MENTIONED AS SPENT EVEN TO SAVINGS OKAY"
  // Reconciled 100% with Home Screen Monthly Ledger (-₹19,999.00)
  const totalSpentPaise = monthlyLedger.total_spent_paise || monthlyLedger.total_expenses_paise;

  // Actual Spend Left - strictly how much money is left in the primary spending account:
  // "DONT CONSIDER SAVINGS AS ITS AVAILABLE TO SPENT OKAY ONLY PRIMARY ACCOUNT BALANCE"
  // "JUST ACTUAL SPEND LEFT THAT NEEDED TO BE CONSIDERD ONLY"
  // Reconciled 100% with Home Screen Primary Bank Balance (₹1.00)
  const actualSpendLeftPaise = monthlyLedger.closing_balance_paise;

  // Helper to accurately format consumed percentage without premature rounding to 100% when balance remains:
  // "NOT 100% CONSUMED 1 RUPEE THERE RIGHT" -> 19,999 / 20,000 = 99.99%, NOT 100%!
  const getConsumptionPercentStr = (spentPaise: number, budgetPaise: number, leftPaise: number): string => {
    if (budgetPaise <= 0) return '0%';
    if (leftPaise <= 0 || spentPaise >= budgetPaise) {
      const over = Math.round((spentPaise / budgetPaise) * 100);
      return `${over}%`;
    }
    const raw = (spentPaise / budgetPaise) * 100;
    if (raw >= 99) {
      const formatted = raw.toFixed(2);
      return formatted === '100.00' ? '99.99%' : `${formatted}%`;
    }
    if (raw % 1 === 0) {
      return `${raw}%`;
    }
    return `${raw.toFixed(1)}%`;
  };

  const isExceeded = totalBudgetPaise > 0 && totalSpentPaise >= totalBudgetPaise && actualSpendLeftPaise <= 0;
  const rawPercent = totalBudgetPaise > 0 ? (totalSpentPaise / totalBudgetPaise) * 100 : 0;
  const overallPercentStr = getConsumptionPercentStr(totalSpentPaise, totalBudgetPaise, actualSpendLeftPaise);

  // Expense categories (excluding any savings)
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Format month name
  const formatMonthName = (mStr: string) => {
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const handleSaveTotalBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = toPaise(totalBudgetInput);
    if (paise > 0) {
      await setMonthlyBudget(paise);
      setShowEditTotalModal(false);
    }
  };

  const handleSaveCategoryBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = toPaise(catBudgetInput);
    if (selectedCatId && paise > 0) {
      await setCategoryBudget(selectedCatId, paise);
      setShowAddCategoryBudgetModal(false);
      setCatBudgetInput('');
    }
  };

  const handleCopyLastMonth = async () => {
    const lastMonthStr = getPreviousMonth(currentMonth);
    await copyPreviousMonthBudget(lastMonthStr);
  };

  return (
    <div className="space-y-5 pb-24 md:pb-12">
      {/* 1. Header Card with Neon Budget Metric */}
      <Card className="p-5 bg-gradient-to-br from-[#1C2019] via-[#151812] to-[#1C2019] border-[#30352B] rounded-[26px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-[#E7FF32] shadow-[0_0_8px_#E7FF32]" />
            <span className="text-xs uppercase font-semibold text-[#A1A69A] tracking-wider">
              Monthly Budget ({formatMonthName(currentMonth)})
            </span>
            {isAutoSalaryBudget && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FF32]/15 text-[#E7FF32] border border-[#E7FF32]/30 flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Auto-Set from Salary</span>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setTotalBudgetInput(toRupees(totalBudgetPaise).toString());
              setShowEditTotalModal(true);
            }}
            className="text-xs font-semibold text-[#E7FF32] hover:underline flex items-center space-x-1"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            <span>{totalBudgetPaise > 0 ? 'Edit' : '+ Set'}</span>
          </button>
        </div>

        {/* Hero Budget Stats */}
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#E7FF32] num-tabular">
              {formatPaise(totalBudgetPaise)}
            </div>
            <div className="text-xs text-[#A1A69A] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Actual Spent: <strong className="text-white font-semibold num-tabular">{formatPaise(totalSpentPaise)}</strong>
              </span>
              <span>•</span>
              <span>
                Actual Spend Left: <strong className="text-[#A8E66A] font-bold num-tabular">{formatPaise(actualSpendLeftPaise)}</strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#151812] border border-[#30352B] text-[#A1A69A]">
                Savings Excluded
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white num-tabular">{overallPercentStr}</span>
            <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">Consumed</span>
          </div>
        </div>

        {/* Overall Sleek Thin Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            value={totalSpentPaise}
            max={totalBudgetPaise}
            height="h-2.5"
            variant="auto"
          />
        </div>

        {/* Quick Toolbar */}
        <div className="mt-4 pt-3 border-t border-[#30352B]/60 flex items-center justify-between text-xs">
          <button
            onClick={handleCopyLastMonth}
            className="flex items-center space-x-1.5 text-[#A1A69A] hover:text-[#E7FF32] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Previous Month</span>
          </button>

          <button
            onClick={() => {
              if (expenseCategories.length > 0) setSelectedCatId(expenseCategories[0].id);
              setShowAddCategoryBudgetModal(true);
            }}
            className="flex items-center space-x-1 text-[#E7FF32] font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category Limit</span>
          </button>
        </div>
      </Card>

      {/* 2. Budget Alert Banner if approaching or exceeding */}
      {isExceeded ? (
        <div className="p-3.5 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-2xl flex items-center space-x-3 text-xs text-[#FF6868]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Budget Exceeded!</span> You have spent {overallPercentStr} of your monthly spending allocation.
          </div>
        </div>
      ) : rawPercent >= 90 ? (
        <div className="p-3.5 bg-[#FFD166]/15 border border-[#FFD166]/40 rounded-2xl flex items-center space-x-3 text-xs text-[#FFD166]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Critical Alert ({overallPercentStr} Used):</span> Only {formatPaise(actualSpendLeftPaise)} actual spend left.
          </div>
        </div>
      ) : rawPercent >= 75 ? (
        <div className="p-3.5 bg-[#C9E927]/15 border border-[#C9E927]/40 rounded-2xl flex items-center space-x-3 text-xs text-[#C9E927]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Budget Warning ({overallPercentStr} Used):</span> Approaching allocation ceiling.
          </div>
        </div>
      ) : null}

      {/* 3. Category Budgets Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Category Allocations
          </h3>
          <span className="text-xs text-[#A1A69A]">
            {categoryBudgets.length} allocated
          </span>
        </div>

        {categoryBudgets.length === 0 ? (
          <Card className="p-6 text-center bg-[#1C2019] border-[#30352B]">
            <div className="text-sm font-medium text-white mb-1">No category budgets yet</div>
            <p className="text-xs text-[#A1A69A] mb-3">
              Set dedicated limits for Food, Transport, Shopping, and Entertainment to stay on top of daily finances.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (expenseCategories.length > 0) setSelectedCatId(expenseCategories[0].id);
                setShowAddCategoryBudgetModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Category Budget
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categoryBudgets.map((cb) => {
              const cat = categories.find((c) => c.id === cb.category_id);
              const spentPaise = categorySpending[cb.category_id] || 0;
              const remainingPaise = Math.max(0, cb.allocated_paise - spentPaise);
              const percentStr = getConsumptionPercentStr(spentPaise, cb.allocated_paise, remainingPaise);
              const alertStatus = AccountingEngine.getBudgetAlertStatus(spentPaise, cb.allocated_paise);

              return (
                <div
                  key={cb.id}
                  className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <CategoryIcon
                        name={cat?.icon || 'CircleDollarSign'}
                        color={cat?.color}
                        size={18}
                        className="w-9 h-9"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{cat?.name || 'Category'}</div>
                        <div className="text-[11px] text-[#A1A69A] mt-0.5">
                          {formatPaise(spentPaise)} spent of {formatPaise(cb.allocated_paise)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-extrabold num-tabular ${
                          alertStatus === 'exceeded'
                            ? 'text-[#FF6868]'
                            : alertStatus === 'strong_warning'
                            ? 'text-[#FFD166]'
                            : alertStatus === 'warning'
                            ? 'text-[#C9E927]'
                            : 'text-[#E7FF32]'
                        }`}
                      >
                        {percentStr}
                      </span>
                      <span className="block text-[10px] text-[#A1A69A] capitalize">
                        {alertStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <ProgressBar
                    value={spentPaise}
                    max={cb.allocated_paise}
                    height="h-2"
                    variant="auto"
                  />

                  <div className="flex justify-between items-center text-[11px] text-[#A1A69A] mt-2 pt-1 border-t border-[#30352B]/40">
                    <span>
                      Remaining: <strong className="text-white num-tabular">{formatPaise(remainingPaise)}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCatId(cb.category_id);
                        setCatBudgetInput(toRupees(cb.allocated_paise).toString());
                        setShowAddCategoryBudgetModal(true);
                      }}
                      className="text-[#E7FF32] hover:underline"
                    >
                      Edit Limit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Total Budget Modal */}
      <Modal
        isOpen={showEditTotalModal}
        onClose={() => setShowEditTotalModal(false)}
        title="Set Total Monthly Budget"
        subtitle={`Period: ${formatMonthName(currentMonth)}`}
      >
        <form onSubmit={handleSaveTotalBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Monthly Budget Cap (₹)
            </label>
            <input
              type="number"
              step="any"
              required
              value={totalBudgetInput}
              onChange={(e) => setTotalBudgetInput(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg">
            Save Monthly Budget
          </Button>
        </form>
      </Modal>

      {/* Add / Edit Category Budget Modal */}
      <Modal
        isOpen={showAddCategoryBudgetModal}
        onClose={() => setShowAddCategoryBudgetModal(false)}
        title="Set Category Budget Limit"
      >
        <form onSubmit={handleSaveCategoryBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Category *</label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Allocated Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={catBudgetInput}
              onChange={(e) => setCatBudgetInput(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg">
            Save Category Limit
          </Button>
        </form>
      </Modal>
    </div>
  );
};

