// MONETRA V3 - Account Repository
import { db } from '../database';
import type { Account, AccountType } from '../../types';
import { AccountingEngine } from '../../engine/accountingEngine';

export const AccountRepository = {
  async getAll(): Promise<Account[]> {
    return await db.accounts.filter((a) => !a.is_archived).toArray();
  },

  async getAllIncludingArchived(): Promise<Account[]> {
    return await db.accounts.toArray();
  },

  async getById(id: string): Promise<Account | undefined> {
    return await db.accounts.get(id);
  },

  async create(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const now = new Date().toISOString();
    const id = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAccount: Account = {
      ...account,
      id,
      current_balance_paise: account.opening_balance_paise,
      created_at: now,
      updated_at: now,
    };
    await db.accounts.put(newAccount);

    // Record audit event
    await db.audit_events.put({
      id: `audit_${Date.now()}`,
      action: 'create',
      entity: 'account',
      entity_id: id,
      details: `Created account ${newAccount.name} with opening balance ₹${newAccount.opening_balance_paise / 100}`,
      timestamp: now,
    });

    return newAccount;
  },

  async update(id: string, updates: Partial<Account>): Promise<void> {
    const now = new Date().toISOString();
    await db.accounts.update(id, {
      ...updates,
      updated_at: now,
    });
  },

  async archive(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.accounts.update(id, {
      is_archived: true,
      updated_at: now,
    });
  },

  /**
   * Recalculates and persists current balance across all accounts using ledger transactions.
   */
  async syncAccountBalances(): Promise<Account[]> {
    const accounts = await db.accounts.toArray();
    const allTxns = await db.transactions.toArray();
    const now = new Date().toISOString();

    for (const acc of accounts) {
      const calculatedBalance = AccountingEngine.calculateAccountBalance(acc, allTxns);
      if (acc.current_balance_paise !== calculatedBalance) {
        await db.accounts.update(acc.id, {
          current_balance_paise: calculatedBalance,
          updated_at: now,
        });
        acc.current_balance_paise = calculatedBalance;
      }
    }
    return accounts;
  },
};
