// AURIX - Local AI Spending Insights & Natural Language Financial Engine
// Grounded strictly in real transaction records. 100% offline-first.

import type { Transaction, Account, Category, MonthlyBudget } from '../types';
import { AccountingEngine } from '../engine/accountingEngine';
import { formatPaise, PaiseMath, toRupees, toPaise } from '../engine/currency';

export interface AIInsightCard {
  id: string;
  type: 'health' | 'warning' | 'opportunity' | 'anomaly' | 'tip';
  title: string;
  description: string;
  actionLabel?: string;
  category?: string;
  importance: 'high' | 'medium' | 'low';
}

export class AIInsightsService {
  /**
   * Generates smart, grounded financial insights based on real user transaction history.
   */
  static generateInsights(
    month: string, // YYYY-MM
    accounts: Account[],
    transactions: Transaction[],
    categories: Category[],
    monthlyBudget?: MonthlyBudget
  ): AIInsightCard[] {
    const insights: AIInsightCard[] = [];
    const ledger = AccountingEngine.calculateMonthlyLedger(
      month,
      accounts,
      transactions,
      monthlyBudget?.total_limit_paise || 0
    );

    const monthTxns = transactions.filter(
      (t) => !t.is_deleted && t.type === 'expense' && t.date.startsWith(month)
    );

    // 1. Daily Safe-to-Spend Calculation
    const today = new Date();
    const currentMonthStr = today.toISOString().slice(0, 7);
    const isCurrentMonth = month === currentMonthStr;

    if (isCurrentMonth) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDay = today.getDate();
      const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

      let safePoolPaise = 0;
      if (monthlyBudget && monthlyBudget.total_limit_paise > 0) {
        safePoolPaise = Math.max(0, monthlyBudget.total_limit_paise - ledger.total_expenses_paise);
      } else {
        safePoolPaise = AccountingEngine.calculateTotalAvailableBalance(accounts, transactions);
      }

      const dailySafePaise = Math.round(safePoolPaise / daysRemaining);

      insights.push({
        id: 'safe-to-spend',
        type: 'health',
        title: `Safe Daily Spending: ${formatPaise(dailySafePaise)}/day`,
        description: `With ${daysRemaining} days left in the month and ${formatPaise(safePoolPaise)} available, spending within ${formatPaise(dailySafePaise)} keeps you safely on track.`,
        importance: 'high',
      });
    }

    // 2. Unusual Expense Detection (Anomaly detection)
    if (monthTxns.length >= 3) {
      const avgExpensePaise = ledger.total_expenses_paise / monthTxns.length;
      const anomalousTxns = monthTxns.filter((t) => t.amount_paise > avgExpensePaise * 2.5 && t.amount_paise > 100000);

      if (anomalousTxns.length > 0) {
        const topAnomaly = anomalousTxns.sort((a, b) => b.amount_paise - a.amount_paise)[0];
        const cat = categories.find((c) => c.id === topAnomaly.category_id)?.name || 'General';
        insights.push({
          id: `anomaly-${topAnomaly.id}`,
          type: 'anomaly',
          title: `Unusual Expense: ${formatPaise(topAnomaly.amount_paise)}`,
          description: `"${topAnomaly.description}" in ${cat} was significantly higher than typical transactions this month.`,
          importance: 'high',
        });
      }
    }

    // 3. Highest Spending Category Analysis
    const catSpending = AccountingEngine.getCategorySpending(month, transactions);
    const catEntries = Object.entries(catSpending).sort(([, a], [, b]) => b - a);

    if (catEntries.length > 0) {
      const [topCatId, topCatAmount] = catEntries[0];
      const catObj = categories.find((c) => c.id === topCatId);
      const catName = catObj ? catObj.name : 'Expenses';
      const pctOfTotal = ledger.total_expenses_paise > 0
        ? Math.round((topCatAmount / ledger.total_expenses_paise) * 100)
        : 0;

      insights.push({
        id: 'top-spending-cat',
        type: 'warning',
        title: `Top Category: ${catName} (${pctOfTotal}%)`,
        description: `You spent ${formatPaise(topCatAmount)} on ${catName}, representing ${pctOfTotal}% of total expenses this month.`,
        importance: pctOfTotal > 40 ? 'high' : 'medium',
      });
    }

