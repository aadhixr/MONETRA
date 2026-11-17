// MONETRA V3 - Institutional Financial Accounting Engine
// Pure integer paise arithmetic, zero floating-point imprecision, robust double-entry principles.

import type { Account, Transaction, CategoryBudget, MonthlyOverviewSummary } from '../types';
import { PaiseMath } from './currency';

export class AccountingEngine {
  /**
   * Computes the current or historical balance of a specific account.
   * 
   * Balance = Opening Balance 
   *         + Received Incomes
   *         - Expenses
   *         + Incoming Transfers
   *         - Outgoing Transfers
   */
  static calculateAccountBalance(
    account: Account,
    allTransactions: Transaction[],
    upToDate?: string // ISO 'YYYY-MM-DD' - if omitted, computes all-time current balance
  ): number {
    let balance = Math.round(account.opening_balance_paise || 0);

    const relevantTxns = allTransactions.filter((t) => {
      if (t.is_deleted) return false;
      if (upToDate && t.date > upToDate) return false;

      // Direct match on account
      if (t.account_id === account.id || t.to_account_id === account.id) {
        return true;
      }

      // Resilient Self-Healing Fallback:
      // If a transaction has an orphaned or legacy account_id (e.g. acc_cash_1, acc_upi_1, empty, or unknown),
      // attribute it to the primary spending account (non-savings) so funds are never missing from balance!
      if (account.type !== 'savings' && (!t.account_id || t.account_id.startsWith('acc_cash') || t.account_id.startsWith('acc_upi') || t.account_id === 'acc_1')) {
        return true;
      }

      return false;
    });

    for (const txn of relevantTxns) {
      const amount = Math.round(txn.amount_paise || 0);
      const isAttributedSource = txn.account_id === account.id ||
        (account.type !== 'savings' && (!txn.account_id || txn.account_id.startsWith('acc_cash') || txn.account_id.startsWith('acc_upi') || txn.account_id === 'acc_1'));

      if (txn.type === 'income') {
        if (isAttributedSource) {
          balance = PaiseMath.add(balance, amount);
        }
      } else if (txn.type === 'expense') {
        if (isAttributedSource) {
          balance = PaiseMath.subtract(balance, amount);
        }
      } else if (txn.type === 'transfer') {
        // Double-entry transfer check:
        // Source account is debited
        if (isAttributedSource) {
          balance = PaiseMath.subtract(balance, amount);
        }
        // Destination account is credited
        if (txn.to_account_id === account.id) {
          balance = PaiseMath.add(balance, amount);
        }
      }
    }

    return balance;
  }

  /**
   * Calculates the Liquid Spending Balance across non-savings active accounts.
   * Excludes savings accounts to keep spending balance strictly separate from savings reserves.
   */
  static calculateLiquidSpendingBalance(
    accounts: Account[],
    allTransactions: Transaction[],
    upToDate?: string
  ): number {
    const spendingAccounts = accounts.filter((a) => !a.is_archived && a.type !== 'savings');
    return spendingAccounts.reduce((total, acc) => {
      const accBal = this.calculateAccountBalance(acc, allTransactions, upToDate);
      return PaiseMath.add(total, accBal);
    }, 0);
  }

  /**
   * Calculates the Total Dedicated Savings Balance across savings accounts.
   */
  static calculateTotalSavingsBalance(
    accounts: Account[],
    allTransactions: Transaction[],
    upToDate?: string
  ): number {
    const savingsAccounts = accounts.filter((a) => !a.is_archived && a.type === 'savings');
    return savingsAccounts.reduce((total, acc) => {
      const accBal = this.calculateAccountBalance(acc, allTransactions, upToDate);
      return PaiseMath.add(total, accBal);
    }, 0);
  }

  /**
   * Calculates Combined Total Net Worth (Liquid Spending + Total Savings).
   */
  static calculateTotalNetWorth(
    accounts: Account[],
    allTransactions: Transaction[],
    upToDate?: string
  ): number {
    const liquid = this.calculateLiquidSpendingBalance(accounts, allTransactions, upToDate);
    const savings = this.calculateTotalSavingsBalance(accounts, allTransactions, upToDate);
    return PaiseMath.add(liquid, savings);
  }

  /**
   * Calculates Total Available Balance.
   * Strictly calculates liquid spending balance across active spending accounts (excluding savings),
   * representing purely "how much left to use". Savings accounts are kept separate.
   */
  static calculateTotalAvailableBalance(
    accounts: Account[],
    allTransactions: Transaction[],
    upToDate?: string,
    includeSavings = false
  ): number {
    if (includeSavings) {
      return this.calculateTotalNetWorth(accounts, allTransactions, upToDate);
    }
    return this.calculateLiquidSpendingBalance(accounts, allTransactions, upToDate);
  }

