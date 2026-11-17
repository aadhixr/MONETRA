// MONETRA V3 - Budget Repository
import { db } from '../database';
import type { MonthlyBudget, CategoryBudget } from '../../types';

export const BudgetRepository = {
  async getMonthlyBudget(month: string): Promise<MonthlyBudget | undefined> {
    return await db.monthly_budgets.where('month').equals(month).first();
  },

  async setMonthlyBudget(
    month: string,
    totalLimitPaise: number,
    rolloverEnabled = false
  ): Promise<MonthlyBudget> {
    const existing = await this.getMonthlyBudget(month);
    const now = new Date().toISOString();

    if (existing) {
      await db.monthly_budgets.update(existing.id, {
        total_limit_paise: totalLimitPaise,
        rollover_enabled: rolloverEnabled,
        updated_at: now,
      });
      return { ...existing, total_limit_paise: totalLimitPaise, rollover_enabled: rolloverEnabled, updated_at: now };
    }

    const id = `mb_${month}_${Date.now()}`;
    const newBudget: MonthlyBudget = {
      id,
      month,
      total_limit_paise: totalLimitPaise,
      rollover_enabled: rolloverEnabled,
      created_at: now,
      updated_at: now,
    };
    await db.monthly_budgets.put(newBudget);
    return newBudget;
  },

  async getCategoryBudgets(month: string): Promise<CategoryBudget[]> {
    return await db.category_budgets.where('month').equals(month).toArray();
  },

  async setCategoryBudget(
    month: string,
    categoryId: string,
    allocatedPaise: number
  ): Promise<CategoryBudget> {
    const existing = await db.category_budgets
      .where('month')
      .equals(month)
      .and((b) => b.category_id === categoryId)
      .first();

    const now = new Date().toISOString();

    // Ensure parent monthly budget exists
    let monthlyBudget = await this.getMonthlyBudget(month);
    if (!monthlyBudget) {
      monthlyBudget = await this.setMonthlyBudget(month, allocatedPaise);
    }

    if (existing) {
      await db.category_budgets.update(existing.id, {
        allocated_paise: allocatedPaise,
        updated_at: now,
      });
      return { ...existing, allocated_paise: allocatedPaise, updated_at: now };
    }

    const id = `cb_${month}_${categoryId}_${Date.now()}`;
    const newCatBudget: CategoryBudget = {
      id,
      monthly_budget_id: monthlyBudget.id,
      month,
      category_id: categoryId,
      allocated_paise: allocatedPaise,
      created_at: now,
      updated_at: now,
    };
    await db.category_budgets.put(newCatBudget);
    return newCatBudget;
  },

  async deleteCategoryBudget(id: string): Promise<void> {
    await db.category_budgets.delete(id);
  },

  async copyPreviousMonth(targetMonth: string, sourceMonth: string): Promise<void> {
    const sourceMonthly = await this.getMonthlyBudget(sourceMonth);
    const sourceCatBudgets = await this.getCategoryBudgets(sourceMonth);

    if (sourceMonthly) {
      await this.setMonthlyBudget(
        targetMonth,
        sourceMonthly.total_limit_paise,
        sourceMonthly.rollover_enabled
      );
    }

    for (const cb of sourceCatBudgets) {
      await this.setCategoryBudget(targetMonth, cb.category_id, cb.allocated_paise);
    }
  },

  /**
   * Synchronizes the monthly budget with total credited salary for the given month.
   * Fulfills user requirement: "WHEN EVER THE SALARY CREDITED THAT MY BUDGET FOR THE MONTH TOO"
   */
  async syncSalaryBudget(month: string): Promise<MonthlyBudget | undefined> {
    const monthTxns = await db.transactions
      .filter((t) => !t.is_deleted && t.type === 'income' && Boolean(t.date && t.date.startsWith(month)))
      .toArray();

    const salaryCategories = await db.categories
      .filter((c) => c.type === 'income' && c.name.toLowerCase() === 'salary')
      .toArray();
    const salaryCatIds = new Set(salaryCategories.map((c) => c.id));
    salaryCatIds.add('cat_inc_1');

    // "DONT CONSIDER SAVINGS AS ITS AVAILABLE TO SPENT OKAY ONLY PRIMARY ACCOUNT BALANCE"
    // Income credited to savings accounts is strictly excluded from monthly spending budget!
    const savingsAccounts = await db.accounts.filter((a) => a.type === 'savings').toArray();
    const savingsAccountIds = new Set(savingsAccounts.map((a) => a.id));

    const salaryTxns = monthTxns.filter((t) => {
      if (savingsAccountIds.has(t.account_id)) return false;
      if (salaryCatIds.has(t.category_id)) return true;
      const desc = (t.description || '').toLowerCase();
      return desc.includes('salary') || desc.includes('payroll') || desc.includes('paycheck');
    });

    const totalSalaryPaise = salaryTxns.reduce((sum, t) => sum + (t.amount_paise || 0), 0);
    if (totalSalaryPaise > 0) {
      return await this.setMonthlyBudget(month, totalSalaryPaise);
    }
    return undefined;
  },
};
