// AURIX PRO - First-Time Single-Device License Activation Gate Modal
import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Smartphone, Sparkles, Lock, CheckCircle2, ArrowRight, ExternalLink, Clipboard } from 'lucide-react';
import { Button } from '../common/Button';
import { LicenseService } from '../../services/licenseService';

interface ActivationGateModalProps {
  isOpen: boolean;
  onActivated: () => void;
  onOpenAdminPortal: () => void;
}

export const ActivationGateModal: React.FC<ActivationGateModalProps> = ({
  isOpen,
  onActivated,
  onOpenAdminPortal,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const { deviceName } = LicenseService.getDeviceFingerprint();

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = LicenseService.formatKeyInput(e.target.value);
    setKeyInput(formatted);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formatted = LicenseService.formatKeyInput(pastedText);
    setKeyInput(formatted);
  };

  const handleClipboardButtonClick = async () => {
    setStatusMsg(null);
    let pastedText = '';

    // Method 1: Web Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        pastedText = await navigator.clipboard.readText();
      } catch (err) {
        // WebView permission blocked on phone
      }
    }

    // Method 2: Fallback prompt for native Android / iOS WebView
    if (!pastedText) {
      const userPasted = prompt('Paste your 12-character activation key below:');
      if (userPasted) {
        pastedText = userPasted;
      }
    }

    if (pastedText) {
      const formatted = LicenseService.formatKeyInput(pastedText);
      setKeyInput(formatted);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setIsActivating(true);

    try {
      const result = await LicenseService.activateKey(keyInput);
      setStatusMsg(result.message);
      setTimeout(() => {
        onActivated();
      }, 1500);
    } catch (err: any) {
      setStatusMsg(err.message || 'Activation failed. Please check key.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090A]/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 bg-[#111317] border border-[#313744] rounded-[28px] shadow-2xl space-y-5 text-center">
        {/* Brand Identity */}
        <div className="flex flex-col items-center space-y-2">
          <img
            src="/logo.jpg"
            alt="AURIX Logo"
            className="w-16 h-16 rounded-2xl border border-[#313744] object-cover shadow-xl ring-2 ring-[#D4AF37]/30"
          />
          <h2 className="text-xl font-black text-white tracking-wider flex items-center gap-1.5">
            AURIX <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1C2019] text-[#D4AF37] border border-[#D4AF37]/40">PRO</span>
          </h2>
          <p className="text-xs text-[#94A3B8]">Single-Device License Key Activation</p>
        </div>

        {/* Device Information Badge */}
        <div className="p-3 bg-[#191C22] border border-[#313744] rounded-2xl flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider">
            <Smartphone className="w-4 h-4 text-[#38BDF8]" />
            <span>DEVICE NAME:</span>
          </span>
          <span className="font-bold text-white truncate max-w-[170px]">{deviceName}</span>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="space-y-3.5 text-left">
          <div>
            <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
              12-Character Activation Key
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                maxLength={19}
                value={keyInput}
                onChange={handleKeyChange}
                onPaste={handlePaste}
                placeholder="A7B9-K3X2-M8Q1"
                className="w-full bg-[#08090A] border border-[#313744] focus:border-[#E7FF32] rounded-2xl pl-4 pr-20 py-3 text-center text-base font-mono font-bold text-[#E7FF32] tracking-widest uppercase focus:outline-none shadow-inner"
              />
              <button
                type="button"
                onClick={handleClipboardButtonClick}
                className="absolute right-2 px-2.5 py-1.5 rounded-xl bg-[#1C2019] hover:bg-[#23281F] border border-[#313744] hover:border-[#E7FF32] text-[11px] font-bold text-[#E7FF32] flex items-center space-x-1 transition-colors cursor-pointer shadow-sm"
                title="Paste key from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium text-center ${
                statusMsg.includes('✅') || statusMsg.includes('verified')
                  ? 'bg-[#4ADE80]/10 border border-[#4ADE80]/40 text-[#4ADE80]'
                  : 'bg-[#FF6868]/10 border border-[#FF6868]/40 text-[#FF6868]'
              }`}
            >
              {statusMsg}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            disabled={isActivating || keyInput.replace(/[^A-Z0-9]/g, '').length < 12}
            className="py-3 text-sm font-extrabold uppercase tracking-wider shadow-[0_0_20px_rgba(231,255,50,0.25)] cursor-pointer"
          >
            {isActivating ? (
              <span>Binding Hardware & Activating...</span>
            ) : (
              <span className="flex items-center justify-center space-x-1.5">
                <span>Unlock AURIX PRO</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="text-[11px] text-[#94A3B8] leading-relaxed">
          Once activated, your 12-character license is permanently bound to this hardware device for unlimited offline use.
        </p>

        {/* Contact Owner Purchase Notice */}
        <div className="pt-3.5 border-t border-[#313744]/60 text-xs text-[#94A3B8] space-y-2">
          <div className="text-[11px]">Contact Owner for purchasing Activation Key:</div>
          <a
            href="https://www.instagram.com/aadhi.xr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 font-extrabold text-sm text-[#E7FF32] bg-[#1C2019] hover:bg-[#23281F] px-3.5 py-1.5 rounded-xl border border-[#D4AF37]/50 hover:border-[#E7FF32] transition-colors shadow-md cursor-pointer"
          >
            <span>ααdhí</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
          </a>
        </div>
      </div>
    </div>
  );
};
