// AURIX - Settings & Data Management
import React, { useState } from 'react';
import { Settings, User, Database, Download, Upload, Shield, Trash2, CheckCircle2, Palette, Check, Smartphone, RefreshCw, ExternalLink, Info, Globe, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { SettingsRepository } from '../../db/repositories/settingsRepository';
import { THEMES, normalizeThemeId } from '../../engine/themes';
import { SUPPORTED_CURRENCIES, CurrencyService } from '../../services/currencyService';
import type { ThemeId } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplaySplash?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, refreshData, openAdminPortal } = useFinancial();

  const [userName, setUserName] = useState(settings?.user_name || 'Alex');
  const [selectedCurrency, setSelectedCurrency] = useState(settings?.currency_code || 'INR');
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Wireless OTA Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    latestTag?: string;
    downloadUrl?: string;
    message?: string;
  }>({ checked: false, hasUpdate: false });

  const currentThemeId = normalizeThemeId(settings?.theme);

  const handleThemeChange = async (newThemeId: ThemeId) => {
    await updateSettings({ theme: newThemeId });
    const themeName = THEMES.find((t) => t.id === newThemeId)?.name || 'New Theme';
    setSyncStatusMsg(`Theme switched to ${themeName}!`);
    setTimeout(() => setSyncStatusMsg(null), 2500);
  };

  const handleCurrencyChange = async (newCode: string) => {
    if (newCode === selectedCurrency || isConvertingCurrency) return;

    const oldCurrInfo = SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];
    const newCurrInfo = SUPPORTED_CURRENCIES.find((c) => c.code === newCode) || SUPPORTED_CURRENCIES[0];

    const confirmMsg = `Auto-convert all accounts, transactions, budgets, and savings from ${oldCurrInfo.flag} ${oldCurrInfo.code} (${oldCurrInfo.symbol}) to ${newCurrInfo.flag} ${newCurrInfo.code} (${newCurrInfo.symbol}) using live exchange rates?`;
    if (!confirm(confirmMsg)) return;

    setIsConvertingCurrency(true);
    setSyncStatusMsg(`Fetching live exchange rates & converting database to ${newCurrInfo.code}...`);

    try {
      const { multiplier, success } = await CurrencyService.convertEntireDatabaseCurrency(selectedCurrency, newCode);
      if (success) {
        await updateSettings({
          currency_code: newCurrInfo.code,
          currency_symbol: newCurrInfo.symbol,
          locale: newCurrInfo.locale,
        });
        setSelectedCurrency(newCurrInfo.code);
        await refreshData();
        setSyncStatusMsg(`✅ Database converted to ${newCurrInfo.flag} ${newCurrInfo.code}! Rate: 1 ${oldCurrInfo.code} = ${multiplier.toFixed(4)} ${newCurrInfo.code}`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Currency conversion error: ${err.message}`);
    } finally {
      setIsConvertingCurrency(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      user_name: userName.trim() || 'Alex',
    });
    setSyncStatusMsg('Settings saved successfully!');
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  const handleExportJSON = async () => {
    try {
      const jsonStr = await SettingsRepository.exportAllData();
      const filename = `aurix_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;

      // Universal Data URI download (Works on Desktop + Android WebView)
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(jsonStr)}`;
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSyncStatusMsg('JSON backup exported & downloaded successfully!');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg(`Export failed: ${err.message}`);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) {
          setSyncStatusMsg('Import failed. File is empty.');
          return;
        }
        const success = await SettingsRepository.importData(text);
        if (success) {
          await refreshData();
          setSyncStatusMsg('Backup imported successfully! All records restored.');
          setTimeout(() => setSyncStatusMsg(null), 4000);
        } else {
          setSyncStatusMsg('Import failed. Invalid AURIX / MONETRA JSON backup file.');
        }
      };
      reader.onerror = () => {
        setSyncStatusMsg('Failed to read file.');
      };
      reader.readAsText(file);
    } catch (err: any) {
      setSyncStatusMsg(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  };

  const CURRENT_APP_VERSION = 'v1.1.7';
  const CURRENT_BUILD_NUMBER = '117';
  const LAST_UPDATE_DATE = '19 Nov 2026';

  const parseSemVer = (tag: string): number[] => {
    return tag
      .trim()
      .toLowerCase()
      .replace(/^v/, '')
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  };

  const isNewerVersion = (remoteTag: string, localTag: string): boolean => {
    const r = parseSemVer(remoteTag);
    const l = parseSemVer(localTag);
    const len = Math.max(r.length, l.length);
    for (let i = 0; i < len; i++) {
      const rPart = r[i] ?? 0;
      const lPart = l[i] ?? 0;
      if (rPart > lPart) return true;
      if (rPart < lPart) return false;
    }
    return false;
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch('https://api.github.com/repos/aadhixr/MONETRA/releases/latest');
      if (!res.ok) {
        throw new Error('Could not connect to GitHub Release API');
      }
      const data = await res.json();
      const latestTag = data.tag_name || CURRENT_APP_VERSION;
      const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || data.html_url;

      if (isNewerVersion(latestTag, CURRENT_APP_VERSION)) {
        setUpdateStatus({
          checked: true,
          hasUpdate: true,
          latestTag,
          downloadUrl,
          message: `New Wireless Update Available (${latestTag})!`,
        });
      } else {
        setUpdateStatus({
          checked: true,
          hasUpdate: false,
          latestTag,
          message: `You are running the latest version of AURIX PRO (${CURRENT_APP_VERSION}).`,
        });
      }
    } catch (err: any) {
      setUpdateStatus({
        checked: true,
        hasUpdate: false,
        message: `Update check failed: ${err.message}`,
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleFactoryReset = async () => {
    if (confirm('CRITICAL: This will erase all local transactions and reset database. Have you exported your data? Proceed?')) {
      await SettingsRepository.resetEntireDatabase();
      await refreshData();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Data Management"
      subtitle="Privacy-first, zero-tracking fintech architecture"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Brand Banner & Logo */}
        <div className="p-4 bg-gradient-to-r from-[#141712] via-[#1C2019] to-[#141712] border border-[#30352B] rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <img
              src="/logo.jpg"
              alt="AURIX Icon"
              className="w-12 h-12 rounded-2xl shadow-lg border border-[#30352B] object-cover shrink-0 bg-black"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-wider">AURIX</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40">PRO</span>
              </div>
              <p className="text-xs text-[#A1A69A] mt-0.5">Institutional Wealth & Precision Ledger</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <form onSubmit={handleSaveProfile} className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[#30352B]">
            <User className="w-4 h-4 text-[#E7FF32]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">User Profile</span>
          </div>

          <div>
            <label className="block text-xs text-[#A1A69A] mb-1">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-[#151812] border border-[#30352B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E7FF32]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-[#A1A69A]">
            <div>
              <span>Currency:</span> <strong className="text-white">INR (₹)</strong>
            </div>
            <div>
              <span>Default Locale:</span> <strong className="text-white">en-IN</strong>
            </div>
          </div>

          <Button type="submit" variant="primary" size="sm" fullWidth>
            Save Profile
          </Button>
        </form>

        {/* Global Currency & Live Auto-Conversion */}
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Primary Currency & Live Auto-Conversion
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2 py-0.5 rounded-full">
              Live Rates
            </span>
          </div>

          <p className="text-[11px] text-[#A1A69A]">
            Changing primary currency fetches live exchange rates and automatically converts all accounts, transactions, and budgets seamlessly.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#A1A69A] mb-1">Select Primary Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              disabled={isConvertingCurrency}
              className="w-full bg-[#151812] border border-[#30352B] focus:border-[#38BDF8] rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme Options Section in Profile */}
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-[#E7FF32]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Theme & Color Palette ({THEMES.length} Options)
              </span>
            </div>
            <span className="text-[10px] text-[#E7FF32] font-semibold bg-[#E7FF32]/10 border border-[#E7FF32]/30 px-2 py-0.5 rounded-full">
              Live Preview
            </span>
          </div>

          <p className="text-[11px] text-[#A1A69A]">
            Select a custom fintech visual aesthetic. All cards, charts, balance badges, and glowing accents update immediately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {THEMES.map((t) => {
              const isSelected = currentThemeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 relative group cursor-pointer ${
                    isSelected
                      ? 'border-[#E7FF32] bg-[#151812] shadow-[0_0_14px_rgba(231,255,50,0.22)]'
                      : 'border-[#30352B] bg-[#151812]/70 hover:border-[#30352B]/90 hover:bg-[#151812]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">
                      {t.name}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center space-x-1 text-[10px] font-bold text-[#E7FF32]">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#A1A69A] group-hover:text-white transition-colors">
                        Tap to apply
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[#A1A69A] mb-2.5 line-clamp-1">
                    {t.tagline}
                  </p>

                  {/* Swatches preview circles */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {t.previewColors.map((col, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-black/40 shadow-sm shrink-0"
                          style={{ backgroundColor: col }}
                          title={`Color ${idx + 1}: ${col}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: t.accent }}>
                      {t.accent}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Storage & Export / Import */}
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-[#30352B]">
            <Database className="w-4 h-4 text-[#A8E66A]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Local Vault Export / Import
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
            </Button>

            <label className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#23281F] text-white hover:bg-[#30352B] border border-[#30352B] rounded-full text-xs font-medium cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
            </label>
          </div>
        </div>

        {/* Factory Reset */}
        <div className="p-4 bg-[#FF6868]/10 border border-[#FF6868]/30 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-[#FF6868]">
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Danger Zone</span>
          </div>
          <p className="text-[11px] text-[#A1A69A]">
            Reset entire local IndexedDB database and restore initial default setup.
          </p>
          <Button variant="danger" size="sm" fullWidth onClick={handleFactoryReset}>
            Reset All Data
          </Button>
        </div>

        {/* App Version Info & Wireless OTA Update Check */}
        <div className="p-4 bg-[#151812] border border-[#30352B] rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-[#E7FF32]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Application Info & Wireless Updates
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center py-1">
            <div className="p-2 bg-[#1C2019] border border-[#30352B] rounded-xl">
              <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">App Name</span>
              <span className="text-xs font-bold text-white">AURIX PRO</span>
            </div>
            <div className="p-2 bg-[#1C2019] border border-[#30352B] rounded-xl">
              <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">Version</span>
              <span className="text-xs font-bold text-[#E7FF32] font-mono">{CURRENT_APP_VERSION}</span>
            </div>
            <div className="p-2 bg-[#1C2019] border border-[#30352B] rounded-xl">
              <span className="block text-[10px] text-[#A1A69A] uppercase tracking-wider">Last Updated</span>
              <span className="text-xs font-bold text-white">{LAST_UPDATE_DATE}</span>
            </div>
          </div>

          {/* Wireless Update Action Button */}
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1C2019] hover:bg-[#23281F] border border-[#30352B] hover:border-[#E7FF32]/60 text-xs font-bold text-[#E7FF32] flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking GitHub Releases...' : 'Check Wireless Update'}</span>
            </button>

            {/* Owner Admin License Key Portal Access (Visible only in Admin Mode) */}
            {typeof localStorage !== 'undefined' && localStorage.getItem('aurix_admin_authenticated') === 'true' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAdminPortal();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#1C2019] hover:bg-[#23281F] border border-[#30352B] hover:border-[#E7FF32] text-xs font-bold text-[#A1A69A] hover:text-[#E7FF32] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#E7FF32]" />
                <span>Owner Admin License Portal</span>
              </button>
            )}
          </div>

          {/* Update Status Banner & Download Button */}
          {updateStatus.checked && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                updateStatus.hasUpdate
                  ? 'bg-[#E7FF32]/10 border-[#E7FF32]/50 text-white'
                  : 'bg-[#1C2019] border-[#30352B] text-[#A1A69A]'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Info className="w-4 h-4 text-[#E7FF32] shrink-0" />
                <span className="font-semibold text-white">{updateStatus.message}</span>
              </div>

              {updateStatus.hasUpdate && updateStatus.downloadUrl && (
                <a
                  href={updateStatus.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 rounded-lg bg-[#E7FF32] text-[#090B08] font-bold text-xs hover:bg-[#C9E927] transition-all shadow-[0_0_12px_rgba(231,255,50,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Latest Release APK ({updateStatus.latestTag})</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              )}
            </div>
          )}
        </div>

        {syncStatusMsg && (
          <div className="p-3 bg-[#E7FF32]/10 border border-[#E7FF32]/40 rounded-xl text-xs text-[#E7FF32]">
            {syncStatusMsg}
          </div>
        )}

        {/* Developer Credit Footer */}
        <div className="pt-3 text-center border-t border-[#30352B]/60 flex items-center justify-center space-x-1.5 text-xs text-[#A1A69A]">
          <span>Developed by</span>
          <a
            href="https://github.com/Aadhi000"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-sm text-[#E7FF32] tracking-wider font-mono hover:text-white transition-colors cursor-pointer inline-flex items-center space-x-1"
          >
            <span>ααdhí</span>
            <ExternalLink className="w-3 h-3 text-[#D4AF37] ml-0.5" />
          </a>
        </div>
      </div>
    </Modal>
  );
};

