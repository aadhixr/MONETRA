// MONETRA V3 - Savings Goals Repository
import { db } from '../database';
import type { SavingsGoal, SavingsContribution } from '../../types';
import { TransactionRepository } from './transactionRepository';
import { AccountRepository } from './accountRepository';
import { PaiseMath } from '../../engine/currency';

export const SavingsRepository = {
  async getAll(): Promise<SavingsGoal[]> {
    return await db.savings_goals.reverse().sortBy('created_at');
  },

  async getById(id: string): Promise<SavingsGoal | undefined> {
    return await db.savings_goals.get(id);
  },

  async create(data: Omit<SavingsGoal, 'id' | 'current_paise' | 'is_completed' | 'created_at' | 'updated_at'> & { initial_paise?: number; initial_account_id?: string }): Promise<SavingsGoal> {
    const now = new Date().toISOString();
    const id = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newGoal: SavingsGoal = {
      id,
      name: data.name,
      target_paise: data.target_paise,
      current_paise: 0,
      target_date: data.target_date,
      linked_account_id: data.linked_account_id,
      description: data.description,
      icon: data.icon || 'Target',
      color: data.color || '#E7FF32',
      is_completed: false,
      created_at: now,
      updated_at: now,
    };

    await db.savings_goals.put(newGoal);

    // If an initial deposit was requested from an account:
    if (data.initial_paise && data.initial_paise > 0 && data.initial_account_id) {
      await this.contribute(id, data.initial_paise, data.initial_account_id, 'Initial seed deposit');
    }

    return newGoal;
  },

  async update(id: string, updates: Partial<SavingsGoal>): Promise<void> {
    const now = new Date().toISOString();
    await db.savings_goals.update(id, {
      ...updates,
      updated_at: now,
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.savings_goals, db.savings_contributions], async () => {
      await db.savings_goals.delete(id);
      await db.savings_contributions.where('goal_id').equals(id).delete();
    });
  },

  async getContributions(goalId: string): Promise<SavingsContribution[]> {
    return await db.savings_contributions
      .where('goal_id')
      .equals(goalId)
      .reverse()
      .sortBy('date');
  },

  /**
   * Records a contribution to a savings goal.
   * Creates a verifiable transaction record:
   * - If goal has a linked savings account and user pays from another account, it creates a Transfer.
   * - Otherwise, logs transaction tagged with goal contribution.
   */
  async contribute(
    goalId: string,
    amountPaise: number,
    fromAccountId: string,
    notes?: string,
    toAccountId?: string
  ): Promise<void> {
    if (amountPaise <= 0) throw new Error('Contribution must be greater than zero.');

    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Goal not found.');

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Determine target account: explicitly chosen destination, or goal linked account, or fallback to funding account
    const targetAccountId = toAccountId || goal.linked_account_id || fromAccountId;

    let txnId: string | undefined;

    if (targetAccountId !== fromAccountId) {
      // Inter-account transfer: from spending account to linked/destination savings account
      const transferTxn = await TransactionRepository.create({
        account_id: fromAccountId,
        to_account_id: targetAccountId,
        type: 'transfer',
        amount_paise: amountPaise,
        category_id: 'cat_transfer',
        description: `Savings Goal: ${goal.name}`,
        date: today,
        payment_method: 'other',
        notes: notes || `Contribution to goal: ${goal.name}`,
      });
      txnId = transferTxn.id;
    } else {
      // Direct transfer within or tagged
      const txn = await TransactionRepository.create({
        account_id: fromAccountId,
        type: 'transfer',
        to_account_id: fromAccountId,
        amount_paise: amountPaise,
        category_id: 'cat_transfer',
        description: `Goal Allocation: ${goal.name}`,
        date: today,
        payment_method: 'other',
        notes: notes || `Direct allocation for ${goal.name}`,
      });
      txnId = txn.id;
    }

    const contributionId = `sc_${Date.now()}`;
    const contribution: SavingsContribution = {
      id: contributionId,
      goal_id: goalId,
      transaction_id: txnId,
      amount_paise: amountPaise,
      type: 'deposit',
      date: today,
      account_id: fromAccountId,
      notes,
      created_at: now,
    };

    const newTotal = PaiseMath.add(goal.current_paise, amountPaise);
    const isCompleted = newTotal >= goal.target_paise;

    await db.transaction('rw', [db.savings_goals, db.savings_contributions], async () => {
      await db.savings_contributions.put(contribution);
      await db.savings_goals.update(goalId, {
        current_paise: newTotal,
        linked_account_id: goal.linked_account_id || (targetAccountId !== fromAccountId ? targetAccountId : undefined),
        is_completed: isCompleted,
        completed_date: isCompleted ? today : undefined,
        updated_at: now,
      });
    });
  },

  /**
   * Withdraws an amount from a savings goal back to an account.
   */
  async withdraw(
    goalId: string,
    amountPaise: number,
    toAccountId: string,
    notes?: string,
    fromAccountId?: string
  ): Promise<void> {
    if (amountPaise <= 0) throw new Error('Withdrawal amount must be greater than zero.');

    const goal = await this.getById(goalId);
    if (!goal) throw new Error('Goal not found.');
    if (goal.current_paise < amountPaise) {
      throw new Error('Withdrawal exceeds current accumulated savings in this goal.');
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const sourceAccId = fromAccountId || goal.linked_account_id || toAccountId;

    // Create reverse transfer
    const txn = await TransactionRepository.create({
      account_id: sourceAccId,
      to_account_id: toAccountId,
      type: 'transfer',
      amount_paise: amountPaise,
      category_id: 'cat_transfer',
      description: `Savings Withdrawal: ${goal.name}`,
      date: today,
      payment_method: 'other',
      notes: notes || `Withdrawal from goal ${goal.name}`,
    });

    const contributionId = `sc_wd_${Date.now()}`;
    const contribution: SavingsContribution = {
      id: contributionId,
      goal_id: goalId,
      transaction_id: txn.id,
      amount_paise: amountPaise,
      type: 'withdrawal',
      date: today,
      account_id: toAccountId,
      notes,
      created_at: now,
    };

    const newTotal = PaiseMath.subtract(goal.current_paise, amountPaise);

    await db.transaction('rw', [db.savings_goals, db.savings_contributions], async () => {
      await db.savings_contributions.put(contribution);
      await db.savings_goals.update(goalId, {
        current_paise: Math.max(0, newTotal),
        is_completed: newTotal >= goal.target_paise,
        updated_at: now,
      });
    });
  },
};
