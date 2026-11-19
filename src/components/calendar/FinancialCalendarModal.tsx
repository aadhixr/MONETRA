// AURIX - Financial Calendar Modal
import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Dot } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise } from '../../engine/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import { getPreviousMonth, getNextMonth } from '../../engine/dateUtils';

interface FinancialCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialCalendarModal: React.FC<FinancialCalendarModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { transactions, categories, currentMonth, setCurrentMonth } = useFinancial();

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const nextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  // Transactions mapped by day
  const txnsByDate = transactions.reduce<Record<string, typeof transactions>>((acc, t) => {
    if (!t.is_deleted) {
      acc[t.date] = acc[t.date] || [];
      acc[t.date].push(t);
    }
    return acc;
  }, {});

  // Day transactions for selectedDate
  const dayTxns = txnsByDate[selectedDate] || [];
  const dayExpensePaise = dayTxns
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount_paise, 0);
  const dayIncomePaise = dayTxns
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount_paise, 0);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Calendar"
      subtitle="Day-by-day cashflow matrix"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Month Navigator Header */}
        <div className="flex items-center justify-between p-2.5 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <button onClick={prevMonth} className="p-1.5 text-[#A1A69A] hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 text-[#A1A69A] hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#1C2019] border border-[#30352B] rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] text-[#A1A69A] font-semibold">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Blank cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-9" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayStr = `${currentMonth}-${dayNum.toString().padStart(2, '0')}`;
              const hasTxns = (txnsByDate[dayStr] || []).length > 0;
              const isSelected = selectedDate === dayStr;

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(dayStr)}
                  className={`h-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold relative transition-all ${
                    isSelected
                      ? 'bg-[#E7FF32] text-[#090B08] shadow-[0_0_8px_#E7FF32]'
                      : 'text-white hover:bg-[#23281F]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasTxns && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-[#090B08]' : 'bg-[#E7FF32]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Transactions Log */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-white uppercase tracking-wider">
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <div className="space-x-2 text-[11px]">
              {dayIncomePaise > 0 && (
                <span className="text-[#A8E66A]">+{formatPaise(dayIncomePaise)}</span>
              )}
              {dayExpensePaise > 0 && (
                <span className="text-[#FF6868]">-{formatPaise(dayExpensePaise)}</span>
              )}
            </div>
          </div>

          {dayTxns.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#A1A69A] bg-[#1C2019] border border-[#30352B] rounded-2xl">
              No transactions recorded for this day.
            </div>
          ) : (
            dayTxns.map((t) => {
              const cat = categories.find((c) => c.id === t.category_id);
              return (
                <div
                  key={t.id}
                  className="p-3 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <CategoryIcon
                      name={cat?.icon || 'CircleDollarSign'}
                      color={cat?.color}
                      size={16}
                      className="w-8 h-8 p-1.5"
                    />
                    <div>
                      <span className="font-bold text-white block">{t.description}</span>
                      <span className="text-[10px] text-[#A1A69A]">{cat?.name}</span>
                    </div>
                  </div>

                  <span
                    className={`font-bold num-tabular ${
                      t.type === 'expense'
                        ? 'text-[#FF6868]'
                        : t.type === 'income'
                        ? 'text-[#E7FF32]'
                        : 'text-[#38BDF8]'
                    }`}
                  >
                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                    {formatPaise(t.amount_paise)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

