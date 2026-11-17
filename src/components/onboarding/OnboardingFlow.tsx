// MONETRA V3 - Streamlined Fintech Onboarding
// Only asks for User Name, Salary, Employer Source, and Flexible / Variable Credit Dates.
import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Landmark, Calendar, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { toPaise } from '../../engine/currency';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { updateSettings, addAccount, updateAccount, addSalaryRecord, accounts } = useFinancial();

  const [userName, setUserName] = useState('');
  const [employer, setEmployer] = useState('');
  const [salaryAmountStr, setSalaryAmountStr] = useState('50000');
  const [accountName, setAccountName] = useState('Primary Bank');

  // Salary Date & Variable Window States
  const [selectedDay, setSelectedDay] = useState<number>(5); // default 5th
  const [isVariableWindow, setIsVariableWindow] = useState<boolean>(true); // default flexible window
  const [windowDays, setWindowDays] = useState<number>(4); // 4 days variable (e.g. 5th - 8th)
  const [specificCreditDay, setSpecificCreditDay] = useState<number>(5);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COMMON_DAYS = [1, 5, 6, 7, 10, 25, 28, 30];

  // Calculate window text (e.g. "5th – 8th (4-day variable)")
  const startDay = selectedDay;
  const endDay = Math.min(31, startDay + windowDays - 1);
  const windowLabel = `${startDay}th – ${endDay}th (${windowDays}-day flexible window)`;

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = userName.trim() || 'Alex';
    const source = employer.trim() || 'Primary Employer';
    const salaryPaise = toPaise(salaryAmountStr);

    if (salaryPaise <= 0) {
      setErrorMsg('Please enter a valid salary amount (greater than ₹0)');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update user settings with default salary day & variable window preferences
      await updateSettings({
        user_name: name,
        onboarding_completed: true,
        default_salary_day: selectedDay,
        salary_variable_window: isVariableWindow ? windowLabel : `${selectedDay}th of month`,
      });

      // 2. Setup Primary Salary Account (Bank account)
      const existingBank = accounts.find((a) => a.type === 'bank' && !a.is_archived);
      let targetAccountId = existingBank?.id;

      if (existingBank) {
        await updateAccount(existingBank.id, {
          name: accountName.trim() || 'Primary Bank',
          institution_name: accountName.trim() || 'Primary Bank',
          opening_balance_paise: 0,
        });
      } else {
        const primaryAcc = await addAccount({
          name: accountName.trim() || 'Primary Bank',
          type: 'bank',
          opening_balance_paise: 0,
          current_balance_paise: 0,
          currency: 'INR',
          color: '#E7FF32',
          institution_name: accountName.trim() || 'Primary Bank',
          is_archived: false,
        });
        targetAccountId = primaryAcc.id;
      }

      // 3. Immediately credit their Salary to this account!
      const today = new Date();
      const currentMonthStr = today.toISOString().slice(0, 7);
      
      // Determine credit day: padded 2 digits
      const dayPadded = String(specificCreditDay).padStart(2, '0');
      const creditDate = `${currentMonthStr}-${dayPadded}`;

      await addSalaryRecord({
        employer: source,
        amount_paise: salaryPaise,
        credit_date: creditDate,
        account_id: targetAccountId!,
        month_year: currentMonthStr,
        status: 'received',
        credit_day_of_month: specificCreditDay,
        variable_window: isVariableWindow ? windowLabel : undefined,
        notes: `Monthly salary from ${source} (${isVariableWindow ? windowLabel : `Credited on ${selectedDay}th`})`,
      });

      onComplete();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete setup');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B08] text-white flex flex-col justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-lg mx-auto bg-[#151812] border border-[#30352B] rounded-[28px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#E7FF32]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#30352B]/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-3 h-3 rounded-full bg-[#E7FF32] shadow-[0_0_10px_#E7FF32]" />
            <span className="text-base font-black tracking-widest text-[#E7FF32]">MONETRA</span>
          </div>
          <div className="flex items-center space-x-1 text-[#A8E66A] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Institutional Precision</span>
          </div>
        </div>

        {/* Headline */}
        <div className="mt-5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center mb-2.5">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome to MONETRA
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A69A] mt-1 leading-relaxed">
            Configure your identity, monthly salary, and custom or variable credit dates.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleFinish} className="space-y-4">
          {/* User Name */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A69A] uppercase tracking-wider mb-1.5">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Alex Sharma"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32] transition-colors"
            />
          </div>

          {/* Employer / Source */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A69A] uppercase tracking-wider mb-1.5">
              Employer or Salary Source *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A69A]">
                <Landmark className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                placeholder="e.g. Google, Infosys, Client Project"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32] transition-colors"
              />
            </div>
          </div>

          {/* Salary Amount & Account Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#A1A69A] uppercase tracking-wider mb-1.5">
                Monthly Salary (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#E7FF32]">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={salaryAmountStr}
                  onChange={(e) => setSalaryAmountStr(e.target.value)}
                  placeholder="50000"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32] num-tabular transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A69A] uppercase tracking-wider mb-1.5">
                Salary Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. HDFC Salary, SBI Bank"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32] transition-colors"
              />
            </div>
          </div>

          {/* Salary Credit Date & Variable Window Selector */}
          <div className="p-3.5 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-[#E7FF32]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Salary Credit Date
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#E7FF32]">
                Day {selectedDay} of month
              </span>
            </div>

            {/* Quick Day Chips */}
            <div>
              <span className="text-[10px] text-[#A1A69A] uppercase tracking-wider block mb-1.5">
                Select Typical Credit Day:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d);
                      setSpecificCreditDay(d);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDay === d
                        ? 'bg-[#E7FF32] text-[#090B08] shadow-[0_0_10px_rgba(231,255,50,0.35)]'
                        : 'bg-[#151812] border border-[#30352B] text-white hover:border-[#E7FF32]/50'
                    }`}
                  >
                    {d}th
                  </button>
                ))}
              </div>
            </div>

            {/* Variable Date Window (e.g. 5th - 8th / 4-day flex window) */}
            <div className="pt-2 border-t border-[#30352B]/60 space-y-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVariableWindow}
                  onChange={(e) => setIsVariableWindow(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#E7FF32] bg-[#151812] border-[#30352B]"
                />
                <span className="text-xs font-semibold text-white">
                  Variable Credit Window (e.g. 5th, 6th, or 7th)
                </span>
              </label>

              {isVariableWindow && (
                <div className="p-3 bg-[#151812] border border-[#E7FF32]/30 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A69A]">Flexible Range Span:</span>
                    <div className="flex items-center space-x-1">
                      {[2, 3, 4, 5].map((span) => (
                        <button
                          key={span}
                          type="button"
                          onClick={() => setWindowDays(span)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            windowDays === span
                              ? 'bg-[#E7FF32] text-[#090B08]'
                              : 'bg-[#1C2019] text-[#A1A69A] border border-[#30352B]'
                          }`}
                        >
                          {span} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#A8E66A] flex items-center space-x-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Expected Window: <strong>{windowLabel}</strong></span>
                  </div>

                  {/* Which exact day was it credited this month? */}
                  <div className="pt-1.5 border-t border-[#30352B]/40">
                    <label className="block text-[10px] text-[#A1A69A] uppercase tracking-wider mb-1">
                      Actual Credit Day for This Month:
                    </label>
                    <div className="flex gap-1.5">
                      {Array.from({ length: windowDays }, (_, i) => selectedDay + i).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSpecificCreditDay(d)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            specificCreditDay === d
                              ? 'bg-[#A8E66A] text-[#090B08]'
                              : 'bg-[#1C2019] text-[#A1A69A] border border-[#30352B]'
                          }`}
                        >
                          {d}th
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-[#A1A69A]/80 leading-relaxed">
            Your salary will be credited on <strong>{specificCreditDay}th of this month</strong>, establishing your available spending balance before your expenses begin.
          </p>

          {errorMsg && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {errorMsg}
            </div>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isSubmitting}
              className="py-3.5 text-sm font-bold flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Configuring MONETRA...' : 'Get Started with MONETRA'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
