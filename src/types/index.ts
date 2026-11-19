// AURIX - Global Financial Domain Model Types

export type AccountType = 'cash' | 'bank' | 'upi' | 'savings' | 'custom';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  opening_balance_paise: number; // Stored in integer paise (1 INR = 100 paise)
  current_balance_paise: number;
  currency: string; // 'INR'
  color?: string;
  institution_name?: string;
  account_number_last4?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod = 'cash' | 'upi' | 'debit_card' | 'credit_card' | 'net_banking' | 'cheque' | 'other';

export interface Transaction {
  id: string;
  account_id: string; // Source account (or primary account for expense/income)
  to_account_id?: string; // Destination account for transfers
  type: TransactionType;
  amount_paise: number; // Integer paise
  category_id: string;
  description: string;
  date: string; // ISO string YYYY-MM-DD
  payment_method: PaymentMethod;
  notes?: string;
  receipt_image?: string; // Base64 data URL
  tags?: string[];
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  total_limit_paise: number;
  rollover_enabled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryBudget {
  id: string;
  monthly_budget_id: string;
  month: string; // YYYY-MM
  category_id: string;
  allocated_paise: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_paise: number;
  current_paise: number;
  target_date: string; // YYYY-MM-DD
  linked_account_id?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_completed: boolean;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsContribution {
  id: string;
  goal_id: string;
  transaction_id?: string;
  amount_paise: number;
  type: 'deposit' | 'withdrawal';
  date: string;
  notes?: string;
  account_id?: string;
  created_at: string;
}

export type BillFrequency = 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringBill {
  id: string;
  title: string;
  amount_paise: number;
  category_id: string;
  frequency: BillFrequency;
  due_day_of_month: number; // 1 - 31
  next_due_date: string; // YYYY-MM-DD
  account_id?: string;
  is_active: boolean;
  notes?: string;
  last_paid_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BillInstance {
  id: string;
  recurring_bill_id: string;
  title: string;
  amount_paise: number;
  due_date: string; // YYYY-MM-DD
  is_paid: boolean;
  paid_date?: string;
  transaction_id?: string;
  created_at: string;
}

export type DebtType = 'lent' | 'borrowed';

export interface Debt {
  id: string;
  person_name: string;
  type: DebtType;
  original_amount_paise: number;
  repaid_amount_paise: number;
  due_date?: string; // YYYY-MM-DD
  account_id?: string;
  notes?: string;
  is_settled: boolean;
  settled_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  transaction_id?: string;
  amount_paise: number;
  date: string;
  notes?: string;
  account_id?: string;
  created_at: string;
}

export interface SalaryRecord {
  id: string;
  employer: string;
  amount_paise: number;
  credit_date: string; // YYYY-MM-DD
  account_id: string;
  month_year: string; // YYYY-MM
  status: 'expected' | 'received';
  credit_day_of_month?: number; // e.g. 5, 6, 7
  variable_window?: string; // e.g. '5th – 8th (4-day variable window)'
  notes?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export type ThemeId =
  | 'neon_lime'
  | 'midnight_blue'
  | 'cyber_purple'
  | 'emerald_wealth'
  | 'solar_amber'
  | 'crimson_noir'
  | 'slate_minimal'
  | 'nordic_frost'
  | 'ferrari_crimson'
  | 'velvet_rose'
  | 'royal_sapphire'
  | 'aquamarine_ocean'
  | 'platinum_silver'
  | 'deep_cosmos'
  | 'dark'
  | 'light';

export interface AppSettings {
  id: string; // 'current_settings'
  user_name: string;
  currency_code: string; // 'INR'
  currency_symbol: string; // '₹'
  locale: string; // 'en-IN'
  date_format: string; // 'DD MMM YYYY'
  theme: ThemeId;
  hide_balance: boolean;
  default_salary_day?: number; // e.g. 5, 6, 7
  salary_variable_window?: string; // e.g. '5th – 8th'
  cloud_backup_enabled: boolean;
  cloud_url?: string;
  cloud_anon_key?: string;
  gdrive_token?: string;
  last_backup_at?: string;
  onboarding_completed: boolean;
  enable_ai_local: boolean;
  enable_sound: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'backup' | 'restore';
  entity: string;
  entity_id: string;
  details?: string;
  timestamp: string;
}

export interface MonthlyOverviewSummary {
  month: string; // YYYY-MM
  opening_balance_paise: number;
  total_income_paise: number;
  total_expenses_paise: number;
  total_transfers_out_paise: number;
  total_spent_paise: number;
  net_savings_paise: number;
  closing_balance_paise: number;
  budget_total_paise: number;
  budget_remaining_paise: number;
  budget_percent_used: number;
}

