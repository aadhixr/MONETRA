import React, { useState, useMemo } from 'react';
import { Plus, PiggyBank, Target, CheckCircle2, Trash2, ArrowDownLeft, ArrowUpRight, History, Landmark, ShieldCheck, Layers, Edit2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { Modal } from '../common/Modal';
import { InsufficientBalanceModal } from '../common/InsufficientBalanceModal';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import type { SavingsGoal } from '../../types';

export const SavingsScreen: React.FC = () => {
  const {
    savingsGoals,
    accounts,
    spendingAccounts,
    savingsAccounts,
    transactions,
    totalAvailableBalancePaise,
    totalSavingsBalancePaise,
    addTransaction,
    addSavingsGoal,
    contributeToSavings,
    withdrawFromSavings,
    deleteSavingsGoal,
    updateAccount,
    addAccount,
  } = useFinancial();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Pre-Savings / Starting Savings Balance Modal State
  const [showSetPreSavingsModal, setShowSetPreSavingsModal] = useState(false);
  const [preSavingsAmountStr, setPreSavingsAmountStr] = useState('');
  const [preSavingsError, setPreSavingsError] = useState<string | null>(null);

  // Direct Transfer / Deposit to Savings (No Goal Required)
  const [showDirectTransferModal, setShowDirectTransferModal] = useState(false);
  const [showDirectWithdrawModal, setShowDirectWithdrawModal] = useState(false);
  const [directAmountStr, setDirectAmountStr] = useState('');
  const [directSourceId, setDirectSourceId] = useState('');
  const [directDestId, setDirectDestId] = useState('');
  const [directNotes, setDirectNotes] = useState('');
  const [directDate, setDirectDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [directError, setDirectError] = useState<string | null>(null);

  // Insufficient Balance Popup State
  const [insufficientInfo, setInsufficientInfo] = useState<{
    isOpen: boolean;
    accountName: string;
    availablePaise: number;
    requiredPaise: number;
    actionType: 'spend' | 'transfer' | 'withdraw';
  }>({
    isOpen: false,
    accountName: '',
    availablePaise: 0,
    requiredPaise: 0,
    actionType: 'transfer',
  });

  // Create form state
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [initialAccountId, setInitialAccountId] = useState('');
  const [description, setDescription] = useState('');

  // Transaction form state for contribute/withdraw
  const [actionAmountStr, setActionAmountStr] = useState('');
  const [actionAccountId, setActionAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // True Dedicated Savings Account Balance across savings accounts (includes all transfers, no goal required!)
  const savingsBalancePaise = totalSavingsBalancePaise;

  // Optional goals metrics
  const totalGoalsAccumulatedPaise = savingsGoals.reduce((sum, g) => sum + g.current_paise, 0);
  const totalTargetPaise = savingsGoals.reduce((sum, g) => sum + g.target_paise, 0);
  const overallSavingsPct = totalTargetPaise > 0
    ? Math.min(100, Math.round((savingsBalancePaise / totalTargetPaise) * 100))
    : 0;

  // Set of Savings Account IDs for isolating transactions
  const savingsAccountIds = useMemo(() => new Set(savingsAccounts.map((a) => a.id)), [savingsAccounts]);

  // Dedicated Savings Transaction History & Ledger
  const savingsHistory = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.is_deleted) return false;
        const isSourceSavings = savingsAccountIds.has(t.account_id);
        const isDestSavings = t.to_account_id ? savingsAccountIds.has(t.to_account_id) : false;
        const descLower = t.description.toLowerCase();
        const isSavingsKeyword =
          t.category_id === 'cat_exp_savings' ||
          descLower.includes('savings') ||
          descLower.includes('goal:') ||
          descLower.includes('emergency fund') ||
          descLower.includes('reserve');
        return isSourceSavings || isDestSavings || isSavingsKeyword;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, savingsAccountIds]);

  const handleOpenCreateGoal = () => {
    setName('');
    setTargetAmountStr('');
    setInitialAmountStr('');
    setDescription('');
    // Default to a savings account if available, or first account
    const savingsAcc = accounts.find((a) => a.type === 'savings');
    setLinkedAccountId(savingsAcc ? savingsAcc.id : '');
    setInitialAccountId(accounts[0]?.id || '');
    setErrorMsg(null);
    setShowCreateModal(true);
  };

  const handleOpenContribute = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setActionAmountStr('');
    setActionNotes('');
    setErrorMsg(null);

    // Pick funding source (cash/bank/upi)
    const fundingAcc = accounts.find((a) => a.type === 'cash' || a.type === 'bank' || a.type === 'upi') || accounts[0];
    if (fundingAcc) {
      setActionAccountId(fundingAcc.id);
    }

    // Pick destination account (linked account or savings reserve)
    const targetAcc = goal.linked_account_id || accounts.find((a) => a.type === 'savings')?.id || fundingAcc?.id || '';
    setDestinationAccountId(targetAcc);

    setShowContributeModal(true);
  };

  const handleOpenWithdraw = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setActionAmountStr('');
    setActionNotes('');
    setErrorMsg(null);

    const destAcc = accounts.find((a) => a.type === 'bank' || a.type === 'cash') || accounts[0];
    if (destAcc) {
      setActionAccountId(destAcc.id);
    }

    setShowWithdrawModal(true);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const targetPaise = toPaise(targetAmountStr);
    const initialPaise = toPaise(initialAmountStr);

    if (targetPaise <= 0) {
      setErrorMsg('Target amount must be greater than ₹0');
      return;
    }

    try {
      await addSavingsGoal({
        name: name.trim(),
        target_paise: targetPaise,
        target_date: targetDate,
        linked_account_id: linkedAccountId || undefined,
        description: description.trim() || undefined,
        initial_paise: initialPaise > 0 ? initialPaise : undefined,
        initial_account_id: initialPaise > 0 ? (initialAccountId || accounts[0]?.id) : undefined,
      });

      setShowCreateModal(false);
      setName('');
      setTargetAmountStr('');
      setInitialAmountStr('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create goal');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setErrorMsg(null);

    const amountPaise = toPaise(actionAmountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Contribution amount must be greater than zero');
      return;
    }
    if (!actionAccountId) {
      setErrorMsg('Select a funding account');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === actionAccountId);
    const sourceBal = sourceAcc ? AccountingEngine.calculateAccountBalance(sourceAcc, transactions) : 0;
    if (amountPaise > sourceBal) {
      setInsufficientInfo({
        isOpen: true,
        accountName: sourceAcc?.name || 'Funding Account',
        availablePaise: sourceBal,
        requiredPaise: amountPaise,
        actionType: 'transfer',
      });
      return;
    }

    try {
      await contributeToSavings(
        selectedGoal.id,
        amountPaise,
        actionAccountId,
        actionNotes,
        destinationAccountId || selectedGoal.linked_account_id
      );

      // Check if newly reached 100%
      if (selectedGoal.current_paise + amountPaise >= selectedGoal.target_paise) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E7FF32', '#A8E66A', '#FFFFFF'],
        });
      }

      setShowContributeModal(false);
      setActionAmountStr('');
      setActionNotes('');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deposit contribution');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setErrorMsg(null);

    const amountPaise = toPaise(actionAmountStr);
    if (amountPaise <= 0) {
      setErrorMsg('Withdrawal amount must be greater than zero');
      return;
    }
    if (!actionAccountId) {
      setErrorMsg('Select a destination account');
      return;
    }

    if (amountPaise > selectedGoal.current_paise) {
      setInsufficientInfo({
        isOpen: true,
        accountName: selectedGoal.name,
        availablePaise: selectedGoal.current_paise,
        requiredPaise: amountPaise,
        actionType: 'withdraw',
      });
      return;
    }

    try {
      await withdrawFromSavings(
        selectedGoal.id,
        amountPaise,
        actionAccountId,
        actionNotes,
        selectedGoal.linked_account_id
      );
      setShowWithdrawModal(false);
      setActionAmountStr('');
      setActionNotes('');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to withdraw from goal');
    }
  };

  const handleOpenDirectTransfer = () => {
    setDirectAmountStr('');
    setDirectNotes('Transfer to Savings Reserve');
    setDirectDate(new Date().toISOString().split('T')[0]);
    setDirectError(null);

    const fundingAcc = spendingAccounts[0] || accounts.find((a) => a.type === 'bank' || a.type === 'cash') || accounts[0];
    const targetSavings = savingsAccounts[0] || accounts.find((a) => a.type === 'savings') || accounts[0];

    setDirectSourceId(fundingAcc?.id || '');
    setDirectDestId(targetSavings?.id || '');
    setShowDirectTransferModal(true);
  };

  const handleOpenDirectWithdraw = () => {
    setDirectAmountStr('');
    setDirectNotes('Withdrawal from Savings Reserve');
    setDirectDate(new Date().toISOString().split('T')[0]);
    setDirectError(null);

    const targetSavings = savingsAccounts[0] || accounts.find((a) => a.type === 'savings') || accounts[0];
    const destSpending = spendingAccounts[0] || accounts.find((a) => a.type === 'bank' || a.type === 'cash') || accounts[0];

    setDirectSourceId(targetSavings?.id || '');
    setDirectDestId(destSpending?.id || '');
    setShowDirectWithdrawModal(true);
  };

  const handleDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);
    const amountPaise = toPaise(directAmountStr);
    if (amountPaise <= 0) {
      setDirectError('Please enter an amount greater than ₹0.');
      return;
    }
    if (!directSourceId || !directDestId) {
      setDirectError('Please select both source and destination accounts.');
      return;
    }
    if (directSourceId === directDestId) {
      setDirectError('Source and destination accounts must be distinct.');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === directSourceId);
    const sourceBal = sourceAcc ? AccountingEngine.calculateAccountBalance(sourceAcc, transactions) : 0;
    if (amountPaise > sourceBal) {
      setInsufficientInfo({
        isOpen: true,
        accountName: sourceAcc?.name || 'Primary Bank',
        availablePaise: sourceBal,
        requiredPaise: amountPaise,
        actionType: 'transfer',
      });
      return;
    }

    try {
      await addTransaction({
        type: 'transfer',
        amount_paise: amountPaise,
        account_id: directSourceId,
        to_account_id: directDestId,
        category_id: 'cat_exp_savings',
        description: directNotes.trim() || 'Transfer to Savings Reserve',
        notes: directNotes.trim() || undefined,
        date: directDate,
        payment_method: 'net_banking',
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#A8E66A', '#E7FF32', '#FFFFFF'],
      });

      setShowDirectTransferModal(false);
      setDirectAmountStr('');
    } catch (err: any) {
      setDirectError(err.message || 'Failed to complete savings transfer.');
    }
  };

  const handleDirectWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);
    const amountPaise = toPaise(directAmountStr);
    if (amountPaise <= 0) {
      setDirectError('Please enter an amount greater than ₹0.');
      return;
    }
    if (!directSourceId || !directDestId) {
      setDirectError('Please select both source and destination accounts.');
      return;
    }
    if (directSourceId === directDestId) {
      setDirectError('Source and destination accounts must be distinct.');
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === directSourceId);
    const sourceBal = sourceAcc ? AccountingEngine.calculateAccountBalance(sourceAcc, transactions) : 0;
    if (amountPaise > sourceBal) {
      setInsufficientInfo({
        isOpen: true,
        accountName: sourceAcc?.name || 'Savings Reserve',
        availablePaise: sourceBal,
        requiredPaise: amountPaise,
        actionType: 'withdraw',
      });
      return;
    }

    try {
      await addTransaction({
        type: 'transfer',
        amount_paise: amountPaise,
        account_id: directSourceId,
        to_account_id: directDestId,
        category_id: 'cat_exp_savings',
        description: directNotes.trim() || 'Withdrawal from Savings Reserve',
        notes: directNotes.trim() || undefined,
        date: directDate,
        payment_method: 'net_banking',
      });

      setShowDirectWithdrawModal(false);
      setDirectAmountStr('');
    } catch (err: any) {
      setDirectError(err.message || 'Failed to complete withdrawal.');
    }
  };

  const handleOpenSetPreSavings = () => {
    const savingsAcc = savingsAccounts[0] || accounts.find((a) => a.type === 'savings');
    setPreSavingsAmountStr(savingsAcc ? (savingsAcc.opening_balance_paise / 100).toString() : '0');
    setPreSavingsError(null);
    setShowSetPreSavingsModal(true);
  };

  const handleSetPreSavingsBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreSavingsError(null);
    const newInitialPaise = toPaise(preSavingsAmountStr);
    if (newInitialPaise < 0) {
      setPreSavingsError('Starting balance cannot be negative.');
      return;
    }

    try {
      let savingsAcc = savingsAccounts[0] || accounts.find((a) => a.type === 'savings');
      if (savingsAcc) {
        await updateAccount(savingsAcc.id, { opening_balance_paise: newInitialPaise });
      } else {
        await addAccount({
          name: 'Savings Reserve',
          type: 'savings',
          opening_balance_paise: newInitialPaise,
          current_balance_paise: newInitialPaise,
          currency: 'INR',
          is_archived: false,
        });
      }

      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#A8E66A', '#E7FF32'],
      });

      setShowSetPreSavingsModal(false);
    } catch (err: any) {
      setPreSavingsError(err.message || 'Failed to update pre-savings balance.');
    }
  };

  // Quick preset goals
  const PRESET_GOALS = [
    'Emergency Fund',
    'New Smartphone',
    'MacBook / Laptop',
    'Vehicle Down Payment',
    'Vacation / Travel',
    'Investment Reserve',
  ];

  return (
    <div className="space-y-5 pb-24 md:pb-12">
      {/* 1. Header Card with Total Savings Hero (Direct Balance Display - No Goal Required) */}
      <Card className="p-5 bg-gradient-to-br from-[#1C2019] via-[#151812] to-[#1C2019] border-[#30352B] rounded-[26px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#A8E66A] shadow-[0_0_10px_#A8E66A]" />
            <span className="text-xs uppercase font-extrabold text-[#A8E66A] tracking-wider">
              Total Savings Balance
            </span>
            <button
              onClick={handleOpenSetPreSavings}
              className="p-1 px-2 rounded-lg bg-[#23281F] border border-[#30352B] text-[#A8E66A] hover:text-white hover:border-[#A8E66A] transition-colors flex items-center space-x-1"
              title="Set Starting Pre-Savings Balance"
            >
              <Edit2 className="w-3 h-3" />
              <span className="text-[10px] font-bold">Set Starting</span>
            </button>
          </div>
          <button
            onClick={handleOpenCreateGoal}
            className="text-xs font-semibold text-[#E7FF32] hover:underline flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal (Optional)</span>
          </button>
        </div>

        <div className="mt-3.5 flex items-baseline justify-between">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-[#A8E66A] num-tabular tracking-tight">
              {formatPaise(savingsBalancePaise)}
            </div>
            <div className="text-xs text-[#A1A69A] mt-1">
              {totalTargetPaise > 0 ? (
                <>
                  Target: <span className="text-white font-medium num-tabular">{formatPaise(totalTargetPaise)}</span>
                  {savingsGoals.length > 0 && (
                    <span className="text-[#A1A69A] ml-2">
                      ({savingsGoals.length} goal{savingsGoals.length > 1 ? 's' : ''})
                    </span>
                  )}
                </>
              ) : (
                <span>Preserved in Dedicated Savings Reserve • No goal required</span>
              )}
            </div>
          </div>
          {totalTargetPaise > 0 && (
            <div className="text-right">
              <span className="text-2xl font-black text-white num-tabular">{overallSavingsPct}%</span>
              <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">Goal Target</span>
            </div>
          )}
        </div>

        {totalTargetPaise > 0 && (
          <div className="mt-4">
            <ProgressBar
              value={savingsBalancePaise}
              max={totalTargetPaise}
              height="h-2.5"
              variant="neon"
            />
          </div>
        )}

        {/* Quick Action Buttons: Direct Transfer to Savings & Direct Withdraw */}
        <div className="mt-4 pt-3.5 border-t border-[#30352B]/80 flex items-center gap-2.5">
          <button
            onClick={handleOpenDirectTransfer}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#A8E66A] text-[#090B08] text-xs font-extrabold flex items-center justify-center space-x-1.5 hover:bg-[#94d557] transition-all shadow-[0_0_12px_rgba(168,230,106,0.25)] active:scale-[0.98]"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>+ Transfer to Savings</span>
          </button>

          {savingsBalancePaise > 0 && (
            <button
              onClick={handleOpenDirectWithdraw}
              className="py-2.5 px-3.5 rounded-xl bg-[#23281F] border border-[#30352B] text-white hover:text-[#FF6868] hover:border-[#FF6868]/40 text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              <span>Withdraw</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateGoal}
            className="py-2.5 px-3 rounded-xl bg-[#1C2019] border border-[#30352B] text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 text-xs font-medium flex items-center space-x-1 transition-all"
            title="Create Optional Goal"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Set Goal</span>
          </button>
        </div>
      </Card>

      {/* Two Separate Accounts Architecture: Primary Spending vs Savings Reserve */}
      <div className="p-4 bg-[#151812] border border-[#30352B] rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#A8E66A]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Two Separate Accounts Architecture
            </span>
          </div>
          <span className="text-[11px] text-[#A1A69A]">Zero Savings Leakage</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Primary Account */}
          <div className="p-3 bg-[#1C2019] border border-[#30352B] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E7FF32]/10 text-[#E7FF32] flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <span>{spendingAccounts[0]?.name || 'Primary Bank'}</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-[#23281F] text-[#E7FF32]">Spending</span>
                </div>
                <div className="text-[11px] text-[#A1A69A]">Daily spending & debits</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#E7FF32] num-tabular">
                {formatPaise(totalAvailableBalancePaise)}
              </div>
              <div className="text-[10px] text-[#A1A69A]">Available</div>
            </div>
          </div>

          {/* Savings Account */}
          <div className="p-3 bg-[#1C2019] border border-[#30352B] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A8E66A]/10 text-[#A8E66A] flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <span>{savingsAccounts[0]?.name || 'Savings Reserve'}</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-[#23281F] text-[#A8E66A]">Reserve</span>
                </div>
                <div className="text-[11px] text-[#A1A69A]">Untouched isolated reserve</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#A8E66A] num-tabular">
                {formatPaise(savingsBalancePaise)}
              </div>
              <div className="text-[10px] text-[#A1A69A]">In Savings</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Optional Savings Goals List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Savings Goals (Optional Targets)
            </h3>
            <span className="text-[11px] text-[#A1A69A]">
              Optional benchmarks • Savings balance above tracks all your money
            </span>
          </div>
          {savingsGoals.length > 0 && (
            <span className="text-xs text-[#A1A69A]">
              {savingsGoals.filter((g) => g.is_completed).length} of {savingsGoals.length} completed
            </span>
          )}
        </div>

        {savingsGoals.length === 0 ? (
          <Card className="p-6 text-center bg-[#1C2019] border-[#30352B] rounded-2xl">
            <Target className="w-8 h-8 text-[#E7FF32] mx-auto mb-2 opacity-80" />
            <div className="text-sm font-semibold text-white mb-1">Target Goals are Optional</div>
            <p className="text-xs text-[#A1A69A] max-w-md mx-auto mb-3">
              Your savings balance is already safely tracked and isolated above. You only need to create a goal if you want to track a specific milestone like a vacation, new phone, or vehicle.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenCreateGoal}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Optional Goal
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savingsGoals.map((goal) => {
              const pct = goal.target_paise > 0
                ? Math.min(100, Math.round((goal.current_paise / goal.target_paise) * 100))
                : 0;
              const remaining = Math.max(0, goal.target_paise - goal.current_paise);
              const isDone = goal.is_completed || goal.current_paise >= goal.target_paise;
              const linkedAcc = accounts.find((a) => a.id === goal.linked_account_id);

              return (
                <div
                  key={goal.id}
                  className="p-4 bg-[#1C2019] border border-[#30352B] hover:border-[#A8E66A]/40 rounded-2xl transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#A8E66A]/15 text-[#A8E66A] flex items-center justify-center">
                        <Target className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{goal.name}</span>
                          {isDone && (
                            <span className="px-2 py-0.5 rounded-full bg-[#A8E66A]/20 text-[#A8E66A] text-[10px] font-bold flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" /> Goal Reached!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#A1A69A] mt-0.5">
                          Target: {goal.target_date}
                          {linkedAcc && ` • Linked: ${linkedAcc.name}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[#A8E66A] num-tabular">{pct}%</span>
                      <span className="block text-[10px] text-[#A1A69A]">
                        {formatPaise(goal.current_paise)} / {formatPaise(goal.target_paise)}
                      </span>
                    </div>
                  </div>

                  <ProgressBar value={goal.current_paise} max={goal.target_paise} height="h-2" />

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#30352B]/40 text-xs">
                    <span className="text-[#A1A69A] text-[11px]">
                      Remaining: <strong className="text-white num-tabular">{formatPaise(remaining)}</strong>
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenContribute(goal)}
                        className="px-3 py-1.5 rounded-full bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] transition-colors"
                      >
                        + Add Funds
                      </button>

                      {goal.current_paise > 0 && (
                        <button
                          onClick={() => handleOpenWithdraw(goal)}
                          className="px-2.5 py-1.5 rounded-full bg-[#23281F] text-white hover:bg-[#30352B] border border-[#30352B] text-xs font-medium transition-colors"
                        >
                          Withdraw
                        </button>
                      )}

                      <button
                        onClick={() => deleteSavingsGoal(goal.id)}
                        className="p-1.5 text-[#A1A69A] hover:text-[#FF6868] transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Dedicated Savings History & Ledger (Separate Statement from Daily Spending) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#A8E66A]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Dedicated Savings History & Statement ({savingsHistory.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#A1A69A]">Separate Savings Ledger</span>
        </div>

        {savingsHistory.length === 0 ? (
          <Card className="p-6 text-center bg-[#1C2019] border-[#30352B] rounded-2xl">
            <PiggyBank className="w-8 h-8 text-[#A8E66A] mx-auto mb-2 opacity-70" />
            <div className="text-xs font-semibold text-white mb-1">No Savings Records Yet</div>
            <p className="text-[11px] text-[#A1A69A]">
              When you allocate funds to goals or transfer money to your savings account, every deposit and withdrawal will appear here in this dedicated statement.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {savingsHistory.map((txn) => {
              const isSourceSavings = savingsAccountIds.has(txn.account_id);
              const isDestSavings = txn.to_account_id ? savingsAccountIds.has(txn.to_account_id) : false;
              const isWithdrawal =
                txn.description.toLowerCase().includes('withdraw') ||
                (isSourceSavings && !isDestSavings && txn.type === 'transfer');

              const sourceAcc = accounts.find((a) => a.id === txn.account_id);
              const destAcc = txn.to_account_id ? accounts.find((a) => a.id === txn.to_account_id) : null;

              return (
                <div
                  key={txn.id}
                  className="p-3.5 bg-[#1C2019] border border-[#30352B] rounded-2xl flex items-center justify-between hover:border-[#A8E66A]/30 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isWithdrawal
                          ? 'bg-[#FF6868]/15 text-[#FF6868]'
                          : 'bg-[#A8E66A]/15 text-[#A8E66A]'
                      }`}
                    >
                      {isWithdrawal ? (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {txn.description}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            isWithdrawal
                              ? 'bg-[#FF6868]/20 text-[#FF6868]'
                              : 'bg-[#A8E66A]/20 text-[#A8E66A]'
                          }`}
                        >
                          {isWithdrawal ? 'Withdrawn to Primary' : 'Credited to Savings'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#A1A69A] mt-0.5 flex items-center space-x-2">
                        <span>{txn.date}</span>
                        {sourceAcc && (
                          <span>
                            • {isWithdrawal ? `To ${destAcc?.name || 'Primary'}` : `From ${sourceAcc.name}`}
                          </span>
                        )}
                        {txn.notes && <span className="italic">• {txn.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span
                      className={`text-xs font-black num-tabular ${
                        isWithdrawal ? 'text-[#FF6868]' : 'text-[#A8E66A]'
                      }`}
                    >
                      {isWithdrawal ? '-' : '+'} {formatPaise(txn.amount_paise)}
                    </span>
                    <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">
                      {isWithdrawal ? 'Debit' : 'Credit'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Savings Goal"
        subtitle="Every contribution creates an immutable transfer record"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Quick Presets</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_GOALS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="px-2.5 py-1 rounded-full bg-[#1C2019] border border-[#30352B] text-xs text-[#A1A69A] hover:text-[#E7FF32] hover:border-[#E7FF32]/50 whitespace-nowrap transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Goal Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Target Amount (₹) *</label>
              <input
                type="number"
                step="any"
                required
                value={targetAmountStr}
                onChange={(e) => setTargetAmountStr(e.target.value)}
                placeholder="50000"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-sm font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Target Date *</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Linked Savings Account (Where funds are deposited)
            </label>
            <select
              value={linkedAccountId}
              onChange={(e) => setLinkedAccountId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              <option value="">No dedicated account (Keep in funding account)</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Initial Deposit (₹) (Optional)
            </label>
            <input
              type="number"
              step="any"
              value={initialAmountStr}
              onChange={(e) => setInitialAmountStr(e.target.value)}
              placeholder="0"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          {toPaise(initialAmountStr) > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                Pay Initial Deposit From Account *
              </label>
              <select
                value={initialAccountId}
                onChange={(e) => setInitialAccountId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {errorMsg}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg">
            Create Goal
          </Button>
        </form>
      </Modal>

      {/* Contribute Funds Modal */}
      <Modal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        title={`Add Funds to ${selectedGoal?.name}`}
        subtitle="Deposit money from your account directly to this goal"
      >
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Contribution Amount (₹) *</label>
            <input
              type="number"
              step="any"
              required
              value={actionAmountStr}
              onChange={(e) => setActionAmountStr(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Fund from Account (Debit) *</label>
            <select
              value={actionAccountId}
              onChange={(e) => setActionAccountId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Deposit into Account (Credit) *</label>
            <select
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g. Bonus allocation"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {errorMsg}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg">
            Deposit to Goal
          </Button>
        </form>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title={`Withdraw from ${selectedGoal?.name}`}
        subtitle={`Current balance: ${selectedGoal ? formatPaise(selectedGoal.current_paise) : ''}`}
      >
        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Withdrawal Amount (₹) *</label>
            <input
              type="number"
              step="any"
              required
              value={actionAmountStr}
              onChange={(e) => setActionAmountStr(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#FF6868] focus:outline-none focus:border-[#FF6868]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Deposit into Account *</label>
            <select
              value={actionAccountId}
              onChange={(e) => setActionAccountId(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#E7FF32]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                </option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {errorMsg}
            </div>
          )}

          <Button type="submit" variant="secondary" fullWidth size="lg">
            Withdraw to Account
          </Button>
        </form>
      </Modal>

      {/* Direct Transfer to Savings Modal (No Goal Required) */}
      <Modal
        isOpen={showDirectTransferModal}
        onClose={() => setShowDirectTransferModal(false)}
        title="Transfer to Savings Reserve"
        subtitle="Move money directly from spending to your untouched savings balance"
      >
        <form onSubmit={handleDirectTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Amount to Save (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={directAmountStr}
              onChange={(e) => setDirectAmountStr(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#A8E66A] focus:outline-none focus:border-[#A8E66A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                From Account (Debit) *
              </label>
              <select
                value={directSourceId}
                onChange={(e) => setDirectSourceId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
              >
                {spendingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                To Savings Account *
              </label>
              <select
                value={directDestId}
                onChange={(e) => setDirectDestId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#A8E66A]"
              >
                {savingsAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Date</label>
            <input
              type="date"
              value={directDate}
              onChange={(e) => setDirectDate(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={directNotes}
              onChange={(e) => setDirectNotes(e.target.value)}
              placeholder="e.g. Monthly savings allocation"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          {directError && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {directError}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg">
            Deposit to Savings Balance
          </Button>
        </form>
      </Modal>

      {/* Direct Withdraw from Savings Modal (No Goal Required) */}
      <Modal
        isOpen={showDirectWithdrawModal}
        onClose={() => setShowDirectWithdrawModal(false)}
        title="Withdraw from Savings Reserve"
        subtitle={`Current Savings Balance: ${formatPaise(savingsBalancePaise)}`}
      >
        <form onSubmit={handleDirectWithdraw} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Withdrawal Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={directAmountStr}
              onChange={(e) => setDirectAmountStr(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-lg font-bold text-[#FF6868] focus:outline-none focus:border-[#FF6868]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                From Savings (Debit) *
              </label>
              <select
                value={directSourceId}
                onChange={(e) => setDirectSourceId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF6868]"
              >
                {savingsAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
                To Spending (Credit) *
              </label>
              <select
                value={directDestId}
                onChange={(e) => setDirectDestId(e.target.value)}
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
              >
                {spendingAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatPaise(AccountingEngine.calculateAccountBalance(acc, transactions))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">Date</label>
            <input
              type="date"
              value={directDate}
              onChange={(e) => setDirectDate(e.target.value)}
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={directNotes}
              onChange={(e) => setDirectNotes(e.target.value)}
              placeholder="e.g. Emergency home repair"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          {directError && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {directError}
            </div>
          )}

          <Button type="submit" variant="secondary" fullWidth size="lg">
            Withdraw to Primary Spending
          </Button>
        </form>
      </Modal>

      {/* Insufficient Balance Protection Popup */}
      <InsufficientBalanceModal
        isOpen={insufficientInfo.isOpen}
        onClose={() => setInsufficientInfo((prev) => ({ ...prev, isOpen: false }))}
        accountName={insufficientInfo.accountName}
        availablePaise={insufficientInfo.availablePaise}
        requiredPaise={insufficientInfo.requiredPaise}
        actionType={insufficientInfo.actionType}
      />

      {/* Set Pre-Savings / Starting Balance Modal */}
      <Modal
        isOpen={showSetPreSavingsModal}
        onClose={() => setShowSetPreSavingsModal(false)}
        title="Set Starting Savings Balance"
        subtitle="Set the initial savings amount you currently have so MONETRA starts tracking from it."
      >
        <form onSubmit={handleSetPreSavingsBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A69A] mb-1.5">
              Starting Savings Balance (₹) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={preSavingsAmountStr}
              onChange={(e) => setPreSavingsAmountStr(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-4 py-3 text-xl font-black text-[#A8E66A] focus:outline-none focus:border-[#A8E66A]"
            />
          </div>

          <p className="text-xs text-[#A1A69A]">
            This sets the baseline savings balance in your dedicated Savings Reserve account without affecting your daily spending balance.
          </p>

          {preSavingsError && (
            <div className="p-3 bg-[#FF6868]/15 border border-[#FF6868]/40 rounded-xl text-xs text-[#FF6868]">
              {preSavingsError}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg">
            Save Starting Balance
          </Button>
        </form>
      </Modal>
    </div>
  );
};
