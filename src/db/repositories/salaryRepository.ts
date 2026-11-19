// AURIX - Salary & Income Stream Repository
import { db } from '../database';
import type { SalaryRecord } from '../../types';
import { TransactionRepository } from './transactionRepository';

export const SalaryRepository = {
  async getAll(): Promise<SalaryRecord[]> {
    return await db.salary_records.reverse().sortBy('credit_date');
  },

  async getByMonth(monthYear: string): Promise<SalaryRecord[]> {
    return await db.salary_records.where('month_year').equals(monthYear).toArray();
  },

  async create(data: Omit<SalaryRecord, 'id' | 'transaction_id' | 'created_at' | 'updated_at'>): Promise<SalaryRecord> {
    const now = new Date().toISOString();
    const id = `sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let txnId: string | undefined;

    // RULE: Only when status is 'received' do we create an actual balance-altering transaction!
    if (data.status === 'received') {
      const txn = await TransactionRepository.create({
        account_id: data.account_id,
        type: 'income',
        amount_paise: data.amount_paise,
        category_id: 'cat_inc_1', // Salary category
        description: `Salary: ${data.employer}`,
        date: data.credit_date,
        payment_method: 'net_banking',
        notes: data.notes || `Salary credited for ${data.month_year}`,
      });
      txnId = txn.id;
    }

    const newRecord: SalaryRecord = {
      ...data,
      id,
      transaction_id: txnId,
      created_at: now,
      updated_at: now,
    };

    await db.salary_records.put(newRecord);
    return newRecord;
  },

  async markAsReceived(id: string, accountId?: string, creditDate?: string): Promise<void> {
    const record = await db.salary_records.get(id);
    if (!record) throw new Error('Salary record not found');
    if (record.status === 'received') return; // Already received

    const targetAccount = accountId || record.account_id;
    const targetDate = creditDate || record.credit_date || new Date().toISOString().split('T')[0];

    const txn = await TransactionRepository.create({
      account_id: targetAccount,
      type: 'income',
      amount_paise: record.amount_paise,
      category_id: 'cat_inc_1',
      description: `Salary: ${record.employer}`,
      date: targetDate,
      payment_method: 'net_banking',
      notes: record.notes || `Salary credited for ${record.month_year}`,
    });

    const now = new Date().toISOString();
    await db.salary_records.update(id, {
      status: 'received',
      account_id: targetAccount,
      credit_date: targetDate,
      transaction_id: txn.id,
      updated_at: now,
    });
  },

  async delete(id: string): Promise<void> {
    const record = await db.salary_records.get(id);
    if (record?.transaction_id) {
      await TransactionRepository.delete(record.transaction_id);
    }
    await db.salary_records.delete(id);
  },
};

