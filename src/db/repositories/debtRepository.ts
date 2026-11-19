// AURIX - Debt Management Repository (Lent / Borrowed)
import { db } from '../database';
import type { Debt, DebtPayment } from '../../types';
import { TransactionRepository } from './transactionRepository';
import { PaiseMath } from '../../engine/currency';

export const DebtRepository = {
  async getAll(): Promise<Debt[]> {
    return await db.debts.reverse().sortBy('created_at');
  },

  async getById(id: string): Promise<Debt | undefined> {
    return await db.debts.get(id);
  },

  async create(data: Omit<Debt, 'id' | 'repaid_amount_paise' | 'is_settled' | 'created_at' | 'updated_at'>): Promise<Debt> {
    const now = new Date().toISOString();
    const id = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newDebt: Debt = {
      ...data,
      id,
      repaid_amount_paise: 0,
      is_settled: false,
      created_at: now,
      updated_at: now,
    };

    await db.debts.put(newDebt);
    return newDebt;
  },

  async delete(id: string): Promise<void> {
    await db.debts.delete(id);
    await db.debt_payments.where('debt_id').equals(id).delete();
  },

  async getPayments(debtId: string): Promise<DebtPayment[]> {
    return await db.debt_payments.where('debt_id').equals(debtId).reverse().sortBy('date');
  },

  /**
   * Records a repayment against a debt:
   * - If type === 'lent', the person is paying user back -> User's account receives money (Income/Inflow)
   * - If type === 'borrowed', user is paying back lender -> User's account spends money (Expense/Outflow)
   */
  async recordPayment(
    debtId: string,
    amountPaise: number,
    accountId: string,
    notes?: string
  ): Promise<void> {
    const debt = await db.debts.get(debtId);
    if (!debt) throw new Error('Debt record not found');
    if (amountPaise <= 0) throw new Error('Payment amount must be greater than zero');

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    let txnId: string | undefined;

    if (debt.type === 'lent') {
      // Money coming back to user
      const txn = await TransactionRepository.create({
        account_id: accountId,
        type: 'income',
        amount_paise: amountPaise,
        category_id: 'cat_inc_6', // Refund / Debt Recovery
        description: `Debt Repaid by ${debt.person_name}`,
        date: today,
        payment_method: 'upi',
        notes: notes || `Repayment for lent debt to ${debt.person_name}`,
      });
      txnId = txn.id;
    } else {
      // User paying back borrowed money
      const txn = await TransactionRepository.create({
        account_id: accountId,
        type: 'expense',
        amount_paise: amountPaise,
        category_id: 'cat_exp_18', // EMI / Loan Repayment
        description: `Loan Repayment to ${debt.person_name}`,
        date: today,
        payment_method: 'upi',
        notes: notes || `Repayment for borrowed funds from ${debt.person_name}`,
      });
      txnId = txn.id;
    }

    const paymentId = `dp_${Date.now()}`;
    const payment: DebtPayment = {
      id: paymentId,
      debt_id: debtId,
      transaction_id: txnId,
      amount_paise: amountPaise,
      date: today,
      account_id: accountId,
      notes,
      created_at: now,
    };

    const newRepaidTotal = PaiseMath.add(debt.repaid_amount_paise, amountPaise);
    const isSettled = newRepaidTotal >= debt.original_amount_paise;

    await db.transaction('rw', [db.debts, db.debt_payments], async () => {
      await db.debt_payments.put(payment);
      await db.debts.update(debtId, {
        repaid_amount_paise: newRepaidTotal,
        is_settled: isSettled,
        settled_date: isSettled ? today : undefined,
        updated_at: now,
      });
    });
  },
};

