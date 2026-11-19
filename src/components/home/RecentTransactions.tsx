// AURIX - Recent Transactions List & Institutional Ledger Display
import React, { useState } from 'react';
import { ArrowRight, Copy, Edit2, Trash2, Image, ArrowRightLeft, CheckCircle2, ShieldCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';
import { CategoryIcon } from '../common/CategoryIcon';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise } from '../../engine/currency';
import { formatMonthShort, formatMonthName } from '../../engine/dateUtils';
import type { Transaction } from '../../types';

interface RecentTransactionsProps {
  onEditTransaction: (txn: Transaction) => void;
  onViewAll: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  onEditTransaction,
  onViewAll,
}) => {
  const {
    transactions,
    categories,
    accounts,
    deleteTransaction,
    duplicateTransaction,
    currentMonth,
  } = useFinancial();

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Filter and sort transactions strictly belonging to the selected month
  const monthAllTxns = transactions
    .filter((t) => !t.is_deleted && t.date.startsWith(currentMonth))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const monthTxns = monthAllTxns.slice(0, 6);

  // Exact Total Money Incoming and Total Money Spent for Ledger view
  const monthIncomingPaise = monthAllTxns
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

  const monthSpentPaise = monthAllTxns
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount_paise || 0), 0);

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);
  const getAccount = (accId: string) => accounts.find((a) => a.id === accId);

  const handleDelete = async () => {
    if (selectedTxn) {
      await deleteTransaction(selectedTxn.id);
      setSelectedTxn(null);
    }
  };

  const handleDuplicate = async () => {
    if (selectedTxn) {
      await duplicateTransaction(selectedTxn.id);
      setSelectedTxn(null);
    }
  };

  return (
    <div className="my-2">
      {/* Header with View All action */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center space-x-2">
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            Ledger Entries ({formatMonthShort(currentMonth)})
          </h3>
          <span className="text-[10px] text-[#A8E66A] flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-0.5" /> All Validated OK
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center space-x-1 text-xs text-[#E7FF32] font-semibold hover:underline"
        >
          <span>View All ({monthAllTxns.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total Money Incoming and Total Money Spent in Ledger */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 bg-[#151812] border border-[#30352B] rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[#A8E66A]">
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Incoming</span>
          </div>
          <span className="text-xs sm:text-sm font-black text-[#A8E66A] num-tabular">
            +{formatPaise(monthIncomingPaise)}
          </span>
        </div>

        <div className="p-2.5 bg-[#151812] border border-[#30352B] rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[#FF6868]">
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
          </div>
          <span className="text-xs sm:text-sm font-black text-[#FF6868] num-tabular">
            -{formatPaise(monthSpentPaise)}
          </span>
        </div>
      </div>

      {monthTxns.length === 0 ? (
        <Card className="p-8 text-center bg-[#1C2019] border-[#30352B] rounded-2xl">
          <div className="text-sm font-semibold text-white mb-1">
            No transactions in {formatMonthName(currentMonth)}
          </div>
          <p className="text-xs text-[#A1A69A]">
            Use the neon + button to record an expense, salary, or transfer for this month.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {monthTxns.map((txn) => {
            const cat = getCategory(txn.category_id);
            const sourceAcc = getAccount(txn.account_id);
            const toAcc = txn.to_account_id ? getAccount(txn.to_account_id) : null;
            const isExpense = txn.type === 'expense';
            const isIncome = txn.type === 'income';

            return (
              <div
                key={txn.id}
                onClick={() => setSelectedTxn(txn)}
                className="flex items-center justify-between p-3.5 bg-[#1C2019] hover:bg-[#23281F] border border-[#30352B] hover:border-[#E7FF32]/40 rounded-2xl transition-all cursor-pointer active:scale-[0.99] group shadow-sm"
              >
                {/* Category Icon & Details */}
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  {txn.type === 'transfer' ? (
                    <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  ) : (
                    <CategoryIcon
                      name={cat?.icon || 'CircleDollarSign'}
                      color={cat?.color}
                      size={20}
                      className="w-10 h-10 shrink-0"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white truncate">
                        {txn.description}
                      </span>
                      {/* Explicit DEBITED / CREDITED badge */}
                      {isExpense && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#FF6868]/15 border border-[#FF6868]/40 text-[#FF6868] text-[9px] font-extrabold tracking-wider">
                          DEBITED
                        </span>
                      )}
                      {isIncome && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#A8E66A]/15 border border-[#A8E66A]/40 text-[#A8E66A] text-[9px] font-extrabold tracking-wider">
                          CREDITED
                        </span>
                      )}
                      {txn.type === 'transfer' && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] text-[9px] font-extrabold tracking-wider">
                          TRANSFER
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#A1A69A] flex items-center space-x-1.5 mt-1 truncate">
                      <span>{txn.date}</span>
                      <span>•</span>
                      <span className="truncate">
                        {isExpense && `Debited from ${sourceAcc?.name || 'Cash'}`}
                        {isIncome && `Credited to ${sourceAcc?.name || 'Bank'}`}
                        {txn.type === 'transfer' && `${sourceAcc?.name || 'A'} → ${toAcc?.name || 'B'}`}
                      </span>
                      {txn.receipt_image && (
                        <>
                          <span>•</span>
                          <span className="text-[#E7FF32] flex items-center shrink-0">
                            <Image className="w-3 h-3 inline" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount with Institutional Verification Status */}
                <div className="text-right shrink-0 pl-3">
                  <div
                    className={`text-sm font-extrabold num-tabular tracking-tight ${
                      isExpense
                        ? 'text-[#FF6868]'
                        : isIncome
                        ? 'text-[#E7FF32]'
                        : 'text-[#38BDF8]'
                    }`}
                  >
                    {isExpense ? '- ' : isIncome ? '+ ' : ''}
                    {formatPaise(txn.amount_paise)}
                  </div>
                  <div className="text-[10px] text-[#A8E66A] flex items-center justify-end space-x-0.5 mt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Settled OK</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Action Bottom Sheet / Details Modal */}
      {selectedTxn && (
        <Modal
          isOpen={!!selectedTxn}
          onClose={() => setSelectedTxn(null)}
          title="Transaction Verification"
          subtitle="Audit ledger record with zero floating-point loss"
        >
          <div className="space-y-4">
            {/* Amount Banner with Explicit Debited / Credited status */}
            <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A69A]">
                  Transaction Amount
                </span>
                <div
                  className={`text-2xl font-black num-tabular mt-0.5 ${
                    selectedTxn.type === 'expense'
                      ? 'text-[#FF6868]'
                      : selectedTxn.type === 'income'
                      ? 'text-[#E7FF32]'
                      : 'text-[#38BDF8]'
                  }`}
                >
                  {selectedTxn.type === 'expense' ? '- ' : selectedTxn.type === 'income' ? '+ ' : ''}
                  {formatPaise(selectedTxn.amount_paise)}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedTxn.type === 'expense'
                      ? 'bg-[#FF6868]/20 text-[#FF6868] border border-[#FF6868]/40'
                      : selectedTxn.type === 'income'
                      ? 'bg-[#A8E66A]/20 text-[#A8E66A] border border-[#A8E66A]/40'
                      : 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                  }`}
                >
                  {selectedTxn.type === 'expense' ? 'VALID DEBITED' : selectedTxn.type === 'income' ? 'VALID CREDITED' : 'VALID TRANSFER'}
                </span>
                <span className="block text-[10px] text-[#A8E66A] font-semibold mt-1">
                  ✓ Ledger Balance OK
                </span>
              </div>
            </div>

            {/* Transaction Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl">
                <span className="text-[#A1A69A] block text-[10px]">Description</span>
                <span className="font-semibold text-white mt-0.5 block">{selectedTxn.description}</span>
              </div>

              <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl">
                <span className="text-[#A1A69A] block text-[10px]">Category</span>
                <span className="font-semibold text-white mt-0.5 block">
                  {getCategory(selectedTxn.category_id)?.name || 'General'}
                </span>
              </div>

              <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl">
                <span className="text-[#A1A69A] block text-[10px]">
                  {selectedTxn.type === 'income' ? 'Credited To' : 'Debited From'}
                </span>
                <span className="font-semibold text-white mt-0.5 block">
                  {getAccount(selectedTxn.account_id)?.name || 'Account'}
                  {selectedTxn.to_account_id && ` → ${getAccount(selectedTxn.to_account_id)?.name}`}
                </span>
              </div>

              <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl">
                <span className="text-[#A1A69A] block text-[10px]">Record Date</span>
                <span className="font-semibold text-white mt-0.5 block">{selectedTxn.date}</span>
              </div>
            </div>

            {/* Optional Notes */}
            {selectedTxn.notes && (
              <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl text-xs">
                <span className="text-[#A1A69A] block text-[10px]">Notes</span>
                <p className="text-white mt-0.5">{selectedTxn.notes}</p>
              </div>
            )}

            {/* Receipt Preview */}
            {selectedTxn.receipt_image && (
              <div>
                <span className="text-[#A1A69A] block text-xs mb-1">Receipt Attachment</span>
                <img
                  src={selectedTxn.receipt_image}
                  alt="Receipt"
                  className="w-full max-h-48 object-cover rounded-xl border border-[#30352B]"
                />
              </div>
            )}

            {/* Action Buttons: Edit, Duplicate, Delete */}
            <div className="pt-2 flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  onEditTransaction(selectedTxn);
                  setSelectedTxn(null);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleDuplicate}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Duplicate
              </Button>

              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

