// MONETRA V3 - Salary & Income Stream Management
// Supports Exact and Variable Salary Dates (e.g. 5th, 6th, 7th, or 4-day flexible window)
import React, { useState } from 'react';
import { Landmark, Plus, CheckCircle2, Clock, Calendar, Briefcase, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise, toRupees } from '../../engine/currency';
import { formatMonthShort } from '../../engine/dateUtils';
import type { SalaryRecord } from '../../types';

interface SalaryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalaryManagerModal: React.FC<SalaryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    salaryRecords,
    accounts,
    currentMonth,
    addSalaryRecord,
    markSalaryReceived,
    deleteSalaryRecord,
    settings,
  } = useFinancial();

  const [showAddForm, setShowAddForm] = useState(false);
  const [employer, setEmployer] = useState('');
  const [amountStr, setAmountStr] = useState('');
  
  // Date and Variable Window States
  const defaultDay = settings?.default_salary_day || 5;
  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);
  const [creditDate, setCreditDate] = useState(`${currentMonth}-${String(defaultDay).padStart(2, '0')}`);
  const [isVariableWindow, setIsVariableWindow] = useState<boolean>(true);
  const [windowDays, setWindowDays] = useState<number>(4);

  const [accountId, setAccountId] = useState(() => accounts.find((a) => a.type === 'bank' && !a.is_archived)?.id || accounts[0]?.id || '');
  const [status, setStatus] = useState<'expected' | 'received'>('received');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<'month' | 'all'>('month');

  const COMMON_DAYS = [1, 5, 6, 7, 10, 25, 28, 30];

  const handleOpenAdd = () => {
    const primary = accounts.find((a) => a.type === 'bank' && !a.is_archived) || accounts.find((a) => !a.is_archived);
    if (primary) setAccountId(primary.id);
    const day = settings?.default_salary_day || 5;
    setSelectedDay(day);
    setCreditDate(`${currentMonth}-${String(day).padStart(2, '0')}`);
    setShowAddForm(true);
  };

  const handleSelectDay = (dayNum: number) => {
    setSelectedDay(dayNum);
    const dayPadded = String(dayNum).padStart(2, '0');
    setCreditDate(`${currentMonth}-${dayPadded}`);
  };

  const startDay = selectedDay;
  const endDay = Math.min(31, startDay + windowDays - 1);
  const variableWindowStr = `${startDay}th – ${endDay}th (${windowDays}-day window)`;

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amountPaise = toPaise(amountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Salary amount must be greater than zero');
      return;
    }
    if (!employer.trim()) {
      setErrorMsg('Please specify employer or source');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select credited account');
      return;
    }

    try {
      const monthYear = creditDate ? creditDate.slice(0, 7) : currentMonth;
      await addSalaryRecord({
        employer: employer.trim(),
        amount_paise: amountPaise,
        credit_date: creditDate,
        account_id: accountId,
        month_year: monthYear,
        status,
        credit_day_of_month: selectedDay,
        variable_window: isVariableWindow ? variableWindowStr : undefined,
        notes: notes.trim() || undefined,
      });

      setShowAddForm(false);
      setEmployer('');
      setAmountStr('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save salary record');
    }
  };

  // Group salaries by year for annual view
  const currentYear = currentMonth.slice(0, 4);
  const yearSalaries = salaryRecords.filter(
    (s) => s.status === 'received' && s.credit_date.startsWith(currentYear)
  );
  const totalAnnualSalaryPaise = yearSalaries.reduce((sum, s) => sum + s.amount_paise, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary & Income Management"
      subtitle="Configure fixed, flexible, or variable credit dates with institutional precision"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Annual Salary Hero Banner */}
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#A1A69A] font-semibold">
              {currentYear} Received Salary
            </span>
            <div className="text-2xl font-extrabold text-[#E7FF32] num-tabular mt-0.5">
              {formatPaise(totalAnnualSalaryPaise)}
            </div>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-xl bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] transition-all flex items-center space-x-1 shadow-[0_0_12px_rgba(231,255,50,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Salary</span>
          </button>
        </div>

        {/* Add Salary Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSalary}
            className="p-4 bg-[#151812] border border-[#E7FF32]/40 rounded-2xl space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                New Salary / Income Stream
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-[#A1A69A] hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A69A] mb-1">
                Employer / Income Source *
              </label>
              <input
                type="text"
                required
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="e.g. Google, Infosys, Client Project"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32] num-tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Credit Date *</label>
                <input
                  type="date"
                  required
                  value={creditDate}
                  onChange={(e) => setCreditDate(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
            </div>

            {/* Quick Day Chips & Variable Window */}
            <div className="p-3 bg-[#1C2019] border border-[#30352B] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#E7FF32]" />
                  <span>Quick Credit Day (e.g. 5th, 6th, 7th):</span>
                </span>
                <span className="text-[10px] text-[#E7FF32] font-semibold">
                  Selected: {selectedDay}th
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COMMON_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedDay === d
                        ? 'bg-[#E7FF32] text-[#090B08]'
                        : 'bg-[#151812] text-white border border-[#30352B] hover:border-[#E7FF32]/40'
                    }`}
                  >
                    {d}th
                  </button>
                ))}
              </div>

              {/* Variable Window Toggle */}
              <div className="pt-2 border-t border-[#30352B]/60 space-y-1.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVariableWindow}
                    onChange={(e) => setIsVariableWindow(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#E7FF32]"
                  />
                  <span className="text-xs text-white font-medium">
                    Variable Window (e.g. 4-day flex span)
                  </span>
                </label>

                {isVariableWindow && (
                  <div className="flex items-center justify-between text-xs text-[#A8E66A] pt-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Window: <strong>{variableWindowStr}</strong></span>
                    </span>
                    <div className="flex items-center space-x-1">
                      {[2, 3, 4, 5].map((span) => (
                        <button
                          key={span}
                          type="button"
                          onClick={() => setWindowDays(span)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            windowDays === span
                              ? 'bg-[#E7FF32] text-[#090B08]'
                              : 'bg-[#151812] text-[#A1A69A]'
                          }`}
                        >
                          {span}d
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">
                  Credited Account *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  {accounts.filter((a) => !a.is_archived).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">
                  Credit Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  <option value="received">Credited (Immediately Added to Balance)</option>
                  <option value="expected">Expected (Scheduled)</option>
                </select>
              </div>
            </div>

            {status === 'expected' && (
              <p className="text-[10px] text-[#A1A69A] italic">
                * Expected salary is tracked in planning, but does NOT increment current available balance until marked as credited.
              </p>
            )}

            {errorMsg && <div className="text-xs text-[#FF6868]">{errorMsg}</div>}

            <Button type="submit" variant="primary" fullWidth size="sm">
              Confirm & Save Salary Entry
            </Button>
          </form>
        )}

        {/* Salary Records History */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Salary History & Streams
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setFilterScope('month')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  filterScope === 'month'
                    ? 'bg-[#E7FF32] text-[#090B08] font-bold'
                    : 'bg-[#1C2019] text-[#A1A69A] border border-[#30352B]'
                }`}
              >
                {formatMonthShort(currentMonth)}
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('all')}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  filterScope === 'all'
                    ? 'bg-[#E7FF32] text-[#090B08] font-bold'
                    : 'bg-[#1C2019] text-[#A1A69A] border border-[#30352B]'
                }`}
              >
                All ({salaryRecords.length})
              </button>
            </div>
          </div>

          {(() => {
            const displayedSalaries = filterScope === 'month'
              ? salaryRecords.filter((s) => s.credit_date.startsWith(currentMonth) || s.month_year === currentMonth)
              : salaryRecords;

            if (displayedSalaries.length === 0) {
              return (
                <div className="text-center py-6 text-xs text-[#A1A69A]">
                  No salary records found for {filterScope === 'month' ? formatMonthShort(currentMonth) : 'this account'}. Click Record Salary to log earnings.
                </div>
              );
            }

            return displayedSalaries.map((sal) => {
              const acc = accounts.find((a) => a.id === sal.account_id);
              const isReceived = sal.status === 'received';

              return (
                <div
                  key={sal.id}
                  className="p-3.5 bg-[#1C2019] border border-[#30352B] hover:border-[#E7FF32]/30 rounded-2xl flex items-center justify-between transition-colors shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isReceived ? 'bg-[#E7FF32]/15 text-[#E7FF32]' : 'bg-[#FFD166]/15 text-[#FFD166]'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">{sal.employer}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isReceived ? 'bg-[#A8E66A]/20 text-[#A8E66A]' : 'bg-[#FFD166]/20 text-[#FFD166]'
                          }`}
                        >
                          {isReceived ? 'CREDITED' : 'EXPECTED'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A69A] mt-0.5">
                        {sal.credit_date} • {acc?.name || 'Account'}
                        {sal.variable_window && (
                          <span className="block text-[10px] text-[#E7FF32] mt-0.5">
                            Window: {sal.variable_window}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white num-tabular">
                        {formatPaise(sal.amount_paise)}
                      </div>
                      {isReceived && (
                        <span className="text-[9px] text-[#A8E66A] block">✓ Available Funds</span>
                      )}
                    </div>

                    {!isReceived && (
                      <button
                        onClick={() => markSalaryReceived(sal.id)}
                        className="px-2.5 py-1 rounded-full bg-[#E7FF32] text-[#090B08] text-[10px] font-bold hover:bg-[#C9E927] transition-all shadow-sm"
                        title="Mark as Received"
                      >
                        Credit
                      </button>
                    )}

                    <button
                      onClick={() => deleteSalaryRecord(sal.id)}
                      className="p-1.5 text-[#A1A69A] hover:text-[#FF6868] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </Modal>
  );
};
