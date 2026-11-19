// AURIX - Full Transaction History & Filter Modal (Supports Filtering by Month)
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowRightLeft, Image, Trash2, Edit2, Copy, Download, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CategoryIcon } from '../common/CategoryIcon';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise } from '../../engine/currency';
import { formatMonthShort } from '../../engine/dateUtils';
import { ExportService } from '../../services/exportService';
import type { Transaction, TransactionType } from '../../types';

interface TransactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditTransaction: (txn: Transaction) => void;
}

export const TransactionListModal: React.FC<TransactionListModalProps> = ({
  isOpen,
  onClose,
  onEditTransaction,
}) => {
  const {
    transactions,
    categories,
    accounts,
    deleteTransaction,
    duplicateTransaction,
    currentMonth,
  } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');

  // Sync filterMonth when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilterMonth(currentMonth);
    }
  }, [isOpen, currentMonth]);

  // Extract all unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonth);
    transactions.forEach((t) => {
      if (!t.is_deleted && t.date) {
        months.add(t.date.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions, currentMonth]);

  const filtered = transactions
    .filter((t) => {
      if (t.is_deleted) return false;

      // Month filter
      if (filterMonth !== 'all' && !t.date.startsWith(filterMonth)) return false;

      // Search query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchAmt = (t.amount_paise / 100).toString().includes(q);
        if (!matchDesc && !matchNotes && !matchAmt) return false;
      }

      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Category filter
      if (filterCatId !== 'all' && t.category_id !== filterCatId) return false;

      // Account filter
      if (filterAccountId !== 'all' && t.account_id !== filterAccountId && t.to_account_id !== filterAccountId) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

  // Ledger Cashflow Totals for filtered view
  const totalIncomingPaise = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);
  }, [filtered]);

  const totalSpentPaise = useMemo(() => {
    return filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount_paise || 0), 0);
  }, [filtered]);

  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Records"
      subtitle={`${filtered.length} entries ${filterMonth !== 'all' ? `in ${formatMonthShort(filterMonth)}` : 'across all history'}`}
      maxHeight="max-h-[96vh]"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-3">
        {/* Month Quick Toggle Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setFilterMonth(currentMonth)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterMonth === currentMonth
                ? 'bg-[#E7FF32] text-[#090B08] font-bold shadow-[0_0_10px_rgba(231,255,50,0.3)]'
                : 'bg-[#1C2019] text-[#A1A69A] hover:text-white border border-[#30352B]'
            }`}
          >
            This Month ({formatMonthShort(currentMonth)})
          </button>
          <button
            onClick={() => setFilterMonth('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterMonth === 'all'
                ? 'bg-[#E7FF32] text-[#090B08] font-bold shadow-[0_0_10px_rgba(231,255,50,0.3)]'
                : 'bg-[#1C2019] text-[#A1A69A] hover:text-white border border-[#30352B]'
            }`}
          >
            All History ({transactions.filter((t) => !t.is_deleted).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#A1A69A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description or amount..."
            className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Month selector */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-[#1C2019] border border-[#30352B] rounded-xl px-2 py-2 text-[11px] text-white"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthShort(m)}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#1C2019] border border-[#30352B] rounded-xl px-2 py-2 text-[11px] text-white"
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </select>

          {/* Category filter */}
          <select
            value={filterCatId}
            onChange={(e) => setFilterCatId(e.target.value)}
            className="bg-[#1C2019] border border-[#30352B] rounded-xl px-2 py-2 text-[11px] text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account filter */}
          <select
            value={filterAccountId}
            onChange={(e) => setFilterAccountId(e.target.value)}
            className="bg-[#1C2019] border border-[#30352B] rounded-xl px-2 py-2 text-[11px] text-white"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ledger Totals Banner: Total Money Incoming vs Total Money Spent */}
        <div className="p-3 bg-[#151812] border border-[#30352B] rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-2.5 shadow-inner">
          <div className="p-2.5 bg-[#1C2019] border border-[#30352B] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#A8E66A] uppercase tracking-wider font-bold block">
                Total Incoming
              </span>
              <span className="text-sm sm:text-base font-black text-[#A8E66A] num-tabular">
                +{formatPaise(totalIncomingPaise)}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#A8E66A]/10 text-[#A8E66A] flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 bg-[#1C2019] border border-[#30352B] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#FF6868] uppercase tracking-wider font-bold block">
                Total Spent
              </span>
              <span className="text-sm sm:text-base font-black text-[#FF6868] num-tabular">
                -{formatPaise(totalSpentPaise)}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#FF6868]/10 text-[#FF6868] flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 bg-[#1C2019] border border-[#30352B] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#A1A69A] uppercase tracking-wider font-bold block">
                Net Balance Flow
              </span>
              <span className={`text-sm sm:text-base font-black num-tabular ${totalIncomingPaise >= totalSpentPaise ? 'text-[#E7FF32]' : 'text-[#FF6868]'}`}>
                {formatPaise(totalIncomingPaise - totalSpentPaise, { showSign: true })}
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#E7FF32]/10 text-[#E7FF32] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black">NET</span>
            </div>
          </div>
        </div>

        {/* Export CSV action */}
        <div className="flex justify-end">
          <button
            onClick={() => ExportService.exportTransactionsCSV(filtered, accounts, categories)}
            className="text-xs text-[#E7FF32] hover:underline flex items-center space-x-1 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filtered list */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#A1A69A]">
              No transactions match your search filters.
            </div>
          ) : (
            filtered.map((t) => {
              const cat = getCategory(t.category_id);
              const acc = getAccount(t.account_id);
              const toAcc = t.to_account_id ? getAccount(t.to_account_id) : null;
              const isExpense = t.type === 'expense';
              const isIncome = t.type === 'income';

              return (
                <div
                  key={t.id}
                  className="p-3 bg-[#1C2019] border border-[#30352B] hover:border-[#E7FF32]/30 rounded-2xl flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    {t.type === 'transfer' ? (
                      <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                    ) : (
                      <CategoryIcon
                        name={cat?.icon || 'CircleDollarSign'}
                        color={cat?.color}
                        size={18}
                        className="w-9 h-9 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white truncate">{t.description}</span>
                        {isExpense && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#FF6868]/15 border border-[#FF6868]/40 text-[#FF6868] text-[8px] font-extrabold tracking-wider">
                            DEBITED
                          </span>
                        )}
                        {isIncome && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#A8E66A]/15 border border-[#A8E66A]/40 text-[#A8E66A] text-[8px] font-extrabold tracking-wider">
                            CREDITED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A1A69A] mt-0.5 truncate">
                        {t.date} • {isExpense ? `Debited from ${acc?.name || 'Cash'}` : isIncome ? `Credited to ${acc?.name || 'Bank'}` : `${acc?.name} → ${toAcc?.name}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs font-extrabold num-tabular block ${
                          isExpense
                            ? 'text-[#FF6868]'
                            : isIncome
                            ? 'text-[#E7FF32]'
                            : 'text-[#38BDF8]'
                        }`}
                      >
                        {isExpense ? '- ' : isIncome ? '+ ' : ''}
                        {formatPaise(t.amount_paise)}
                      </span>
                      <span className="text-[9px] text-[#A8E66A] block">✓ OK</span>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onEditTransaction(t);
                      }}
                      className="p-1 text-[#A1A69A] hover:text-[#E7FF32]"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="p-1 text-[#A1A69A] hover:text-[#FF6868]"
                      title="Delete"
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

