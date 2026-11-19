// AURIX - Home Quick Action Buttons
import React from 'react';
import { Minus, Plus, ArrowRightLeft, Landmark } from 'lucide-react';
import type { TransactionType } from '../../types';

interface QuickActionsProps {
  onTriggerAction: (type: TransactionType) => void;
  onOpenSalary: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onTriggerAction,
  onOpenSalary,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2.5 my-3">
      {/* 1. Add Expense (Debit) */}
      <button
        onClick={() => onTriggerAction('expense')}
        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-[#1C2019] border border-[#30352B] hover:border-[#FF6868]/60 hover:bg-[#23281F] transition-all group active:scale-95 shadow-sm"
      >
        <div className="w-10 h-10 rounded-full bg-[#FF6868]/15 text-[#FF6868] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(255,104,104,0.15)]">
          <Minus className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-bold text-white">Expense</span>
        <span className="text-[9px] text-[#FF6868] font-semibold mt-0.5">Debit</span>
      </button>

      {/* 2. Add Income (Credit) */}
      <button
        onClick={() => onTriggerAction('income')}
        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-[#1C2019] border border-[#30352B] hover:border-[#E7FF32]/60 hover:bg-[#23281F] transition-all group active:scale-95 shadow-sm"
      >
        <div className="w-10 h-10 rounded-full bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(231,255,50,0.15)]">
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-bold text-white">Income</span>
        <span className="text-[9px] text-[#E7FF32] font-semibold mt-0.5">Credit</span>
      </button>

      {/* 3. Transfer Money */}
      <button
        onClick={() => onTriggerAction('transfer')}
        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-[#1C2019] border border-[#30352B] hover:border-[#38BDF8]/60 hover:bg-[#23281F] transition-all group active:scale-95 shadow-sm"
      >
        <div className="w-10 h-10 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(56,189,248,0.15)]">
          <ArrowRightLeft className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span className="text-[11px] font-bold text-white">Transfer</span>
        <span className="text-[9px] text-[#38BDF8] font-semibold mt-0.5">Inter-Acc</span>
      </button>

      {/* 4. Salary & Streams */}
      <button
        onClick={onOpenSalary}
        className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-[#1C2019] border border-[#30352B] hover:border-[#A8E66A]/60 hover:bg-[#23281F] transition-all group active:scale-95 shadow-sm"
      >
        <div className="w-10 h-10 rounded-full bg-[#A8E66A]/15 text-[#A8E66A] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(168,230,106,0.15)]">
          <Landmark className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span className="text-[11px] font-bold text-white">Salary</span>
        <span className="text-[9px] text-[#A8E66A] font-semibold mt-0.5">Streams</span>
      </button>
    </div>
  );
};

