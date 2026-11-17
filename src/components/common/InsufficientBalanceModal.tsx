// MONETRA V3 - Insufficient Balance Warning & Overdraft Protection Popup
import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRightLeft, MinusCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { formatPaise } from '../../engine/currency';

export interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  availablePaise: number;
  requiredPaise: number;
  actionType: 'spend' | 'transfer' | 'withdraw';
  onProceedAnyway?: () => void;
}

export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  onClose,
  accountName,
  availablePaise,
  requiredPaise,
  actionType,
  onProceedAnyway,
}) => {
  const shortfallPaise = Math.max(0, requiredPaise - availablePaise);

  const getActionLabel = () => {
    switch (actionType) {
      case 'transfer':
        return 'transfer';
      case 'withdraw':
        return 'withdraw';
      case 'spend':
      default:
        return 'spend';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="p-6 text-center space-y-4">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#FF6868]/15 border border-[#FF6868]/30 text-[#FF6868] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,104,104,0.25)] animate-pulse">
          <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Title & Status */}
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#FF6868]/20 border border-[#FF6868]/40 text-[#FF6868] text-[10px] font-black uppercase tracking-wider mb-2">
            <AlertCircle className="w-3 h-3 stroke-[2.5]" />
            <span>Insufficient Balance</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Insufficient Funds in {accountName}
          </h3>
          <p className="text-xs text-[#A1A69A] mt-1.5 leading-relaxed">
            You do not have enough money in <strong className="text-white">{accountName}</strong> to{' '}
            {getActionLabel()} this amount.
          </p>
        </div>

        {/* Financial Comparison Matrix */}
        <div className="p-3.5 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-2 text-left">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#30352B]/60">
            <span className="text-[#A1A69A]">Available in {accountName}:</span>
            <span className="font-bold text-white num-tabular">
              {formatPaise(availablePaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#30352B]/60">
            <span className="text-[#A1A69A]">Attempted to {getActionLabel()}:</span>
            <span className="font-bold text-[#FF6868] num-tabular">
              {formatPaise(requiredPaise)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="font-semibold text-[#FF6868]">Required Shortfall:</span>
            <span className="font-black text-[#FF6868] num-tabular">
              -{formatPaise(shortfallPaise)}
            </span>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="p-3 bg-[#151812] border border-[#30352B] rounded-xl text-[11px] text-[#A1A69A] text-left">
          💡 <span className="text-white font-medium">Protection:</span> Only your primary account balance is spendable. Dedicated savings reserves are strictly protected and never counted as available to spend.
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="primary"
            fullWidth
            size="lg"
            onClick={onClose}
          >
            Adjust Amount
          </Button>

          {onProceedAnyway && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedAnyway();
              }}
              className="w-full py-2.5 text-xs text-[#A1A69A] hover:text-[#FF6868] font-medium transition-colors"
            >
              Proceed Anyway (Allow Overdraft)
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
