// AURIX - Multi-Currency Engine & Live Exchange Rate Auto-Conversion Service
import { db } from '../db/database';

export interface CurrencyInfo {
  code: string;       // e.g. 'INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', etc.
  symbol: string;     // e.g. '₹', '$', '€', '£', 'د.إ', '﷼', '$', '¥', etc.
  name: string;       // e.g. 'Indian Rupee', 'US Dollar', 'Euro', 'British Pound', etc.
  locale: string;     // e.g. 'en-IN', 'en-US', 'de-DE', 'en-GB', etc.
  flag: string;       // e.g. '🇮🇳', '🇺🇸', '🇪🇺', '🇬🇧', '🇦🇪', etc.
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE', flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA', flag: '🇸🇦' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar', locale: 'en-SG', flag: '🇸🇬' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', flag: '🇨🇳' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', locale: 'ar-QA', flag: '🇶🇦' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', locale: 'ar-KW', flag: '🇰🇼' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', locale: 'ar-BH', flag: '🇧🇭' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', locale: 'ar-OM', flag: '🇴🇲' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY', flag: '🇲🇾' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH', flag: '🇹🇭' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU', flag: '🇷🇺' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', flag: '🇧🇷' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA', flag: '🇿🇦' },
];

export class CurrencyService {
  // Static fallback exchange rates relative to 1 INR
  private static FALLBACK_RATES_FROM_INR: Record<string, number> = {
    INR: 1,
    USD: 0.0117,    // 1 USD = ~85.5 INR
    EUR: 0.0108,    // 1 EUR = ~92.5 INR
    GBP: 0.0092,    // 1 GBP = ~108.5 INR
    AED: 0.0430,    // 1 AED = ~23.25 INR
    SAR: 0.0438,    // 1 SAR = ~22.8 INR
    CAD: 0.0163,    // 1 CAD = ~61.3 INR
    AUD: 0.0180,    // 1 AUD = ~55.5 INR
    SGD: 0.0157,    // 1 SGD = ~63.7 INR
    JPY: 1.8200,    // 1 JPY = ~0.55 INR
    CNY: 0.0846,    // 1 CNY = ~11.8 INR
    QAR: 0.0426,    // 1 QAR = ~23.5 INR
    KWD: 0.0036,    // 1 KWD = ~278 INR
    BHD: 0.0044,    // 1 BHD = ~227 INR
    OMR: 0.0045,    // 1 OMR = ~222 INR
    MYR: 0.0520,    // 1 MYR = ~19.2 INR
    THB: 0.4050,    // 1 THB = ~2.47 INR
    RUB: 1.1500,    // 1 RUB = ~0.87 INR
    BRL: 0.0670,    // 1 BRL = ~14.9 INR
    ZAR: 0.2100,    // 1 ZAR = ~4.76 INR
  };

  /**
   * Fetches live exchange rates relative to base currency (e.g. INR)
   */
  static async fetchLiveRates(baseCurrency = 'INR'): Promise<Record<string, number>> {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data && data.rates) {
        localStorage.setItem(`aurix_rates_${baseCurrency}`, JSON.stringify({
          timestamp: Date.now(),
          rates: data.rates,
        }));
        return data.rates;
      }
    } catch (e) {
      // Use cached or fallback
    }

    const cached = localStorage.getItem(`aurix_rates_${baseCurrency}`);
    if (cached) {
      try {
        return JSON.parse(cached).rates;
      } catch (e) {}
    }

    return this.FALLBACK_RATES_FROM_INR;
  }

  /**
   * Computes the live comparison exchange rate string (e.g. "1 USD = ₹85.47 INR")
   */
  static async getComparisonRateText(fromCode: string, toCode: string): Promise<string> {
    if (fromCode === toCode) return `1 ${fromCode} = 1 ${toCode}`;

    const rates = await this.fetchLiveRates('INR');
    const rateFromINR = rates[fromCode] || this.FALLBACK_RATES_FROM_INR[fromCode] || 1;
    const rateToINR = rates[toCode] || this.FALLBACK_RATES_FROM_INR[toCode] || 1;

    const multiplier = rateToINR / rateFromINR;
    return `1 ${fromCode} = ${multiplier.toFixed(4)} ${toCode}`;
  }

  /**
   * Automatically converts the entire local IndexedDB database from oldCurrency to newCurrency using live rates
   */
  static async convertEntireDatabaseCurrency(fromCurrency: string, toCurrency: string): Promise<{ multiplier: number; success: boolean }> {
    if (fromCurrency === toCurrency) return { multiplier: 1, success: true };

    const rates = await this.fetchLiveRates('INR');
    const rateFromINR = rates[fromCurrency] || this.FALLBACK_RATES_FROM_INR[fromCurrency] || 1;
    const rateToINR = rates[toCurrency] || this.FALLBACK_RATES_FROM_INR[toCurrency] || 1;

    // Multiplier to convert amounts: 1 Unit of Old Currency = multiplier Units of New Currency
    const multiplier = rateToINR / rateFromINR;

    await db.transaction(
      'rw',
      [
        db.accounts,
        db.transactions,
        db.monthly_budgets,
        db.category_budgets,
        db.savings_goals,
        db.recurring_bills,
        db.debts,
        db.salary_records,
      ],
      async () => {
        // 1. Accounts
        const accounts = await db.accounts.toArray();
        for (const acc of accounts) {
          await db.accounts.update(acc.id, {
            opening_balance_paise: Math.round(acc.opening_balance_paise * multiplier),
            current_balance_paise: Math.round(acc.current_balance_paise * multiplier),
            currency: toCurrency,
          });
        }

        // 2. Transactions
        const txns = await db.transactions.toArray();
        for (const t of txns) {
          await db.transactions.update(t.id, {
            amount_paise: Math.round(t.amount_paise * multiplier),
          });
        }

        // 3. Monthly Budgets
        const budgets = await db.monthly_budgets.toArray();
        for (const b of budgets) {
          await db.monthly_budgets.update(b.id, {
            total_limit_paise: Math.round(b.total_limit_paise * multiplier),
          });
        }

        // 4. Category Budgets
        const catBudgets = await db.category_budgets.toArray();
        for (const cb of catBudgets) {
          await db.category_budgets.update(cb.id, {
            allocated_paise: Math.round(cb.allocated_paise * multiplier),
          });
        }

        // 5. Savings Goals
        const goals = await db.savings_goals.toArray();
        for (const g of goals) {
          await db.savings_goals.update(g.id, {
            target_paise: Math.round(g.target_paise * multiplier),
            current_paise: Math.round(g.current_paise * multiplier),
          });
        }

        // 6. Recurring Bills
        const bills = await db.recurring_bills.toArray();
        for (const rb of bills) {
          await db.recurring_bills.update(rb.id, {
            amount_paise: Math.round(rb.amount_paise * multiplier),
          });
        }

        // 7. Debts
        const debts = await db.debts.toArray();
        for (const d of debts) {
          await db.debts.update(d.id, {
            original_amount_paise: Math.round(d.original_amount_paise * multiplier),
            repaid_amount_paise: Math.round(d.repaid_amount_paise * multiplier),
          });
        }

        // 8. Salary Records
        const salaries = await db.salary_records.toArray();
        for (const s of salaries) {
          await db.salary_records.update(s.id, {
            amount_paise: Math.round(s.amount_paise * multiplier),
          });
        }
      }
    );

    return { multiplier, success: true };
  }
}