  /**
   * Calculates monthly ledger figures for a given 'YYYY-MM' period.
   * 
   * Transfers between accounts are STRICTLY NEUTRAL and excluded from monthly Income and Expenses.
   */
  static calculateMonthlyLedger(
    month: string, // 'YYYY-MM'
    accounts: Account[],
    allTransactions: Transaction[],
    totalBudgetPaise = 0
  ): MonthlyOverviewSummary {
    const monthTxns = allTransactions.filter(
      (t) => !t.is_deleted && t.date && t.date.startsWith(month)
    );

    const spendingAccountIds = new Set(
      accounts.filter((a) => !a.is_archived && a.type !== 'savings').map((a) => a.id)
    );

    let totalIncomePaise = 0;
    let totalExpensesPaise = 0;
    let totalTransfersOutPaise = 0;

    for (const t of monthTxns) {
      const amt = Math.round(t.amount_paise || 0);
      if (t.type === 'income') {
        // "DONT CONSIDER SAVINGS AS ITS AVAILABLE TO SPENT OKAY ONLY PRIMARY ACCOUNT BALANCE"
        // Income credited directly to savings accounts does NOT add to spendable balance!
        const isSavingsIncome = accounts.some((a) => a.id === t.account_id && a.type === 'savings');
        if (!isSavingsIncome) {
          totalIncomePaise = PaiseMath.add(totalIncomePaise, amt);
        }
      } else if (t.type === 'expense') {
        // Direct debits from savings do NOT debit the primary spending pool
        const isSavingsExpense = accounts.some((a) => a.id === t.account_id && a.type === 'savings');
        if (!isSavingsExpense) {
          totalExpensesPaise = PaiseMath.add(totalExpensesPaise, amt);
        }
      } else if (t.type === 'transfer') {
        // "AND ANY TRANSFER SHOULD BE MENTIONED AS SPENT EVEN TO SAVINGS OKAY"
        // If money moved OUT of spending accounts (to savings or external):
        if (spendingAccountIds.has(t.account_id) && !spendingAccountIds.has(t.to_account_id || '')) {
          totalTransfersOutPaise = PaiseMath.add(totalTransfersOutPaise, amt);
        } else if (!spendingAccountIds.has(t.account_id) && spendingAccountIds.has(t.to_account_id || '')) {
          // If money was withdrawn from savings back into spending, it adds to incoming spendable funds
          totalIncomePaise = PaiseMath.add(totalIncomePaise, amt);
        }
      }
    }

    // Total debited from spending pool (direct expenses + transfers out to savings)
    const totalSpentPaise = PaiseMath.add(totalExpensesPaise, totalTransfersOutPaise);
    const netSavingsPaise = PaiseMath.subtract(totalIncomePaise, totalExpensesPaise);

    // Calculate opening balance at the start of the month (spending accounts only - left to use):
    const monthStartIso = `${month}-01`;
    const openingBalancePaise = accounts
      .filter((a) => !a.is_archived && a.type !== 'savings')
      .reduce((sum, acc) => {
        // Prior to month start
        const balPrior = this.calculateAccountBalancePriorTo(acc, allTransactions, monthStartIso);
        return PaiseMath.add(sum, balPrior);
      }, 0);

    // Closing balance at the end of the month (spending accounts only - left to use):
    // Fundamental Double-Entry Accounting Equation:
    // Closing Balance = Opening Balance + Total Credited - Total Spent (expenses + transfers out)
    // "AND THE INCOMING BALANCE AND SPENT SHOULD BE ALL IN CORRECT OKAY IF 20000 IN 2000 OUT 18000 SHOULD BE BALANCE"
    const closingBalancePaise = PaiseMath.subtract(
      PaiseMath.add(openingBalancePaise, totalIncomePaise),
      totalSpentPaise
    );

    // Auto-calibrate effective monthly budget from credited salary:
    // "WHEN EVER THE SALRY CREDITED THAT MY BUDGET FOR THE MONTH TOO OKAY"
    let effectiveBudgetPaise = totalBudgetPaise;
    if (effectiveBudgetPaise <= 0) {
      const monthSalaryTxns = monthTxns.filter((t) => {
        if (t.type !== 'income') return false;
        // Exclude income credited directly into savings accounts from monthly spending budget!
        // "DONT CONSIDER SAVINGS AS ITS AVAILABLE TO SPENT OKAY ONLY PRIMARY ACCOUNT BALANCE"
        // "ON THE BUDGET TAB DONT CONSIDER SAVINGS IN THAT JUST ACTUAL SPEND LEFT THAT NEEDED TO BE CONSIDERD ONLY"
        const isSavingsIncome = accounts.some((a) => a.id === t.account_id && a.type === 'savings');
        if (isSavingsIncome) return false;
        const isSalaryCat = t.category_id === 'cat_inc_1';
        const desc = (t.description || '').toLowerCase();
        return isSalaryCat || desc.includes('salary') || desc.includes('payroll') || desc.includes('paycheck');
      });
      const creditedSalary = monthSalaryTxns.reduce((sum, t) => sum + (t.amount_paise || 0), 0);
      if (creditedSalary > 0) {
        effectiveBudgetPaise = creditedSalary;
      }
    }

    const budgetRemainingPaise = Math.max(0, PaiseMath.subtract(effectiveBudgetPaise, totalExpensesPaise));
    const budgetPercentUsed = effectiveBudgetPaise > 0
      ? PaiseMath.percentageExceedable(totalExpensesPaise, effectiveBudgetPaise)
      : 0;

    return {
      month,
      opening_balance_paise: openingBalancePaise,
      total_income_paise: totalIncomePaise,
      total_expenses_paise: totalExpensesPaise,
      total_transfers_out_paise: totalTransfersOutPaise,
      total_spent_paise: totalSpentPaise,
      net_savings_paise: netSavingsPaise,
      closing_balance_paise: closingBalancePaise,
      budget_total_paise: effectiveBudgetPaise,
      budget_remaining_paise: budgetRemainingPaise,
      budget_percent_used: budgetPercentUsed,
    };
  }

