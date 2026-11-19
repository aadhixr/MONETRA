// AURIX - Recurring Bills & Subscription Tracker Modal
import React, { useState } from 'react';
import { Plus, Receipt, CheckCircle, Clock, Calendar, Check, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InsufficientBalanceModal } from '../common/InsufficientBalanceModal';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import type { RecurringBill, BillFrequency } from '../../types';

interface RecurringBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecurringBillsModal: React.FC<RecurringBillsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    recurringBills,
    categories,
    accounts,
    transactions,
    addRecurringBill,
    payRecurringBill,
    deleteRecurringBill,
  } = useFinancial();

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [insufficientInfo, setInsufficientInfo] = useState<{
    isOpen: boolean;
    accountName: string;
    availablePaise: number;
    requiredPaise: number;
  }>({
    isOpen: false,
    accountName: '',
    availablePaise: 0,
    requiredPaise: 0,
  });

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountPaise = toPaise(amountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Amount must be greater than zero');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Bill title is required');
      return;
    }

    try {
      await addRecurringBill({
        title: title.trim(),
        amount_paise: amountPaise,
        category_id: categoryId || 'cat_exp_12', // Subscriptions default
        frequency,
        due_day_of_month: dueDay,
        next_due_date: nextDueDate,
        account_id: accountId || undefined,
        is_active: true,
      });

      setShowAddForm(false);
      setTitle('');
      setAmountStr('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add bill');
    }
  };

  const PRESET_BILLS = [
    { title: 'House Rent', category: 'Rent' },
    { title: 'WiFi / Fiber', category: 'Internet' },
    { title: 'Mobile Recharge', category: 'Mobile Recharge' },
    { title: 'Netflix / Hotstar', category: 'Subscriptions' },
    { title: 'Electricity Bill', category: 'Electricity' },
    { title: 'Gym Membership', category: 'Personal Care' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recurring Bills & Subscriptions"
      subtitle="Track fixed obligations without accidental duplicate debits"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Header Action */}
        <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Active Rules ({recurringBills.length})
          </span>
          <button
            onClick={() => {
              if (categories.length > 0) setCategoryId(categories[0].id);
              setShowAddForm(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bill</span>
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddBill}
            className="p-4 bg-[#151812] border border-[#E7FF32]/40 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
              <span className="text-xs font-bold text-white">New Recurring Bill</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-[#A1A69A] hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_BILLS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTitle(p.title);
                    const matchedCat = categories.find((c) => c.name === p.category);
                    if (matchedCat) setCategoryId(matchedCat.id);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#1C2019] border border-[#30352B] text-xs text-[#A1A69A] hover:text-[#E7FF32] whitespace-nowrap"
                >
                  {p.title}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-[#A1A69A] mb-1">Bill Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broadband Fiber"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#A1A69A] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="999"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A69A] mb-1">Recurrence *</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-[#A1A69A] mb-1">Next Due Date *</label>
                <input
                  type="date"
                  required
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A69A] mb-1">Payment Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMsg && <div className="text-xs text-[#FF6868]">{errorMsg}</div>}

            <Button type="submit" variant="primary" fullWidth size="sm">
              Save Recurring Bill
            </Button>
          </form>
        )}

        {/* Bills list */}
        <div className="space-y-2">
          {recurringBills.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#A1A69A]">
              No recurring bills added yet.
            </div>
          ) : (
            recurringBills.map((bill) => (
              <div
                key={bill.id}
                className="p-3.5 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E7FF32]/10 text-[#E7FF32] flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{bill.title}</div>
                    <div className="text-[11px] text-[#A1A69A] mt-0.5">
                      Next Due: {bill.next_due_date} ({bill.frequency})
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white num-tabular">
                    {formatPaise(bill.amount_paise)}
                  </span>
                  <button
                    onClick={() => {
                      if (accounts.length > 0) {
                        const targetId = bill.account_id || accounts[0].id;
                        const targetAcc = accounts.find((a) => a.id === targetId);
                        const bal = targetAcc ? AccountingEngine.calculateAccountBalance(targetAcc, transactions) : 0;
                        if (bill.amount_paise > bal) {
                          setInsufficientInfo({
                            isOpen: true,
                            accountName: targetAcc?.name || 'Account',
                            availablePaise: bal,
                            requiredPaise: bill.amount_paise,
                          });
                          return;
                        }
                        payRecurringBill(bill.id, targetId);
                      }
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#E7FF32] text-[#090B08] text-[11px] font-bold hover:bg-[#C9E927]"
                  >
                    Pay
                  </button>
                  <button
                    onClick={() => deleteRecurringBill(bill.id)}
                    className="p-1 text-[#A1A69A] hover:text-[#FF6868]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Insufficient Balance Protection Popup */}
      <InsufficientBalanceModal
        isOpen={insufficientInfo.isOpen}
        onClose={() => setInsufficientInfo((prev) => ({ ...prev, isOpen: false }))}
        accountName={insufficientInfo.accountName}
        availablePaise={insufficientInfo.availablePaise}
        requiredPaise={insufficientInfo.requiredPaise}
        actionType="spend"
      />
    </Modal>
  );
};

