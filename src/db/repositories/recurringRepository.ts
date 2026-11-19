// AURIX - Recurring Bills & Subscriptions Repository
import { db } from '../database';
import type { RecurringBill, BillInstance } from '../../types';
import { TransactionRepository } from './transactionRepository';

export const RecurringRepository = {
  async getAll(): Promise<RecurringBill[]> {
    return await db.recurring_bills.toArray();
  },

  async getUpcoming(daysAhead = 30): Promise<RecurringBill[]> {
    const all = await this.getAll();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    return all.filter((b) => b.is_active && b.next_due_date >= todayStr && b.next_due_date <= futureStr);
  },

  async create(data: Omit<RecurringBill, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringBill> {
    const now = new Date().toISOString();
    const id = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newBill: RecurringBill = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    await db.recurring_bills.put(newBill);
    return newBill;
  },

  async update(id: string, updates: Partial<RecurringBill>): Promise<void> {
    const now = new Date().toISOString();
    await db.recurring_bills.update(id, {
      ...updates,
      updated_at: now,
    });
  },

  async delete(id: string): Promise<void> {
    await db.recurring_bills.delete(id);
    await db.bill_instances.where('recurring_bill_id').equals(id).delete();
  },

  /**
   * Marks a bill as paid:
   * - Records an actual Expense transaction in the user's chosen account
   * - Advances the next_due_date based on frequency
   * - Logs bill instance history
   */
  async markAsPaid(billId: string, accountId: string, paymentMethod = 'upi'): Promise<void> {
    const bill = await db.recurring_bills.get(billId);
    if (!bill) throw new Error('Bill not found');

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // 1. Post real expense transaction
    const txn = await TransactionRepository.create({
      account_id: accountId,
      type: 'expense',
      amount_paise: bill.amount_paise,
      category_id: bill.category_id,
      description: `Bill Payment: ${bill.title}`,
      date: today,
      payment_method: paymentMethod as any,
      notes: `Recurring payment (${bill.frequency})`,
    });

    // 2. Record instance
    const instanceId = `bi_${Date.now()}`;
    await db.bill_instances.put({
      id: instanceId,
      recurring_bill_id: bill.id,
      title: bill.title,
      amount_paise: bill.amount_paise,
      due_date: bill.next_due_date,
      is_paid: true,
      paid_date: today,
      transaction_id: txn.id,
      created_at: now,
    });

    // 3. Compute next due date
    const currentDue = new Date(bill.next_due_date);
    if (bill.frequency === 'monthly') {
      currentDue.setMonth(currentDue.getMonth() + 1);
    } else if (bill.frequency === 'weekly') {
      currentDue.setDate(currentDue.getDate() + 7);
    } else if (bill.frequency === 'yearly') {
      currentDue.setFullYear(currentDue.getFullYear() + 1);
    }
    const nextDateStr = currentDue.toISOString().split('T')[0];

    await db.recurring_bills.update(bill.id, {
      next_due_date: nextDateStr,
      last_paid_date: today,
      updated_at: now,
    });
  },
};