    // 4. Budget Warning & Recommendations
    if (monthlyBudget && monthlyBudget.total_limit_paise > 0) {
      const usage = ledger.budget_percent_used;
      if (usage >= 100) {
        insights.push({
          id: 'budget-exceeded',
          type: 'warning',
          title: 'Monthly Budget Exceeded',
          description: `You have consumed ${usage}% of your ₹${monthlyBudget.total_limit_paise / 100} budget. Discretionary spending should be paused.`,
          importance: 'high',
        });
      } else if (usage >= 75) {
        insights.push({
          id: 'budget-warning',
          type: 'warning',
          title: `${usage}% of Budget Used`,
          description: `You have ${formatPaise(ledger.budget_remaining_paise)} remaining out of ${formatPaise(monthlyBudget.total_limit_paise)}.`,
          importance: 'medium',
        });
      }
    }

    // 5. Net Savings Health Check
    if (ledger.total_income_paise > 0) {
      const savingsRate = Math.round((ledger.net_savings_paise / ledger.total_income_paise) * 100);
      if (savingsRate >= 20) {
        insights.push({
          id: 'savings-healthy',
          type: 'health',
          title: `Strong Savings Rate (${savingsRate}%)`,
          description: `You saved ${formatPaise(ledger.net_savings_paise)} of your income this month. Adhering well to wealth accumulation principles!`,
          importance: 'low',
        });
      } else if (savingsRate < 10 && savingsRate >= 0) {
        insights.push({
          id: 'savings-low',
          type: 'opportunity',
          title: `Savings Opportunity (${savingsRate}%)`,
          description: `Your net savings is currently ${formatPaise(ledger.net_savings_paise)}. Try setting aside 15-20% into your Savings Reserve early in the month.`,
          importance: 'medium',
        });
      } else if (savingsRate < 0) {
        insights.push({
          id: 'deficit-alert',
          type: 'warning',
          title: 'Deficit Alert',
          description: `Expenses exceed income by ${formatPaise(Math.abs(ledger.net_savings_paise))} this month.`,
          importance: 'high',
        });
      }
    }

