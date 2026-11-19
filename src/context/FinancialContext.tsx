// AURIX - Centralized Reactive Financial Context
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type {
  Account,
  Transaction,
  Category,
  MonthlyBudget,
  CategoryBudget,
  SavingsGoal,
  RecurringBill,
  Debt,
  SalaryRecord,
  AppSettings,
  MonthlyOverviewSummary,
} from '../types';
import { db, migrateLegacyMonetraData } from '../db/database';
import { initializeDatabaseIfEmpty, consolidateUserAccounts } from '../db/seed';
import { AccountRepository } from '../db/repositories/accountRepository';
import { TransactionRepository } from '../db/repositories/transactionRepository';
import { BudgetRepository } from '../db/repositories/budgetRepository';
import { SavingsRepository } from '../db/repositories/savingsRepository';
import { RecurringRepository } from '../db/repositories/recurringRepository';
import { DebtRepository } from '../db/repositories/debtRepository';
import { SalaryRepository } from '../db/repositories/salaryRepository';
import { SettingsRepository } from '../db/repositories/settingsRepository';
import { SyncService } from '../services/syncService';
import { AccountingEngine } from '../engine/accountingEngine';
import { applyThemeToDocument } from '../engine/themes';

interface FinancialContextType {
  // State
  isLoading: boolean;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  monthlyBudget: MonthlyBudget | undefined;
  categoryBudgets: CategoryBudget[];
  savingsGoals: SavingsGoal[];
  recurringBills: RecurringBill[];
  debts: Debt[];
  salaryRecords: SalaryRecord[];
  settings: AppSettings | null;

  // Navigation & Time scope
  currentMonth: string; // 'YYYY-MM'
  setCurrentMonth: (m: string) => void;
  selectedAccountFilter: string | null;
  setSelectedAccountFilter: (id: string | null) => void;

  // Computed Financial Metrics (Real-time, Integer Paise)
  totalAvailableBalancePaise: number; // Combined total balance (spending + savings, keeping all funds in balance)
  liquidSpendingBalancePaise: number; // Liquid spending balance (spending accounts only)
  totalSavingsBalancePaise: number; // Dedicated savings reserve balance
  totalNetWorthPaise: number; // Combined total net worth (spending + savings)
  spendingAccounts: Account[];
  savingsAccounts: Account[];
  monthlyLedger: MonthlyOverviewSummary;
  categorySpending: Record<string, number>;

  // Operations
  refreshData: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<Transaction | undefined>;

  addAccount: (data: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<Account>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;

  setMonthlyBudget: (totalLimitPaise: number, rollover?: boolean) => Promise<void>;
  setCategoryBudget: (categoryId: string, allocatedPaise: number) => Promise<void>;
  copyPreviousMonthBudget: (sourceMonth: string) => Promise<void>;

  addSavingsGoal: (data: Parameters<typeof SavingsRepository.create>[0]) => Promise<SavingsGoal>;
  contributeToSavings: (goalId: string, amountPaise: number, fromAccountId: string, notes?: string, toAccountId?: string) => Promise<void>;
  withdrawFromSavings: (goalId: string, amountPaise: number, toAccountId: string, notes?: string, fromAccountId?: string) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;

  addRecurringBill: (data: Parameters<typeof RecurringRepository.create>[0]) => Promise<RecurringBill>;
  payRecurringBill: (billId: string, accountId: string) => Promise<void>;
  deleteRecurringBill: (billId: string) => Promise<void>;

  addDebt: (data: Parameters<typeof DebtRepository.create>[0]) => Promise<Debt>;
  recordDebtPayment: (debtId: string, amountPaise: number, accountId: string, notes?: string) => Promise<void>;
  deleteDebt: (debtId: string) => Promise<void>;

  addSalaryRecord: (data: Parameters<typeof SalaryRepository.create>[0]) => Promise<SalaryRecord>;
  markSalaryReceived: (salaryId: string, accountId?: string, creditDate?: string) => Promise<void>;
  deleteSalaryRecord: (salaryId: string) => Promise<void>;

  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | null>(null);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudget, setMonthlyBudgetState] = useState<MonthlyBudget | undefined>(undefined);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Month navigation: default to current system year-month (e.g. '2026-11')
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      await migrateLegacyMonetraData();
      await initializeDatabaseIfEmpty();
      await consolidateUserAccounts();
      // Automatically establish monthly budget from credited salary:
      // "WHEN EVER THE SALRY CREDITED THAT MY BUDGET FOR THE MONTH TOO OKAY"
      await BudgetRepository.syncSalaryBudget(currentMonth);

