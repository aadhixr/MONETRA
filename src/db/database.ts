// MONETRA V3 - Local IndexedDB Database using Dexie.js
import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Transaction,
  Category,
  MonthlyBudget,
  CategoryBudget,
  SavingsGoal,
  SavingsContribution,
  RecurringBill,
  BillInstance,
  Debt,
  DebtPayment,
  SalaryRecord,
  AppSettings,
  AuditEvent,
} from '../types';

export class MonetraDatabase extends Dexie {
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  monthly_budgets!: Table<MonthlyBudget, string>;
  category_budgets!: Table<CategoryBudget, string>;
  savings_goals!: Table<SavingsGoal, string>;
  savings_contributions!: Table<SavingsContribution, string>;
  recurring_bills!: Table<RecurringBill, string>;
  bill_instances!: Table<BillInstance, string>;
  debts!: Table<Debt, string>;
  debt_payments!: Table<DebtPayment, string>;
  salary_records!: Table<SalaryRecord, string>;
  app_settings!: Table<AppSettings, string>;
  audit_events!: Table<AuditEvent, string>;

  constructor() {
    super('MonetraDB_v3');

    this.version(1).stores({
      accounts: 'id, name, type, is_archived, created_at',
      transactions: 'id, account_id, to_account_id, type, category_id, date, created_at, [date+type], is_deleted',
      categories: 'id, name, type, is_default',
      monthly_budgets: 'id, month, created_at',
      category_budgets: 'id, monthly_budget_id, month, category_id',
      savings_goals: 'id, name, target_date, is_completed, created_at',
      savings_contributions: 'id, goal_id, date, created_at',
      recurring_bills: 'id, frequency, due_day_of_month, is_active, next_due_date',
      bill_instances: 'id, recurring_bill_id, due_date, is_paid',
      debts: 'id, person_name, type, is_settled, due_date',
      debt_payments: 'id, debt_id, date',
      salary_records: 'id, credit_date, account_id, month_year, status',
      app_settings: 'id',
      audit_events: 'id, action, timestamp, entity',
    });
  }
}

export const db = new MonetraDatabase();
