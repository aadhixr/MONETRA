// MONETRA V3 - Debt & IOUs Management Modal (Money Lent & Borrowed)
import React, { useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, User, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise } from '../../engine/currency';
import type { Debt, DebtType } from '../../types';

interface DebtManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebtManagerModal: React.FC<DebtManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    debts,
    accounts,
    addDebt,
    recordDebtPayment,
    deleteDebt,
  } = useFinancial();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<Debt | null>(null);

  // Form states
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('lent');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Repayment form state
  const [repayAmountStr, setRepayAmountStr] = useState('');
  const [repayAccountId, setRepayAccountId] = useState(accounts[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountPaise = toPaise(amountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Amount must be greater than zero');
      return;
    }
    if (!personName.trim()) {
      setErrorMsg('Person or institution name is required');
      return;
    }

    try {
      await addDebt({
        person_name: personName.trim(),
        type,
        original_amount_paise: amountPaise,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      setShowAddForm(false);
      setPersonName('');
      setAmountStr('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save debt record');
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPay) return;
    setErrorMsg(null);

    const amountPaise = toPaise(repayAmountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Repayment amount must be greater than zero');
      return;
    }

    try {
      await recordDebtPayment(
        selectedDebtForPay.id,
        amountPaise,
        repayAccountId || accounts[0]?.id
      );
      setSelectedDebtForPay(null);
      setRepayAmountStr('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record repayment');
    }
  };

  const totalLentPaise = debts
    .filter((d) => d.type === 'lent' && !d.is_settled)
    .reduce((sum, d) => sum + (d.original_amount_paise - d.repaid_amount_paise), 0);

  const totalBorrowedPaise = debts
    .filter((d) => d.type === 'borrowed' && !d.is_settled)
    .reduce((sum, d) => sum + (d.original_amount_paise - d.repaid_amount_paise), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Debt & Loan Manager"
      subtitle="Track money lent to friends or borrowed from institutions"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#1C2019] border border-[#30352B] rounded-2xl">
            <span className="text-[11px] text-[#A8E66A] font-semibold flex items-center">
              <ArrowDownLeft className="w-3 h-3 mr-1" /> Money to Receive (Lent)
            </span>
            <div className="text-lg font-bold text-white num-tabular mt-1">
              {formatPaise(totalLentPaise)}
            </div>
          </div>

          <div className="p-3 bg-[#1C2019] border border-[#30352B] rounded-2xl">
            <span className="text-[11px] text-[#FF6868] font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-1" /> You Owe (Borrowed)
            </span>
            <div className="text-lg font-bold text-white num-tabular mt-1">
              {formatPaise(totalBorrowedPaise)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            All Records ({debts.length})
          </span>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 rounded-xl bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>
        </div>

        {/* Add Debt Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddDebt}
            className="p-4 bg-[#151812] border border-[#E7FF32]/40 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
              <span className="text-xs font-bold text-white">New Debt / Loan</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-[#A1A69A] hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-[#1C2019] border border-[#30352B] rounded-xl">
              <button
                type="button"
                onClick={() => setType('lent')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  type === 'lent' ? 'bg-[#A8E66A] text-[#090B08]' : 'text-[#A1A69A]'
                }`}
              >
                I Lent Money
              </button>
              <button
                type="button"
                onClick={() => setType('borrowed')}
                className={`py-1.5 rounded-lg text-xs font-bold ${
                  type === 'borrowed' ? 'bg-[#FF6868] text-[#090B08]' : 'text-[#A1A69A]'
                }`}
              >
                I Borrowed Money
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#A1A69A] mb-1">Person or Institution *</label>
              <input
                type="text"
                required
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Rahul, Axis Bank"
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
                  placeholder="5000"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A1A69A] mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
            </div>

            {errorMsg && <div className="text-xs text-[#FF6868]">{errorMsg}</div>}

            <Button type="submit" variant="primary" fullWidth size="sm">
              Save Record
            </Button>
          </form>
        )}

        {/* Repayment Modal */}
        {selectedDebtForPay && (
          <form
            onSubmit={handleRepay}
            className="p-4 bg-[#151812] border border-[#E7FF32] rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
              <span className="text-xs font-bold text-white">
                Record Payment for {selectedDebtForPay.person_name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDebtForPay(null)}
                className="text-xs text-[#A1A69A]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#A1A69A] mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                step="any"
                required
                value={repayAmountStr}
                onChange={(e) => setRepayAmountStr(e.target.value)}
                placeholder="2000"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-sm font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A1A69A] mb-1">Associated Account</label>
              <select
                value={repayAccountId}
                onChange={(e) => setRepayAccountId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="primary" fullWidth size="sm">
              Confirm Payment
            </Button>
          </form>
        )}

        {/* Debts List */}
        <div className="space-y-2">
          {debts.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#A1A69A]">
              No active debts or IOUs found.
            </div>
          ) : (
            debts.map((debt) => {
              const remaining = Math.max(0, debt.original_amount_paise - debt.repaid_amount_paise);
              const isLent = debt.type === 'lent';

              return (
                <div
                  key={debt.id}
                  className="p-3.5 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isLent ? 'bg-[#A8E66A]/15 text-[#A8E66A]' : 'bg-[#FF6868]/15 text-[#FF6868]'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">{debt.person_name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isLent ? 'bg-[#A8E66A]/20 text-[#A8E66A]' : 'bg-[#FF6868]/20 text-[#FF6868]'
                          }`}
                        >
                          {isLent ? 'Lent' : 'Borrowed'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A69A] mt-0.5">
                        {debt.is_settled ? (
                          <span className="text-[#A8E66A] flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Fully Settled
                          </span>
                        ) : (
                          `Remaining: ${formatPaise(remaining)}`
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!debt.is_settled && (
                      <button
                        onClick={() => {
                          setSelectedDebtForPay(debt);
                          setRepayAmountStr((remaining / 100).toString());
                        }}
                        className="px-2.5 py-1 rounded-full bg-[#E7FF32] text-[#090B08] text-[11px] font-bold hover:bg-[#C9E927]"
                      >
                        Repay
                      </button>
                    )}
                    <button
                      onClick={() => deleteDebt(debt.id)}
                      className="p-1 text-[#A1A69A] hover:text-[#FF6868]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
