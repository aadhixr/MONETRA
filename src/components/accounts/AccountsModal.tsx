// AURIX - Multi-Account Management Modal
// Clearly separates Primary (Spending) and Savings Accounts with 1-click Edit / Add Bank Name
import React, { useState } from 'react';
import { Plus, Wallet, Landmark, Smartphone, PiggyBank, ArrowRightLeft, Archive, Edit2, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { formatPaise, toPaise, toRupees } from '../../engine/currency';
import { AccountingEngine } from '../../engine/accountingEngine';
import type { Account, AccountType } from '../../types';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerTransfer: () => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  onClose,
  onTriggerTransfer,
}) => {
  const {
    accounts,
    spendingAccounts,
    savingsAccounts,
    transactions,
    addAccount,
    updateAccount,
    archiveAccount,
    totalAvailableBalancePaise,
    totalSavingsBalancePaise,
  } = useFinancial();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  const [institutionName, setInstitutionName] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setOpeningBalanceStr('0');
    setInstitutionName('');
    setAccountNumberLast4('');
    setShowAddForm(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalanceStr(toRupees(acc.opening_balance_paise).toString());
    setInstitutionName(acc.institution_name || '');
    setAccountNumberLast4(acc.account_number_last4 || '');
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Bank or account name is required');
      return;
    }

    const openingPaise = toPaise(openingBalanceStr);

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: name.trim(),
          type,
          opening_balance_paise: openingPaise,
          institution_name: institutionName.trim() || undefined,
          account_number_last4: accountNumberLast4.trim() || undefined,
        });
      } else {
        await addAccount({
          name: name.trim(),
          type,
          opening_balance_paise: openingPaise,
          current_balance_paise: openingPaise,
          currency: 'INR',
          color: type === 'savings' ? '#A8E66A' : '#E7FF32',
          institution_name: institutionName.trim() || undefined,
          account_number_last4: accountNumberLast4.trim() || undefined,
          is_archived: false,
        });
      }
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save account');
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'cash':
        return Wallet;
      case 'bank':
        return Landmark;
      case 'upi':
        return Smartphone;
      case 'savings':
        return PiggyBank;
      default:
        return Wallet;
    }
  };

  const primaryAcc = spendingAccounts[0];
  const primarySavings = savingsAccounts[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Accounts"
      subtitle="Separate Primary Spending & Savings Accounts"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Top Action Toolbar: Add New Bank / Transfer */}
        <div className="flex items-center justify-between pb-1">
          <div className="text-xs font-extrabold text-white uppercase tracking-wider">
            Core Financial Accounts
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onTriggerTransfer();
              }}
              className="px-3 py-1.5 rounded-xl bg-[#23281F] text-white hover:text-[#38BDF8] border border-[#30352B] text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-[#E7FF32] text-[#090B08] text-xs font-bold hover:bg-[#C9E927] flex items-center space-x-1.5 transition-all shadow-[0_0_10px_rgba(231,255,50,0.3)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Bank Account</span>
            </button>
          </div>
        </div>

        {/* Add / Edit Account Form */}
        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="p-4 bg-[#151812] border border-[#E7FF32]/50 rounded-2xl space-y-3.5 animate-in fade-in duration-200 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                {editingAccount ? `Edit Bank / Account Name: ${editingAccount.name}` : 'Add New Bank Account'}
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
                Account / Bank Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HDFC Salary Bank, SBI Personal, ICICI Bank"
                className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Account Category *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                >
                  <option value="bank">Primary Spending (Bank)</option>
                  <option value="cash">Cash Wallet (Spending)</option>
                  <option value="upi">UPI / Digital (Spending)</option>
                  <option value="savings">Dedicated Savings Account</option>
                  <option value="custom">Custom Entity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Opening Balance (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={openingBalanceStr}
                  onChange={(e) => setOpeningBalanceStr(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2.5 text-xs font-bold text-[#E7FF32] focus:outline-none focus:border-[#E7FF32] num-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Bank / Institution Name</label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Account Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  value={accountNumberLast4}
                  onChange={(e) => setAccountNumberLast4(e.target.value)}
                  placeholder="4242"
                  className="w-full bg-[#1C2019] border border-[#30352B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
                />
              </div>
            </div>

            {errorMsg && <div className="text-xs text-[#FF6868]">{errorMsg}</div>}

            <Button type="submit" variant="primary" fullWidth size="sm">
              <Check className="w-4 h-4 mr-1" />
              {editingAccount ? 'Update Bank Account' : 'Save Bank Account'}
            </Button>
          </form>
        )}

        {/* 1. PRIMARY SPENDING ACCOUNT SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#E7FF32] uppercase tracking-wider flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>Primary Spending Account ({spendingAccounts.length})</span>
            </span>
            <span className="text-xs font-bold text-[#E7FF32] num-tabular">
              Available: {formatPaise(totalAvailableBalancePaise)}
            </span>
          </div>

          {spendingAccounts.map((acc) => {
            const liveBal = AccountingEngine.calculateAccountBalance(acc, transactions);
            return (
              <div
                key={acc.id}
                className="p-3.5 bg-[#1C2019] border border-[#30352B] hover:border-[#E7FF32]/40 rounded-2xl flex items-center justify-between transition-colors shadow-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E7FF32]/15 text-[#E7FF32] flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{acc.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#151812] border border-[#30352B] text-[#A1A69A]">
                        {acc.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A1A69A] mt-0.5">
                      {acc.institution_name || 'Bank'} {acc.account_number_last4 ? `••${acc.account_number_last4}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#E7FF32] num-tabular block">
                      {formatPaise(liveBal)}
                    </span>
                    <span className="text-[9px] text-[#A8E66A]">Available</span>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="px-2.5 py-1 rounded-xl bg-[#151812] border border-[#30352B] hover:border-[#E7FF32] text-[11px] text-[#A1A69A] hover:text-[#E7FF32] flex items-center space-x-1 transition-colors"
                    title="Edit or Rename Bank Name"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Rename</span>
                  </button>

                  {spendingAccounts.length > 1 && (
                    <button
                      onClick={() => archiveAccount(acc.id)}
                      className="p-1.5 text-[#A1A69A] hover:text-[#FF6868] transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. DEDICATED SAVINGS ACCOUNT SECTION (KEPT SEPARATE) */}
        <div className="space-y-2 pt-3 border-t border-[#30352B]/60">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#A8E66A] uppercase tracking-wider flex items-center space-x-1.5">
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Dedicated Savings Account ({savingsAccounts.length})</span>
            </span>
            <span className="text-xs font-bold text-[#A8E66A] num-tabular">
              Reserve: {formatPaise(totalSavingsBalancePaise)}
            </span>
          </div>

          {savingsAccounts.length === 0 ? (
            <div className="p-3 bg-[#151812] border border-[#30352B] rounded-2xl text-center text-xs text-[#A1A69A]">
              <span>No separate savings account created yet. </span>
              <button
                onClick={() => {
                  handleOpenAdd();
                  setType('savings');
                  setName('Dedicated Savings Reserve');
                }}
                className="text-[#A8E66A] font-bold hover:underline ml-1"
              >
                + Create Savings Account
              </button>
            </div>
          ) : (
            savingsAccounts.map((acc) => {
              const liveBal = AccountingEngine.calculateAccountBalance(acc, transactions);
              return (
                <div
                  key={acc.id}
                  className="p-3.5 bg-[#1C2019] border border-[#A8E66A]/30 hover:border-[#A8E66A] rounded-2xl flex items-center justify-between transition-colors shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#A8E66A]/15 text-[#A8E66A] flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{acc.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#151812] border border-[#30352B] text-[#A8E66A]">
                          Savings Reserve
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A69A] mt-0.5">
                        {acc.institution_name || 'Savings Vault'} • Preserved
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-[#A8E66A] num-tabular block">
                        {formatPaise(liveBal)}
                      </span>
                      <span className="text-[9px] text-[#A8E66A]">Reserved</span>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(acc)}
                      className="px-2.5 py-1 rounded-xl bg-[#151812] border border-[#30352B] hover:border-[#A8E66A] text-[11px] text-[#A1A69A] hover:text-[#A8E66A] flex items-center space-x-1 transition-colors"
                      title="Edit or Rename Savings Account"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename</span>
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

