// MONETRA V3 - Clean Initial Database Seed
import { db } from './database';
import type { Category, Account, AppSettings, Transaction } from '../types';
import { AccountingEngine } from '../engine/accountingEngine';
import { AccountRepository } from './repositories/accountRepository';

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Food', icon: 'Utensils', color: '#E7FF32' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#A8E66A' },
  { name: 'Transport', icon: 'Car', color: '#60A5FA' },
  { name: 'Fuel', icon: 'Fuel', color: '#F59E0B' },
  { name: 'Rent', icon: 'Home', color: '#EC4899' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#F472B6' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#EF4444' },
  { name: 'Entertainment', icon: 'Film', color: '#8B5CF6' },
  { name: 'Education', icon: 'GraduationCap', color: '#3B82F6' },
  { name: 'Mobile Recharge', icon: 'Smartphone', color: '#10B981' },
  { name: 'Internet', icon: 'Wifi', color: '#06B6D4' },
  { name: 'Subscriptions', icon: 'Tv', color: '#A78BFA' },
  { name: 'Electricity', icon: 'Zap', color: '#FBBF24' },
  { name: 'Water', icon: 'Droplets', color: '#38BDF8' },
  { name: 'Travel', icon: 'Plane', color: '#14B8A6' },
  { name: 'Personal Care', icon: 'Sparkles', color: '#F43F5E' },
  { name: 'Family', icon: 'Users', color: '#FB923C' },
  { name: 'Friend', icon: 'UserCheck', color: '#38BDF8' },
  { name: 'Lending Money', icon: 'HandCoins', color: '#F59E0B' },
  { name: 'EMI', icon: 'CreditCard', color: '#E11D48' },
  { name: 'Others', icon: 'MoreHorizontal', color: '#94A3B8' },
];

export const DEFAULT_INCOME_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Salary', icon: 'Briefcase', color: '#E7FF32' },
  { name: 'Bonus', icon: 'Gift', color: '#A8E66A' },
  { name: 'Freelance', icon: 'Laptop', color: '#38BDF8' },
  { name: 'Business', icon: 'TrendingUp', color: '#FB923C' },
  { name: 'Interest', icon: 'Percent', color: '#818CF8' },
  { name: 'Refund', icon: 'RotateCcw', color: '#34D399' },
  { name: 'Gift', icon: 'Heart', color: '#F472B6' },
  { name: 'Other Income', icon: 'PlusCircle', color: '#A1A69A' },
];

export async function syncDefaultCategories(): Promise<void> {
  const existingCategories = await db.categories.toArray();
  const existingExpenseNames = new Set(
    existingCategories.filter((c) => c.type === 'expense').map((c) => c.name.toLowerCase().trim())
  );
  const existingIncomeNames = new Set(
    existingCategories.filter((c) => c.type === 'income').map((c) => c.name.toLowerCase().trim())
  );
  const now = new Date().toISOString();

  const toAdd: Category[] = [];

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    if (!existingExpenseNames.has(cat.name.toLowerCase().trim())) {
      toAdd.push({
        id: `cat_exp_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: cat.name,
        type: 'expense',
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        created_at: now,
      });
    }
  }

  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    if (!existingIncomeNames.has(cat.name.toLowerCase().trim())) {
      toAdd.push({
        id: `cat_inc_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: cat.name,
        type: 'income',
        icon: cat.icon,
        color: cat.color,
        is_default: true,
        created_at: now,
      });
    }
  }

  if (toAdd.length > 0) {
    await db.categories.bulkPut(toAdd);
  }
}

