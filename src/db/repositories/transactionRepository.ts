// AURIX - Transaction Repository
import { db } from '../database';
import type { Transaction, TransactionType, PaymentMethod } from '../../types';
import { AccountRepository } from './accountRepository';
import { BudgetRepository } from './budgetRepository';

export const TransactionRepository = {
  async getAll(): Promise<Transaction[]> {
    return await db.transactions
      .filter((t) => !t.is_deleted)
      .reverse()
      .sortBy('date');
  },

  async getRecent(limit = 10): Promise<Transaction[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  },

  async getByMonth(month: string): Promise<Transaction[]> {
    return await db.transactions
      .filter((t) => !t.is_deleted && t.date.startsWith(month))
      .reverse()
      .sortBy('date');
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  },

  async create(data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Validation
    if (data.amount_paise <= 0) {
      throw new Error('Transaction amount must be greater than zero.');
    }
    if (data.type === 'transfer' && !data.to_account_id) {
      throw new Error('Transfer requires a destination account.');
    }

    const newTxn: Transaction = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    await db.transaction('rw', [db.transactions, db.accounts, db.audit_events], async () => {
      await db.transactions.put(newTxn);

      await db.audit_events.put({
        id: `audit_${Date.now()}`,
        action: 'create',
        entity: 'transaction',
        entity_id: id,
        details: `${newTxn.type.toUpperCase()}: ${newTxn.description} (₹${newTxn.amount_paise / 100})`,
        timestamp: now,
      });
    });

    // Recompute cached balances
    await AccountRepository.syncAccountBalances();

    // "WHEN EVER THE SALRY CREDITED THAT MY BUDGET FOR THE MONTH TOO"
    if (newTxn.type === 'income' && newTxn.date) {
      await BudgetRepository.syncSalaryBudget(newTxn.date.slice(0, 7));
    }

    return newTxn;
  },

  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    const existing = await db.transactions.get(id);
    const now = new Date().toISOString();
    await db.transaction('rw', [db.transactions, db.accounts, db.audit_events], async () => {
      await db.transactions.update(id, {
        ...updates,
        updated_at: now,
      });

      await db.audit_events.put({
        id: `audit_${Date.now()}`,
        action: 'update',
        entity: 'transaction',
        entity_id: id,
        details: `Updated transaction ${id}`,
        timestamp: now,
      });
    });

    await AccountRepository.syncAccountBalances();

    if (existing && existing.date) {
      await BudgetRepository.syncSalaryBudget(existing.date.slice(0, 7));
    }
    if (updates.date && updates.date.slice(0, 7) !== existing?.date?.slice(0, 7)) {
      await BudgetRepository.syncSalaryBudget(updates.date.slice(0, 7));
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.transactions.get(id);
    const now = new Date().toISOString();
    await db.transaction('rw', [db.transactions, db.accounts, db.audit_events], async () => {
      // Mark as deleted (soft delete)
      await db.transactions.update(id, {
        is_deleted: true,
        updated_at: now,
      });

      await db.audit_events.put({
        id: `audit_${Date.now()}`,
        action: 'delete',
        entity: 'transaction',
        entity_id: id,
        details: `Deleted transaction ${id}`,
        timestamp: now,
      });
    });

    await AccountRepository.syncAccountBalances();

    if (existing && existing.date) {
      await BudgetRepository.syncSalaryBudget(existing.date.slice(0, 7));
    }
  },

  async duplicate(id: string): Promise<Transaction | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const todayIso = new Date().toISOString().split('T')[0];
    const cloned = await this.create({
      account_id: original.account_id,
      to_account_id: original.to_account_id,
      type: original.type,
      amount_paise: original.amount_paise,
      category_id: original.category_id,
      description: `${original.description} (Copy)`,
      date: todayIso,
      payment_method: original.payment_method,
      notes: original.notes,
      tags: original.tags,
    });

    return cloned;
  },
};

