// MONETRA V3 - Settings & Local DB Administration Repository
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
      const data = JSON.parse(jsonString);
      if (!data.version || !data.accounts) {
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
          if (data.accounts) await db.accounts.bulkPut(data.accounts);
          if (data.transactions) await db.transactions.bulkPut(data.transactions);
          if (data.categories) await db.categories.bulkPut(data.categories);
          if (data.monthly_budgets) await db.monthly_budgets.bulkPut(data.monthly_budgets);
          if (data.category_budgets) await db.category_budgets.bulkPut(data.category_budgets);
          if (data.savings_goals) await db.savings_goals.bulkPut(data.savings_goals);
          if (data.savings_contributions) await db.savings_contributions.bulkPut(data.savings_contributions);
          if (data.recurring_bills) await db.recurring_bills.bulkPut(data.recurring_bills);
          if (data.bill_instances) await db.bill_instances.bulkPut(data.bill_instances);
          if (data.debts) await db.debts.bulkPut(data.debts);
          if (data.debt_payments) await db.debt_payments.bulkPut(data.debt_payments);
          if (data.salary_records) await db.salary_records.bulkPut(data.salary_records);
          if (data.app_settings) await db.app_settings.bulkPut(data.app_settings);
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