export async function initializeDatabaseIfEmpty(): Promise<void> {
  const settingsCount = await db.app_settings.count();
  if (settingsCount > 0) {
    // Synchronize newly added categories even for existing databases
    await syncDefaultCategories();
    return; // Already initialized
  }

  const now = new Date().toISOString();

  // 1. Initialize Default App Settings
  const initialSettings: AppSettings = {
    id: 'current_settings',
    user_name: 'Financier',
    currency_code: 'INR',
    currency_symbol: '₹',
    locale: 'en-IN',
    date_format: 'DD MMM YYYY',
    theme: 'slate_minimal',
    hide_balance: false,
    cloud_backup_enabled: false,
    onboarding_completed: false,
    enable_ai_local: true,
    enable_sound: true,
    created_at: now,
    updated_at: now,
  };
  await db.app_settings.put(initialSettings);

  // 2. Initialize Default Categories
  const categoriesToInsert: Category[] = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((cat, i) => ({
      id: `cat_exp_${i + 1}`,
      name: cat.name,
      type: 'expense' as const,
      icon: cat.icon,
      color: cat.color,
      is_default: true,
      created_at: now,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((cat, i) => ({
      id: `cat_inc_${i + 1}`,
      name: cat.name,
      type: 'income' as const,
      icon: cat.icon,
      color: cat.color,
      is_default: true,
      created_at: now,
    })),
  ];
  await db.categories.bulkPut(categoriesToInsert);

  // 3. Initialize Default Starter Accounts: Strictly TWO accounts (Primary Bank & Savings Reserve)
  const defaultAccounts: Account[] = [
    {
      id: 'acc_bank_1',
      name: 'Primary Bank',
      type: 'bank',
      opening_balance_paise: 0,
      current_balance_paise: 0,
      currency: 'INR',
      color: '#E7FF32',
      institution_name: 'Primary Bank',
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'acc_savings_1',
      name: 'Savings Reserve',
      type: 'savings',
      opening_balance_paise: 0,
      current_balance_paise: 0,
      currency: 'INR',
      color: '#A8E66A',
      institution_name: 'Savings Reserve',
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
  ];
  await db.accounts.bulkPut(defaultAccounts);
}

/**
 * Ensures existing user database adheres to the 2-account clean architecture
 * (Primary Bank & Savings Reserve), resolving duplicate bank accounts,
 * routing legacy transactions to Primary Bank, and eliminating double-counted opening balances.
 */
export async function consolidateUserAccounts(): Promise<void> {
  // Ensure default categories (e.g. Friend, Lending Money) are present
  await syncDefaultCategories();

  const allAccounts = await db.accounts.toArray();
  if (allAccounts.length === 0) return;

  const now = new Date().toISOString();

  // Find active primary bank account: prefer custom named or one with transactions
  const allTxns = await db.transactions.toArray();
  const bankAccounts = allAccounts.filter((a) => a.type === 'bank' && !a.is_archived);
  
  let primaryBank = bankAccounts.find((b) => allTxns.some((t) => t.account_id === b.id)) ||
                    bankAccounts[0] ||
                    allAccounts.find((a) => a.type !== 'savings' && !a.is_archived);

  if (!primaryBank) {
    primaryBank = {
      id: 'acc_bank_1',
      name: 'Primary Bank',
      type: 'bank',
      opening_balance_paise: 0,
      current_balance_paise: 0,
      currency: 'INR',
      color: '#E7FF32',
      institution_name: 'Primary Bank',
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    await db.accounts.put(primaryBank);
  }

  // Find savings account
  let savingsAcc = allAccounts.find((a) => a.type === 'savings' && !a.is_archived);
  if (!savingsAcc) {
    savingsAcc = {
      id: 'acc_savings_1',
      name: 'Savings Reserve',
      type: 'savings',
      opening_balance_paise: 0,
      current_balance_paise: 0,
      currency: 'INR',
      color: '#A8E66A',
      institution_name: 'Savings Reserve',
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    await db.accounts.put(savingsAcc);
  }

  // Active accounts map
  const freshAccounts = await db.accounts.toArray();
  const activeAccountIds = new Set(freshAccounts.filter((a) => !a.is_archived).map((a) => a.id));

  // Comprehensive Transaction Reconciliation:
  // Heal any orphaned, missing, legacy, or disconnected transaction IDs so funds always reflect in active balances!
  for (const t of allTxns) {
    let needsUpdate = false;
    const updates: Partial<Transaction> = {};

    if (!t.account_id || !activeAccountIds.has(t.account_id) || t.account_id !== primaryBank.id && t.account_id !== savingsAcc.id) {
      // Re-route to Primary Bank
      updates.account_id = primaryBank.id;
      needsUpdate = true;
    }

    if (t.type === 'transfer') {
      const currentSource = updates.account_id || t.account_id;
      if (!t.to_account_id || !activeAccountIds.has(t.to_account_id) || t.to_account_id === currentSource) {
        updates.to_account_id = currentSource === primaryBank.id ? savingsAcc.id : primaryBank.id;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.transactions.update(t.id, updates);
    }
  }

  // Re-link salary records
  const allSalaries = await db.salary_records.toArray();
  for (const s of allSalaries) {
    if (!s.account_id || !activeAccountIds.has(s.account_id)) {
      await db.salary_records.update(s.id, { account_id: primaryBank.id });
    }
  }

  // Prevent double counting: If user added a salary income transaction for the month,
  // ensure opening_balance_paise is not also holding the salary amount.
  const primaryTxns = await db.transactions.where('account_id').equals(primaryBank.id).toArray();
  const hasSalaryTxn = primaryTxns.some((t) => !t.is_deleted && t.type === 'income' && t.category_id === 'cat_inc_1');
  if (hasSalaryTxn && primaryBank.opening_balance_paise > 0) {
    await db.accounts.update(primaryBank.id, {
      opening_balance_paise: 0,
      updated_at: now,
    });
  }

  // Archive any duplicate legacy accounts
  const legacySpendingAccounts = freshAccounts.filter(
    (a) => a.id !== primaryBank!.id && a.id !== savingsAcc!.id && a.type !== 'savings' && !a.is_archived
  );
  for (const legacy of legacySpendingAccounts) {
    await db.accounts.update(legacy.id, { is_archived: true, updated_at: now });
  }

  // Recalculate and persist account balances
  const updatedTxns = await db.transactions.toArray();
  for (const acc of [primaryBank, savingsAcc]) {
    const bal = AccountingEngine.calculateAccountBalance(acc, updatedTxns);
    await db.accounts.update(acc.id, { current_balance_paise: bal, updated_at: now });
  }
}