      const [
        accs,
        txns,
        cats,
        mBudget,
        cBudgets,
        goals,
        bills,
        debtsList,
        salaries,
        appSet,
      ] = await Promise.all([
        AccountRepository.getAll(),
        TransactionRepository.getAll(),
        db.categories.toArray(),
        BudgetRepository.getMonthlyBudget(currentMonth),
        BudgetRepository.getCategoryBudgets(currentMonth),
        SavingsRepository.getAll(),
        RecurringRepository.getAll(),
        DebtRepository.getAll(),
        SalaryRepository.getAll(),
        SettingsRepository.get(),
      ]);

      setAccounts(accs);
      setTransactions(txns);
      setCategories(cats);
      setMonthlyBudgetState(mBudget);
      setCategoryBudgets(cBudgets);
      setSavingsGoals(goals);
      setRecurringBills(bills);
      setDebts(debtsList);
      setSalaryRecords(salaries);
      setSettings(appSet);

      // Trigger automatic live background sync if Supabase cloud backup is enabled
      // Never duplicates rows because user_id is the primary key in Supabase!
      SyncService.autoSyncInBackground();
    } catch (err) {
      console.error('Error loading Monetra database:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize dynamic application theme
  useEffect(() => {
    applyThemeToDocument(settings?.theme || 'neon_lime');
  }, [settings?.theme]);

  // Derived Accounting Engine Figures
  // Total Available Balance: Strictly how much left to use (savings is separate!)
  const totalAvailableBalancePaise = useMemo(() => {
    return AccountingEngine.calculateTotalAvailableBalance(accounts, transactions, undefined, false);
  }, [accounts, transactions]);

  // Liquid Spending Balance: spending accounts only
  const liquidSpendingBalancePaise = useMemo(() => {
    return AccountingEngine.calculateLiquidSpendingBalance(accounts, transactions);
  }, [accounts, transactions]);

  // Dedicated Savings Balance: savings reserve accounts
  const totalSavingsBalancePaise = useMemo(() => {
    return AccountingEngine.calculateTotalSavingsBalance(accounts, transactions);
  }, [accounts, transactions]);

  // Combined Total Net Worth (Liquid + Savings)
  const totalNetWorthPaise = useMemo(() => {
    return AccountingEngine.calculateTotalNetWorth(accounts, transactions);
  }, [accounts, transactions]);

  const spendingAccounts = useMemo(() => {
    return accounts.filter((a) => !a.is_archived && a.type !== 'savings');
  }, [accounts]);

  const savingsAccounts = useMemo(() => {
    return accounts.filter((a) => !a.is_archived && a.type === 'savings');
  }, [accounts]);

  const monthlyLedger = useMemo(() => {
    return AccountingEngine.calculateMonthlyLedger(
      currentMonth,
      accounts,
      transactions,
      monthlyBudget?.total_limit_paise || 0
    );
  }, [currentMonth, accounts, transactions, monthlyBudget]);

  const categorySpending = useMemo(() => {
    return AccountingEngine.getCategorySpending(currentMonth, transactions);
  }, [currentMonth, transactions]);

  // Actions
  const addTransaction = async (data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
    const txn = await TransactionRepository.create(data);
    await loadData();
    return txn;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    await TransactionRepository.update(id, updates);
    await loadData();
  };

  const deleteTransaction = async (id: string) => {
    await TransactionRepository.delete(id);
    await loadData();
  };

  const duplicateTransaction = async (id: string) => {
    const cloned = await TransactionRepository.duplicate(id);
    await loadData();
    return cloned;
  };

  const addAccount = async (data: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    const acc = await AccountRepository.create(data);
    await loadData();
    return acc;
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    await AccountRepository.update(id, updates);
    await loadData();
  };

  const archiveAccount = async (id: string) => {
    await AccountRepository.archive(id);
    await loadData();
  };

  const setMonthlyBudget = async (totalLimitPaise: number, rollover = false) => {
    const b = await BudgetRepository.setMonthlyBudget(currentMonth, totalLimitPaise, rollover);
    setMonthlyBudgetState(b);
    await loadData();
  };

  const setCategoryBudget = async (categoryId: string, allocatedPaise: number) => {
    await BudgetRepository.setCategoryBudget(currentMonth, categoryId, allocatedPaise);
    await loadData();
  };

  const copyPreviousMonthBudget = async (sourceMonth: string) => {
    await BudgetRepository.copyPreviousMonth(currentMonth, sourceMonth);
    await loadData();
  };

  const addSavingsGoal = async (data: Parameters<typeof SavingsRepository.create>[0]) => {
    const goal = await SavingsRepository.create(data);
    await loadData();
    return goal;
  };

  const contributeToSavings = async (goalId: string, amountPaise: number, fromAccountId: string, notes?: string, toAccountId?: string) => {
    await SavingsRepository.contribute(goalId, amountPaise, fromAccountId, notes, toAccountId);
    await loadData();
  };

  const withdrawFromSavings = async (goalId: string, amountPaise: number, toAccountId: string, notes?: string, fromAccountId?: string) => {
    await SavingsRepository.withdraw(goalId, amountPaise, toAccountId, notes, fromAccountId);
    await loadData();
  };

  const deleteSavingsGoal = async (goalId: string) => {
    await SavingsRepository.delete(goalId);
    await loadData();
  };

  const addRecurringBill = async (data: Parameters<typeof RecurringRepository.create>[0]) => {
    const bill = await RecurringRepository.create(data);
    await loadData();
    return bill;
  };

  const payRecurringBill = async (billId: string, accountId: string) => {
    await RecurringRepository.markAsPaid(billId, accountId);
    await loadData();
  };

  const deleteRecurringBill = async (billId: string) => {
    await RecurringRepository.delete(billId);
    await loadData();
  };

  const addDebt = async (data: Parameters<typeof DebtRepository.create>[0]) => {
    const d = await DebtRepository.create(data);
    await loadData();
    return d;
  };

  const recordDebtPayment = async (debtId: string, amountPaise: number, accountId: string, notes?: string) => {
    await DebtRepository.recordPayment(debtId, amountPaise, accountId, notes);
    await loadData();
  };

  const deleteDebt = async (debtId: string) => {
    await DebtRepository.delete(debtId);
    await loadData();
  };

  const addSalaryRecord = async (data: Parameters<typeof SalaryRepository.create>[0]) => {
    const rec = await SalaryRepository.create(data);
    await loadData();
    return rec;
  };

  const markSalaryReceived = async (salaryId: string, accountId?: string, creditDate?: string) => {
    await SalaryRepository.markAsReceived(salaryId, accountId, creditDate);
    await loadData();
  };

  const deleteSalaryRecord = async (salaryId: string) => {
    await SalaryRepository.delete(salaryId);
    await loadData();
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (updates.theme) {
      applyThemeToDocument(updates.theme);
    }
    const s = await SettingsRepository.update(updates);
    setSettings(s);
  };

  return (
    <FinancialContext.Provider
      value={{
        isLoading,
        accounts,
        transactions,
        categories,
        monthlyBudget,
        categoryBudgets,
        savingsGoals,
        recurringBills,
        debts,
        salaryRecords,
        settings,
        currentMonth,
        setCurrentMonth,
        selectedAccountFilter,
        setSelectedAccountFilter,
        totalAvailableBalancePaise,
        liquidSpendingBalancePaise,
        totalSavingsBalancePaise,
        totalNetWorthPaise,
        spendingAccounts,
        savingsAccounts,
        monthlyLedger,
        categorySpending,
        refreshData: loadData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,
        addAccount,
        updateAccount,
        archiveAccount,
        setMonthlyBudget,
        setCategoryBudget,
        copyPreviousMonthBudget,
        addSavingsGoal,
        contributeToSavings,
        withdrawFromSavings,
        deleteSavingsGoal,
        addRecurringBill,
        payRecurringBill,
        deleteRecurringBill,
        addDebt,
        recordDebtPayment,
        deleteDebt,
        addSalaryRecord,
        markSalaryReceived,
        deleteSalaryRecord,
        updateSettings,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = (): FinancialContextType => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used within a FinancialProvider');
  return ctx;
};