    return insights;
  }

  /**
   * Resilient Natural Language Financial Query Processor
   * Supports greetings, debits, credits, salary, balances, category queries, affordability checks, and advice.
   */
  static answerFinancialQuery(
    query: string,
    currentMonth: string,
    accounts: Account[],
    transactions: Transaction[],
    categories: Category[],
    monthlyBudget?: MonthlyBudget
  ): { answer: string; relatedData?: any } {
    const q = query.toLowerCase().trim();
    const ledger = AccountingEngine.calculateMonthlyLedger(
      currentMonth,
      accounts,
      transactions,
      monthlyBudget?.total_limit_paise || 0
    );

    const spendingBalance = AccountingEngine.calculateLiquidSpendingBalance(accounts, transactions);
    const savingsBalance = AccountingEngine.calculateTotalSavingsBalance(accounts, transactions);
    const netWorth = spendingBalance + savingsBalance;

    // 1. Greetings & Bot Intro
    if (
      q === 'hi' ||
      q === 'hello' ||
      q === 'hey' ||
      q.startsWith('hi ') ||
      q.startsWith('hello ') ||
      q.includes('who are you') ||
      q.includes('what can you do') ||
      q.includes('help')
    ) {
      return {
        answer:
          `Hello! I am your **AURIX AI Financial Assistant**.\n\n` +
          `I analyze your local financial ledger on-device with zero cloud tracking. Here is what you can ask me:\n` +
          `• **"How much did I spend this month?"**\n` +
          `• **"What was debited?"** (or recent debits)\n` +
          `• **"Show my salary"** (or income details)\n` +
          `• **"Available balance"** (or how much money is left)\n` +
          `• **"How much did I spend on [Food / Travel / Shopping]?"**\n` +
          `• **"Can I afford ₹5,000?"**\n` +
          `• **"How much can I safely spend today?"**`,
      };
    }

    // 2. Debited Transactions / Recent Debits
    if (q.includes('debit') || q.includes('debited') || q.includes('outflow')) {
      const monthExpenses = transactions
        .filter((t) => !t.is_deleted && t.type === 'expense' && t.date.startsWith(currentMonth))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (monthExpenses.length === 0) {
        return {
          answer: `No debited expenses have been recorded for **${currentMonth}**. All your accounts are currently intact!`,
        };
      }

      const topDebits = monthExpenses.slice(0, 4);
      const debitsList = topDebits
        .map((t) => {
          const cat = categories.find((c) => c.id === t.category_id)?.name || 'Expense';
          const acc = accounts.find((a) => a.id === t.account_id)?.name || 'Account';
          return `• **${formatPaise(t.amount_paise)}** for "${t.description}" (${cat}) — Debited from **${acc}** on ${t.date}`;
        })
        .join('\n');

      return {
        answer:
          `Total debited in **${currentMonth}** is **${formatPaise(ledger.total_expenses_paise)}** across ${monthExpenses.length} transactions.\n\n` +
          `**Recent Validated Debits:**\n${debitsList}`,
        relatedData: { total_debited: ledger.total_expenses_paise, transactions: topDebits },
      };
    }

    // 3. Salary & Earnings (Supports variable dates e.g. 5th, 6th, 7th, or 4-day flex window)
    if (
      q.includes('salary') ||
      q.includes('paycheck') ||
      q.includes('credited income') ||
      q.includes('who paid me') ||
      q.includes('employer') ||
      q.includes('when is my salary') ||
      q.includes('salary date') ||
      q.includes('when do i get paid')
    ) {
      const salaryTxns = transactions.filter(
        (t) =>
          !t.is_deleted &&
          t.type === 'income' &&
          (t.description.toLowerCase().includes('salary') || t.category_id === 'cat_inc_1')
      );

      const currentMonthSalary = salaryTxns
        .filter((t) => t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount_paise, 0);

      const latestSalary = salaryTxns.sort((a, b) => b.date.localeCompare(a.date))[0];

      if (!latestSalary) {
        return {
          answer:
            `No salary credits recorded yet. You can tap **"Salary"** in Quick Actions to record your credited salary with your custom or variable credit day!`,
        };
      }

      const acc = accounts.find((a) => a.id === latestSalary.account_id)?.name || 'Primary Bank';

      return {
        answer:
          `**Salary & Credit Date Details:**\n\n` +
          `• **Current Month Salary:** **${formatPaise(currentMonthSalary)}** credited\n` +
          `• **Latest Credit:** **${formatPaise(latestSalary.amount_paise)}** (${latestSalary.description})\n` +
          `• **Credited Account:** **${acc}**\n` +
          `• **Credit Date:** **${latestSalary.date}** (Added to your available spending balance before expenses)\n` +
          (latestSalary.notes ? `• **Credit Note / Window:** ${latestSalary.notes}` : ''),
        relatedData: latestSalary,
      };
    }

    // 4. Balances, Money Left, Net Worth, Accounts
    if (
      q.includes('balance') ||
      q.includes('money do i have') ||
      q.includes('money left') ||
      q.includes('how much money') ||
      q.includes('available money') ||
      q.includes('net worth') ||
      q.includes('accounts') ||
      q.includes('funds')
    ) {
      const spendingBreakdown = accounts
        .filter((a) => !a.is_archived && a.type !== 'savings')
        .map((a) => `• ${a.name}: **${formatPaise(AccountingEngine.calculateAccountBalance(a, transactions))}**`)
        .join('\n');

      const savingsBreakdown = accounts
        .filter((a) => !a.is_archived && a.type === 'savings')
        .map((a) => `• ${a.name}: **${formatPaise(AccountingEngine.calculateAccountBalance(a, transactions))}**`)
        .join('\n');

      return {
        answer:
          `**Institutional Balance Breakdown:**\n\n` +
          `💰 **Available Spending Balance:** **${formatPaise(spendingBalance)}**\n` +
          `${spendingBreakdown || '• No active spending accounts'}\n\n` +
          `🏦 **Dedicated Savings Reserves:** **${formatPaise(savingsBalance)}**\n` +
          `${savingsBreakdown || '• No dedicated savings reserves'}\n\n` +
          `✨ **Total Net Worth:** **${formatPaise(netWorth)}**`,
        relatedData: { spendingBalance, savingsBalance, netWorth },
      };
    }

    // 5. Category-Specific Queries (e.g., Food, Groceries, Shopping, Travel, Rent, Fuel, Mobile Recharge)
    const matchedCategory = categories.find((c) => {
      const name = c.name.toLowerCase();
      return (
        q.includes(name) ||
        (name === 'food' && (q.includes('eat') || q.includes('dining') || q.includes('restaurant'))) ||
        (name === 'groceries' && q.includes('grocery')) ||
        (name === 'transport' && (q.includes('cab') || q.includes('uber') || q.includes('metro')))
      );
    });

    if (matchedCategory) {
      const catTxns = transactions.filter(
        (t) => !t.is_deleted && t.category_id === matchedCategory.id && t.date.startsWith(currentMonth)
      );
      const totalCatPaise = catTxns.reduce((sum, t) => sum + t.amount_paise, 0);
      const pct = ledger.total_expenses_paise > 0
        ? Math.round((totalCatPaise / ledger.total_expenses_paise) * 100)
        : 0;

      return {
        answer:
          `You spent **${formatPaise(totalCatPaise)}** on **${matchedCategory.name}** in ${currentMonth}.\n\n` +
          `• Represents **${pct}%** of your total expenses this month.\n` +
          `• Total transactions: **${catTxns.length}** recorded.`,
        relatedData: { category: matchedCategory.name, spent: totalCatPaise, count: catTxns.length },
      };
    }

    // 6. Affordability Check ("Can I afford ₹X?")
    const matchNumber = q.match(/(\d+[\d,]*)/);
    if (q.includes('afford') || q.includes('can i buy') || q.includes('can i spend')) {
      if (matchNumber) {
        const rawNumStr = matchNumber[1].replace(/,/g, '');
        const targetRupees = parseInt(rawNumStr, 10);
        const targetPaise = targetRupees * 100;

        if (targetPaise <= spendingBalance) {
          const afterBalance = spendingBalance - targetPaise;
          return {
            answer:
              `✅ **Yes, you can afford ₹${targetRupees.toLocaleString('en-IN')}!**\n\n` +
              `• Current available spending balance: **${formatPaise(spendingBalance)}**\n` +
              `• After this purchase, you will have **${formatPaise(afterBalance)}** available.\n` +
              `• Your dedicated savings of **${formatPaise(savingsBalance)}** will remain untouched!`,
          };
        } else {
          const deficit = targetPaise - spendingBalance;
          return {
            answer:
              `⚠️ **Caution:** ₹${targetRupees.toLocaleString('en-IN')} exceeds your available spending balance (**${formatPaise(spendingBalance)}**) by **${formatPaise(deficit)}**.\n\n` +
              `We recommend waiting until next salary credit or reallocating non-essential funds.`,
          };
        }
      }
    }

    // 7. Largest / Biggest Expense
    if (
      q.includes('biggest') ||
      q.includes('largest') ||
      q.includes('highest') ||
      q.includes('max') ||
      q.includes('most expensive')
    ) {
      const monthExpenses = transactions
        .filter((t) => !t.is_deleted && t.type === 'expense' && t.date.startsWith(currentMonth))
        .sort((a, b) => b.amount_paise - a.amount_paise);

      if (monthExpenses.length === 0) {
        return { answer: `No expenses recorded yet for ${currentMonth}.` };
      }

      const top = monthExpenses[0];
      const cat = categories.find((c) => c.id === top.category_id)?.name || 'General';
      const acc = accounts.find((a) => a.id === top.account_id)?.name || 'Account';

      return {
        answer:
          `Your highest expense this month was **${formatPaise(top.amount_paise)}** for **"${top.description}"**.\n\n` +
          `• Category: **${cat}**\n` +
          `• Debited from: **${acc}**\n` +
          `• Date: ${top.date}`,
        relatedData: top,
      };
    }

    // 8. Safe Daily Spend
    if (q.includes('safe') || q.includes('daily') || q.includes('today') || q.includes('per day')) {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysRemaining = Math.max(1, daysInMonth - today.getDate() + 1);

      const remainingPool =
        monthlyBudget && monthlyBudget.total_limit_paise > 0
          ? Math.max(0, monthlyBudget.total_limit_paise - ledger.total_expenses_paise)
          : spendingBalance;

      const dailySafe = Math.round(remainingPool / daysRemaining);

      return {
        answer:
          `You can safely spend **${formatPaise(dailySafe)} per day** for the remaining **${daysRemaining} days** of this month.\n\n` +
          `Total remaining pool: **${formatPaise(remainingPool)}**.`,
        relatedData: { dailySafe, daysRemaining, remainingPool },
      };
    }

    // 9. Total Monthly Spending / General Expenses
    if (
      q.includes('spend') ||
      q.includes('spent') ||
      q.includes('expense') ||
      q.includes('how much') ||
      q.includes('total')
    ) {
      return {
        answer:
          `In **${currentMonth}**, you have spent **${formatPaise(ledger.total_expenses_paise)}** across all categories.\n\n` +
          `• Total Income Credited: **${formatPaise(ledger.total_income_paise)}**\n` +
          `• Net Savings: **${formatPaise(ledger.net_savings_paise)}**\n` +
          `• Available Spending Balance Remaining: **${formatPaise(spendingBalance)}**`,
        relatedData: { total_expenses: ledger.total_expenses_paise },
      };
    }

    // 10. Savings Advice / How to save more
    if (
      q.includes('save') ||
      q.includes('saving') ||
      q.includes('reduce') ||
      q.includes('cut') ||
      q.includes('advice') ||
      q.includes('tip')
    ) {
      const catSpending = AccountingEngine.getCategorySpending(currentMonth, transactions);
      const discretionaryCategories = ['Food', 'Shopping', 'Entertainment', 'Personal Care', 'Travel'];
      const discEntries = Object.entries(catSpending)
        .map(([catId, spent]) => {
          const name = categories.find((c) => c.id === catId)?.name || '';
          return { catId, name, spent };
        })
        .filter((c) => discretionaryCategories.includes(c.name) && c.spent > 0)
        .sort((a, b) => b.spent - a.spent);

      if (discEntries.length > 0) {
        const topDisc = discEntries[0];
        const suggestedSaving = Math.round(topDisc.spent * 0.2); // 20%
        return {
          answer:
            `💡 **Savings Optimization:**\n\n` +
            `Your highest flexible expense is **${topDisc.name}** at **${formatPaise(topDisc.spent)}**.\n` +
            `Capping this by 20% would redirect **${formatPaise(suggestedSaving)}** directly into your Savings Reserves every month!`,
        };
      }

      return {
        answer:
          `Your spending is well-controlled! Consider opening a new **Savings Goal** in the Savings tab to automatically preserve 20% of each salary credit.`,
      };
    }

    // Default: Complete Financial Status Overview
    return {
      answer:
        `Here is your financial status overview for **${currentMonth}**:\n\n` +
        `• 💰 **Available Spending:** **${formatPaise(spendingBalance)}**\n` +
        `• 🏦 **Savings Reserves:** **${formatPaise(savingsBalance)}**\n` +
        `• 📈 **Total Income Credited:** **${formatPaise(ledger.total_income_paise)}**\n` +
        `• 📉 **Total Expenses Debited:** **${formatPaise(ledger.total_expenses_paise)}**\n` +
        `• 🎯 **Net Savings:** **${formatPaise(ledger.net_savings_paise)}**\n\n` +
        `Ask me anything specific like *"What was debited?"*, *"Show my salary"*, or *"Can I afford ₹10,000?"*`,
    };
  }
}

