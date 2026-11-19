// AURIX - Settings & Local DB Administration Repository
import { db } from '../database';
import type { AppSettings } from '../../types';
import { initializeDatabaseIfEmpty } from '../seed';

export const SettingsRepository = {
  async get(): Promise<AppSettings> {
    let settings = await db.app_settings.get('current_settings');
    if (!settings) {
      await initializeDatabaseIfEmpty();
      settings = await db.app_settings.get('current_settings');
    }
    return settings!;
  },

  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const now = new Date().toISOString();
    const updated = {
      ...current,
      ...updates,
      updated_at: now,
    };
    await db.app_settings.put(updated);
    return updated;
  },

  async exportAllData(): Promise<string> {
    const data = {
      version: '3.0',
      exported_at: new Date().toISOString(),
      accounts: await db.accounts.toArray(),
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      monthly_budgets: await db.monthly_budgets.toArray(),
      category_budgets: await db.category_budgets.toArray(),
      savings_goals: await db.savings_goals.toArray(),
      savings_contributions: await db.savings_contributions.toArray(),
      recurring_bills: await db.recurring_bills.toArray(),
      bill_instances: await db.bill_instances.toArray(),
      debts: await db.debts.toArray(),
      debt_payments: await db.debt_payments.toArray(),
      salary_records: await db.salary_records.toArray(),
      app_settings: await db.app_settings.toArray(),
      audit_events: await db.audit_events.toArray(),
    };
    return JSON.stringify(data, null, 2);
  },

  async importData(jsonString: string): Promise<boolean> {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        throw new Error('Empty or invalid JSON input');
      }
      const data = JSON.parse(jsonString);

      // Flexible validation: check for accounts, transactions, categories, or version
      const hasValidData =
        Array.isArray(data.accounts) ||
        Array.isArray(data.transactions) ||
        Array.isArray(data.categories) ||
        Boolean(data.version);

      if (!hasValidData) {
        throw new Error('Invalid MONETRA backup format');
      }

      await db.transaction(
        'rw',
        [
          db.accounts,
          db.transactions,
          db.categories,
          db.monthly_budgets,
          db.category_budgets,
          db.savings_goals,
          db.savings_contributions,
          db.recurring_bills,
          db.bill_instances,
          db.debts,
          db.debt_payments,
          db.salary_records,
          db.app_settings,
          db.audit_events,
        ],
        async () => {
          if (Array.isArray(data.accounts) && data.accounts.length > 0) await db.accounts.bulkPut(data.accounts);
          if (Array.isArray(data.transactions) && data.transactions.length > 0) await db.transactions.bulkPut(data.transactions);
          if (Array.isArray(data.categories) && data.categories.length > 0) await db.categories.bulkPut(data.categories);
          if (Array.isArray(data.monthly_budgets) && data.monthly_budgets.length > 0) await db.monthly_budgets.bulkPut(data.monthly_budgets);
          if (Array.isArray(data.category_budgets) && data.category_budgets.length > 0) await db.category_budgets.bulkPut(data.category_budgets);
          if (Array.isArray(data.savings_goals) && data.savings_goals.length > 0) await db.savings_goals.bulkPut(data.savings_goals);
          if (Array.isArray(data.savings_contributions) && data.savings_contributions.length > 0) await db.savings_contributions.bulkPut(data.savings_contributions);
          if (Array.isArray(data.recurring_bills) && data.recurring_bills.length > 0) await db.recurring_bills.bulkPut(data.recurring_bills);
          if (Array.isArray(data.bill_instances) && data.bill_instances.length > 0) await db.bill_instances.bulkPut(data.bill_instances);
          if (Array.isArray(data.debts) && data.debts.length > 0) await db.debts.bulkPut(data.debts);
          if (Array.isArray(data.debt_payments) && data.debt_payments.length > 0) await db.debt_payments.bulkPut(data.debt_payments);
          if (Array.isArray(data.salary_records) && data.salary_records.length > 0) await db.salary_records.bulkPut(data.salary_records);
          if (Array.isArray(data.app_settings) && data.app_settings.length > 0) await db.app_settings.bulkPut(data.app_settings);
        }
      );
      return true;
    } catch (err) {
      console.error('Import failed', err);
      return false;
    }
  },

  async resetEntireDatabase(): Promise<void> {
    await db.delete();
    await db.open();
    await initializeDatabaseIfEmpty();
  },
};

