// AURIX - High-Velocity Add / Edit Transaction System
import React, { useState, useEffect } from 'react';
import { Camera, Check, ArrowRightLeft, TrendingDown, TrendingUp, Calendar, CreditCard, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CategoryIcon } from '../common/CategoryIcon';
import { InsufficientBalanceModal } from '../common/InsufficientBalanceModal';
import { useFinancial } from '../../context/FinancialContext';
import { toPaise, formatPaise, toRupees } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import { SmartCategorizer } from '../../engine/smartCategorizer';
import type { SmartCategoryMatch } from '../../engine/smartCategorizer';
import type { Transaction, TransactionType, PaymentMethod } from '../../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  editingTransaction = null,
}) => {
  const {
    accounts,
    transactions,
    categories,
    addTransaction,
    updateTransaction,
    currentMonth,
  } = useFinancial();

  // Form State
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);

  // Smart Category Auto-Detection State
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<SmartCategoryMatch | null>(null);
  const [hasManualCategoryOverride, setHasManualCategoryOverride] = useState<boolean>(false);

  // Compute live balance of selected source account
  const selectedSourceAccount = accounts.find((a) => a.id === accountId);
  const sourceAccountBalancePaise = selectedSourceAccount
    ? AccountingEngine.calculateAccountBalance(selectedSourceAccount, transactions)
    : 0;
  const currentAmountPaise = toPaise(amountStr);
  const isInsufficient =
    (type === 'expense' || type === 'transfer') &&
    currentAmountPaise > sourceAccountBalancePaise &&
    currentAmountPaise > 0;

  // Initialize form on open or editingTransaction change
  useEffect(() => {
    setAutoDetectedCategory(null);
    setHasManualCategoryOverride(false);

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(toRupees(editingTransaction.amount_paise).toString());
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.category_id);
      setAccountId(editingTransaction.account_id);
      setToAccountId(editingTransaction.to_account_id || '');
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.payment_method);
      setNotes(editingTransaction.notes || '');
      setReceiptImage(editingTransaction.receipt_image);
    } else {
      setType(initialType);
      setAmountStr('0');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setReceiptImage(undefined);
      setErrorMsg(null);

      // Default account: Always prioritize Primary Bank
      const primary = accounts.find((a) => a.type === 'bank' && !a.is_archived) || accounts.find((a) => !a.is_archived);
      if (primary) {
        setAccountId(primary.id);
        const second = accounts.find((a) => a.id !== primary.id && !a.is_archived);
        if (second) {
          setToAccountId(second.id);
        }
      }
    }
  }, [isOpen, editingTransaction, initialType, accounts]);

  // Ensure transfer source and destination accounts are always two valid distinct accounts
  useEffect(() => {
    if (type === 'transfer') {
      const activeAccounts = accounts.filter((a) => !a.is_archived);
      if (activeAccounts.length >= 2) {
        if (!accountId || !activeAccounts.some((a) => a.id === accountId)) {
          setAccountId(activeAccounts[0].id);
        }
        if (!toAccountId || toAccountId === accountId || !activeAccounts.some((a) => a.id === toAccountId)) {
          const alternate = activeAccounts.find((a) => a.id !== accountId) || activeAccounts[1];
          if (alternate) {
            setToAccountId(alternate.id);
          }
        }
      }
    }
  }, [type, accountId, toAccountId, accounts]);

  // Account switching handlers that dynamically update paired account to guarantee distinct accounts
  const handleSourceAccountChange = (newSourceId: string) => {
    setAccountId(newSourceId);
    setErrorMsg(null);
    if (type === 'transfer') {
      if (newSourceId === toAccountId || !toAccountId) {
        const other = accounts.find((a) => !a.is_archived && a.id !== newSourceId);
        if (other) {
          setToAccountId(other.id);
        }
      }
    }
  };

  const handleDestinationAccountChange = (newDestId: string) => {
    setToAccountId(newDestId);
    setErrorMsg(null);
    if (newDestId === accountId) {
      const other = accounts.find((a) => !a.is_archived && a.id !== newDestId);
      if (other) {
        setAccountId(other.id);
      }
    }
  };

  const handleSwapTransferAccounts = () => {
    const fromId = accountId;
    const toId = toAccountId;
    if (fromId && toId && fromId !== toId) {
      setAccountId(toId);
      setToAccountId(fromId);
      setErrorMsg(null);
    }
  };

  // Set default category when type changes
  useEffect(() => {
    if (!editingTransaction) {
      const filtered = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));
      if (filtered.length > 0) {
        // If description is present, attempt smart categorization for the new type
        if (description.trim().length >= 2) {
          const match = SmartCategorizer.identifyCategory(description, type, categories, transactions);
          if (match) {
            setCategoryId(match.categoryId);
            setAutoDetectedCategory(match);
            return;
          }
        }
        setCategoryId(filtered[0].id);
        setAutoDetectedCategory(null);
      }
    }
  }, [type, categories, editingTransaction]);

  // Handler for smart expenditure description typing
  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (type === 'transfer') return;

    if (val.trim().length >= 2) {
      const match = SmartCategorizer.identifyCategory(val, type, categories, transactions);
      if (match) {
        setCategoryId(match.categoryId);
        setAutoDetectedCategory(match);
        setHasManualCategoryOverride(false);
        return;
      }
    }
    setAutoDetectedCategory(null);
  };

  // Handler for 1-tap quick expenditure chip selection
  const handleQuickChipClick = (chipLabel: string) => {
    setDescription(chipLabel);
    if (type === 'transfer') return;

    const match = SmartCategorizer.identifyCategory(chipLabel, type, categories, transactions);
    if (match) {
      setCategoryId(match.categoryId);
      setAutoDetectedCategory(match);
      setHasManualCategoryOverride(false);
    }
  };

  // Numeric keypad handlers
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setAmountStr('0');
      return;
    }
    if (val === '⌫') {
      if (amountStr.length <= 1) {
        setAmountStr('0');
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }
    if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
      return;
    }
    if (amountStr === '0') {
      setAmountStr(val);
    } else {
      setAmountStr(amountStr + val);
    }
  };

  const addQuickAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + delta).toString());
  };

  // Receipt image upload handler
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Receipt image must be smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const QUICK_EXPENSE_CHIPS = [
    { name: 'Swiggy', icon: '🍕' },
    { name: 'Biryani', icon: '🍗' },
    { name: 'Zepto', icon: '🥦' },
    { name: 'Uber', icon: '🚗' },
    { name: 'Petrol', icon: '⛽' },
    { name: 'Friend Outing', icon: '👥' },
    { name: 'Lent to Friend', icon: '🤝' },
    { name: 'House Rent', icon: '🏠' },
    { name: 'Amazon', icon: '📦' },
    { name: 'Apollo Pharmacy', icon: '💊' },
    { name: 'Netflix', icon: '🎬' },
    { name: 'Jio Recharge', icon: '📶' },
    { name: 'Airtel Recharge', icon: '📱' },
  ];

  const QUICK_INCOME_CHIPS = [
    { name: 'Salary', icon: '💼' },
    { name: 'Bonus', icon: '🎁' },
    { name: 'Freelance', icon: '💻' },
    { name: 'Interest', icon: '📈' },
    { name: 'Refund', icon: '🔄' },
  ];

  // Execution function for saving transaction
  const executeSave = async (overrideToAccountId?: string) => {
    const amountPaise = toPaise(amountStr);
    const destAccountId = overrideToAccountId || toAccountId;
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          amount_paise: amountPaise,
          description: description.trim(),
          category_id: categoryId || 'cat_exp_1',
          account_id: accountId,
          to_account_id: type === 'transfer' ? destAccountId : undefined,
          date,
          payment_method: paymentMethod,
          notes: notes.trim(),
          receipt_image: receiptImage,
        });
      } else {
        await addTransaction({
          type,
          amount_paise: amountPaise,
          description: description.trim(),
          category_id: categoryId || (type === 'income' ? 'cat_inc_1' : 'cat_exp_1'),
          account_id: accountId,
          to_account_id: type === 'transfer' ? destAccountId : undefined,
          date,
          payment_method: paymentMethod,
          notes: notes.trim(),
          receipt_image: receiptImage,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transaction');
    }
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountPaise = toPaise(amountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Please enter an amount greater than ₹0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please provide a description.');
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    let finalToAccountId = toAccountId;
    if (type === 'transfer') {
      // Auto-reconcile distinct accounts if destination is missing or identical to source
      if (!finalToAccountId || finalToAccountId === accountId) {
        const alt = accounts.find((a) => !a.is_archived && a.id !== accountId);
        if (alt) {
          finalToAccountId = alt.id;
          setToAccountId(alt.id);
        } else {
          setErrorMsg('Please choose two distinct accounts for money transfer.');
          return;
        }
      }
    }

    // Insufficient Balance Protection:
    // If spending or transferring more than available in the account, show Insufficient Balance popup
    if ((type === 'expense' || type === 'transfer') && amountPaise > sourceAccountBalancePaise) {
      setShowInsufficientModal(true);
      return;
    }

    await executeSave(finalToAccountId);
  };

  const filteredCategories = categories.filter((c) => {
    if (type === 'income') return c.type === 'income';
    return c.type === 'expense';
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
      subtitle="Institutional precision entry"
      maxHeight="max-h-[96vh]"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle: EXPENSE, INCOME, TRANSFER */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              type === 'expense'
                ? 'bg-[#FF6868] text-[#090B08] shadow-md'
                : 'text-[#A1A69A] hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 mr-1" />
            EXPENSE
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              type === 'income'
                ? 'bg-[#E7FF32] text-[#090B08] shadow-md'
                : 'text-[#A1A69A] hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            INCOME
          </button>
          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`flex items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              type === 'transfer'
                ? 'bg-[#38BDF8] text-[#090B08] shadow-md'
                : 'text-[#A1A69A] hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
            TRANSFER
          </button>
        </div>

        {/* Live Amount Hero Display */}
        <div className="text-center py-3 bg-[#090B08] border border-[#30352B] rounded-2xl">
          <span className="text-xs uppercase font-medium text-[#A1A69A] tracking-wider">Amount</span>
          <div className="flex items-center justify-center mt-1">
            <span className="text-3xl font-extrabold text-[#E7FF32] mr-1">₹</span>
            <span className="text-4xl font-extrabold text-white tracking-tight num-tabular">
              {amountStr}
            </span>
          </div>

          {/* Quick Amount Addition Pills */}
          <div className="flex items-center justify-center gap-2 mt-3 px-2 flex-wrap">
            {[100, 500, 1000, 2000, 5000].map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => addQuickAmount(pill)}
                className="px-2.5 py-1 text-xs rounded-full bg-[#1C2019] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 border border-[#30352B] transition-colors"
              >
                +{pill}
              </button>
            ))}
          </div>

          {/* Insufficient Balance Live Warning */}
          {isInsufficient && (
            <div className="mt-3 mx-3 py-2 px-3 rounded-xl bg-[#FF6868]/15 border border-[#FF6868]/40 flex items-center justify-center space-x-1.5 text-xs text-[#FF6868] animate-in fade-in duration-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
              <span className="font-semibold truncate">
                Insufficient balance: Available in {selectedSourceAccount?.name} is {formatPaise(sourceAccountBalancePaise)}
              </span>
            </div>
          )}
        </div>

        {/* Description Field with Smart Category Detection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-[#A1A69A]">Description *</label>
            {type !== 'transfer' && (
              <span className="text-[10px] text-[#A1A69A] flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#E7FF32]" />
                <span>Smart category matching active</span>
              </span>
            )}
          </div>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder={
              type === 'expense'
                ? 'e.g. Biryani, Lent to Rahul, Friend outing, Jio recharge, Uber...'
                : type === 'income'
                ? 'e.g. November Salary, Bonus, Freelance design'
                : 'e.g. Move money to savings'
            }
            className="w-full bg-[#1C2019] border border-[#30352B] focus:border-[#E7FF32] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
          />

          {/* Quick Expenditure Chips */}
          {type !== 'transfer' && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {(type === 'income' ? QUICK_INCOME_CHIPS : QUICK_EXPENSE_CHIPS).map((chip) => (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => handleQuickChipClick(chip.name)}
                  className="px-2.5 py-1 text-[11px] rounded-full bg-[#151812] border border-[#30352B] hover:border-[#E7FF32]/60 hover:text-white text-[#A1A69A] whitespace-nowrap flex items-center space-x-1 transition-all active:scale-95 shadow-sm"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account Selection */}
        {type === 'transfer' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                  From Account (Debit) *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => handleSourceAccountChange(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  {accounts.filter((a) => !a.is_archived).map((acc) => {
                    const bal = AccountingEngine.calculateAccountBalance(acc, transactions);
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatPaise(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                  To Account (Credit) *
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => handleDestinationAccountChange(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  {accounts.filter((a) => !a.is_archived).map((acc) => {
                    const bal = AccountingEngine.calculateAccountBalance(acc, transactions);
                    const isSelectedSource = acc.id === accountId;
                    return (
                      <option key={acc.id} value={acc.id} disabled={isSelectedSource}>
                        {acc.name} ({formatPaise(bal)}) {isSelectedSource ? '(Source Account)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Quick Swap Accounts Direction Pill */}
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                onClick={handleSwapTransferAccounts}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#151812] border border-[#30352B] hover:border-[#38BDF8] text-[#A1A69A] hover:text-[#38BDF8] text-[11px] font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Swap Direction</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              {type === 'expense' ? 'Debited From Account *' : 'Credited To Account *'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              {accounts.filter((a) => !a.is_archived).map((acc) => {
                const bal = AccountingEngine.calculateAccountBalance(acc, transactions);
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(bal)})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Category Picker (for Expense & Income) */}
        {type !== 'transfer' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[#A1A69A]">Category *</label>
              {autoDetectedCategory && (
                <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#E7FF32]/15 border border-[#E7FF32]/40 text-[#E7FF32] text-[10px] font-bold animate-in fade-in duration-200">
                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                  <span>Smartly identified: {autoDetectedCategory.categoryName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setHasManualCategoryOverride(true);
                      setAutoDetectedCategory(null);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'bg-[#23281F] border-[#E7FF32] text-[#E7FF32] neon-glow-sm'
                        : 'bg-[#1C2019] border-[#30352B] text-[#A1A69A] hover:text-white'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} color={cat.color} size={14} className="p-1 w-6 h-6" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Date & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              <option value="upi">UPI / QR</option>
              <option value="cash">Cash</option>
              <option value="debit_card">Debit Card</option>
              <option value="credit_card">Credit Card</option>
              <option value="net_banking">Net Banking</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Optional Receipt Attachment & Notes */}
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#1C2019] border border-[#30352B] rounded-xl text-xs text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 cursor-pointer transition-colors">
            <Camera className="w-4 h-4" />
            <span>{receiptImage ? 'Change Receipt' : 'Attach Receipt'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReceiptUpload}
            />
          </label>
          {receiptImage && (
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#E7FF32]">
              <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setReceiptImage(undefined)}
                className="absolute inset-0 bg-black/60 text-white text-[9px] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Compact On-Screen Keypad */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#30352B]/60">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeypadPress(key)}
              className="h-11 rounded-xl bg-[#1C2019] hover:bg-[#23281F] active:bg-[#30352B] text-white font-semibold text-base flex items-center justify-center transition-colors border border-[#30352B]/40"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-[#FF6868]/10 border border-[#FF6868]/30 rounded-xl text-xs text-[#FF6868]">
            {errorMsg}
          </div>
        )}

        {/* Save button */}
        <Button type="submit" variant="primary" fullWidth size="lg">
          <Check className="w-5 h-5 mr-1" />
          {editingTransaction
            ? 'Save Changes'
            : type === 'expense'
            ? 'Confirm & Record Debit'
            : type === 'income'
            ? 'Confirm & Record Credit'
            : 'Execute Transfer'}
        </Button>
      </form>

      {/* Insufficient Balance Protection Alert Popup */}
      <InsufficientBalanceModal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        accountName={selectedSourceAccount?.name || 'Selected Account'}
        availablePaise={sourceAccountBalancePaise}
        requiredPaise={toPaise(amountStr)}
        actionType={type === 'transfer' ? 'transfer' : 'spend'}
        onProceedAnyway={() => {
          setShowInsufficientModal(false);
          executeSave();
        }}
      />
    </Modal>
  );
};