  /**
   * Helper to compute an account's balance strictly BEFORE a given date.
   */
  private static calculateAccountBalancePriorTo(
    account: Account,
    allTransactions: Transaction[],
    beforeDate: string // strictly < beforeDate
  ): number {
    let balance = Math.round(account.opening_balance_paise || 0);

    const priorTxns = allTransactions.filter((t) => {
      if (t.is_deleted) return false;
      if (t.date >= beforeDate) return false;
      if (t.account_id === account.id || t.to_account_id === account.id) {
        return true;
      }
      if (account.type !== 'savings' && (!t.account_id || t.account_id.startsWith('acc_cash') || t.account_id.startsWith('acc_upi') || t.account_id === 'acc_1')) {
        return true;
      }
      return false;
    });

    for (const txn of priorTxns) {
      const amt = Math.round(txn.amount_paise || 0);
      const isAttributedSource = txn.account_id === account.id || 
        (account.type !== 'savings' && (!txn.account_id || txn.account_id.startsWith('acc_cash') || txn.account_id.startsWith('acc_upi') || txn.account_id === 'acc_1'));

      if (txn.type === 'income' && isAttributedSource) {
        balance = PaiseMath.add(balance, amt);
      } else if (txn.type === 'expense' && isAttributedSource) {
        balance = PaiseMath.subtract(balance, amt);
      } else if (txn.type === 'transfer') {
        if (isAttributedSource) {
          balance = PaiseMath.subtract(balance, amt);
        }
        if (txn.to_account_id === account.id) {
          balance = PaiseMath.add(balance, amt);
        }
      }
    }

    return balance;
  }

  /**
   * Computes category-wise expense totals for a specific month.
   */
  static getCategorySpending(
    month: string,
    allTransactions: Transaction[]
  ): Record<string, number> {
    const spending: Record<string, number> = {};
    const monthTxns = allTransactions.filter(
      (t) => !t.is_deleted && t.type === 'expense' && t.date && t.date.startsWith(month)
    );

    for (const t of monthTxns) {
      const catId = t.category_id || 'uncategorized';
      const amt = Math.round(t.amount_paise || 0);
      spending[catId] = PaiseMath.add(spending[catId] || 0, amt);
    }

    return spending;
  }

  /**
   * Evaluates category budget compliance and returns alert level.
   * - < 75%: normal
   * - 75% to 89%: warning
   * - 90% to 99%: strong warning
   * - >= 100%: exceeded
   */
  static getBudgetAlertStatus(
    spentPaise: number,
    allocatedPaise: number
  ): 'normal' | 'warning' | 'strong_warning' | 'exceeded' {
    if (allocatedPaise <= 0) return 'normal';
    const ratio = spentPaise / allocatedPaise;
    if (ratio >= 1.0) return 'exceeded';
    if (ratio >= 0.9) return 'strong_warning';
    if (ratio >= 0.75) return 'warning';
    return 'normal';
  }
}
