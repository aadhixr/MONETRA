// AURIX PRO - Integrated Owner Admin License Management Tab Screen
// Password-Protected (Salted SHA-256) Key Generator, Device Audit & Remote Revoke Dashboard

import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Smartphone, Plus, RefreshCw, Copy, Trash2, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { LicenseAdminService, type AdminLiveStats } from '../../services/licenseAdminService';
import type { LicenseRecord } from '../../services/licenseService';

export const AdminTabScreen: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [keys, setKeys] = useState<LicenseRecord[]>([]);
  const [stats, setStats] = useState<AdminLiveStats>({ totalKeys: 0, activeDevices: 0, unusedKeys: 0, revokedKeys: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Key Generation Form State
  const [customerNote, setCustomerNote] = useState('');
  const [batchCount, setBatchCount] = useState(5);
  const [newlyCreatedKeys, setNewlyCreatedKeys] = useState<LicenseRecord[]>([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'activated' | 'revoked'>('all');

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const all = await LicenseAdminService.getAllKeys();
      setKeys(all);
      setStats(LicenseAdminService.computeLiveStats(all));
    } catch (err: any) {
      setSyncStatusMsg(`Failed to load Firebase keys: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const isValid = await LicenseAdminService.verifyAdminPassword(passwordInput);
    if (isValid) {
      localStorage.setItem('aurix_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      setAuthError('Incorrect Owner Admin Passcode.');
    }
  };

  const handleGenerateSingle = async () => {
    setIsLoading(true);
    setSyncStatusMsg(null);
    try {
      const newKey = await LicenseAdminService.createSingleKey(customerNote);
      setNewlyCreatedKeys([newKey]);
      setCustomerNote('');
      setSyncStatusMsg(`✅ Key generated: ${newKey.key}`);
      await loadAdminData();
    } catch (err: any) {
      setSyncStatusMsg(`Generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    setIsLoading(true);
    setSyncStatusMsg(null);
    try {
      const batch = await LicenseAdminService.createBatchKeys(batchCount, customerNote || 'Batch Sale');
      setNewlyCreatedKeys(batch);
      setCustomerNote('');
      setSyncStatusMsg(`✅ ${batch.length} activation keys generated successfully!`);
      await loadAdminData();
    } catch (err: any) {
      setSyncStatusMsg(`Batch generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDevice = async (rawKey: string) => {
    if (!confirm(`Reset device lock for key '${rawKey}'? This allows customer to reactivate on a new device.`)) return;
    setIsLoading(true);
    try {
      await LicenseAdminService.resetDeviceBinding(rawKey);
      setSyncStatusMsg(`Device lock cleared for ${rawKey}.`);
      await loadAdminData();
    } catch (err: any) {
      setSyncStatusMsg(`Reset failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeKey = async (rawKey: string) => {
    if (!confirm(`Revoke key '${rawKey}'? Customer device will lose access immediately.`)) return;
    setIsLoading(true);
    try {
      await LicenseAdminService.revokeKey(rawKey);
      setSyncStatusMsg(`Key ${rawKey} revoked.`);
      await loadAdminData();
    } catch (err: any) {
      setSyncStatusMsg(`Revoke failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (rawKey: string) => {
    if (!confirm(`Permanently delete key '${rawKey}' from Firebase?`)) return;
    setIsLoading(true);
    try {
      await LicenseAdminService.deleteKey(rawKey);
      setSyncStatusMsg(`Key ${rawKey} deleted.`);
      await loadAdminData();
    } catch (err: any) {
      setSyncStatusMsg(`Delete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredKeys = keys.filter((k) => {
    const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      k.key.toLowerCase().includes(q) ||
      (k.customer_note && k.customer_note.toLowerCase().includes(q)) ||
      (k.bound_device_name && k.bound_device_name.toLowerCase().includes(q)) ||
      (k.bound_device_id && k.bound_device_id.toLowerCase().includes(q));

    return matchesStatus && matchesQuery;
  });

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto py-12">
        <Card className="p-6 bg-[#151812] border-[#30352B] rounded-[28px] text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#E7FF32]/10 text-[#E7FF32] flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Owner Admin Passcode Required</h3>
            <p className="text-xs text-[#A1A69A] mt-1">Enter owner passcode to open Admin License Portal</p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-3">
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Owner Passcode"
              className="w-full bg-[#1C2019] border border-[#30352B] focus:border-[#E7FF32] rounded-2xl px-4 py-3 text-center text-sm font-mono font-bold text-white focus:outline-none"
            />

            {authError && <div className="text-xs text-[#FF6868] font-semibold">{authError}</div>}

            <Button type="submit" variant="primary" fullWidth size="md" className="py-2.5 font-bold">
              Unlock Owner Admin Tab
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-24">
      {/* Live Admin Analytics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <span className="text-[10px] text-[#A1A69A] uppercase font-bold tracking-wider block">Active Devices</span>
          <span className="text-2xl font-black text-[#A8E66A] num-tabular">{stats.activeDevices}</span>
        </div>

        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <span className="text-[10px] text-[#A1A69A] uppercase font-bold tracking-wider block">Unused Keys</span>
          <span className="text-2xl font-black text-[#E7FF32] num-tabular">{stats.unusedKeys}</span>
        </div>

        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <span className="text-[10px] text-[#A1A69A] uppercase font-bold tracking-wider block">Total Keys</span>
          <span className="text-2xl font-black text-white num-tabular">{stats.totalKeys}</span>
        </div>

        <div className="p-4 bg-[#1C2019] border border-[#30352B] rounded-2xl">
          <span className="text-[10px] text-[#A1A69A] uppercase font-bold tracking-wider block">Revoked</span>
          <span className="text-2xl font-black text-[#FF6868] num-tabular">{stats.revokedKeys}</span>
        </div>
      </div>

      {/* Key Generation Tool */}
      <div className="p-5 bg-[#151812] border border-[#E7FF32]/40 rounded-[24px] space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-[#30352B]">
          <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center">
            <Plus className="w-4 h-4 mr-1.5 text-[#E7FF32]" />
            Generate New 12-Character Activation Keys
          </span>
          <button
            type="button"
            onClick={loadAdminData}
            disabled={isLoading}
            className="text-xs text-[#A1A69A] hover:text-[#E7FF32] flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live DB</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7">
            <label className="block text-[11px] text-[#A1A69A] mb-1 font-semibold">Customer Order / Sales Note (Optional)</label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g. Order #1042 - Rahul ($49 License)"
              className="w-full bg-[#1C2019] border border-[#30352B] focus:border-[#E7FF32] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-5 flex items-end space-x-2">
            <Button variant="primary" size="sm" fullWidth onClick={handleGenerateSingle} disabled={isLoading}>
              + 1 Key
            </Button>
            <div className="flex items-center space-x-1.5 shrink-0">
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="bg-[#1C2019] border border-[#30352B] rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
              >
                <option value={5}>5 Keys</option>
                <option value={10}>10 Keys</option>
                <option value={20}>20 Keys</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleGenerateBatch} disabled={isLoading}>
                Batch
              </Button>
            </div>
          </div>
        </div>

        {/* Display Newly Created Keys with 1-Click Copy */}
        {newlyCreatedKeys.length > 0 && (
          <div className="p-3.5 bg-[#090B08] border border-[#E7FF32]/60 rounded-2xl space-y-2 text-xs animate-in fade-in">
            <div className="flex items-center justify-between text-[#E7FF32] font-bold">
              <span>Generated {newlyCreatedKeys.length} Key(s):</span>
              <button
                type="button"
                onClick={() => {
                  const text = newlyCreatedKeys.map((k) => k.key).join('\n');
                  navigator.clipboard.writeText(text);
                  alert('Keys copied to clipboard!');
                }}
                className="flex items-center space-x-1 text-[11px] hover:underline cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </button>
            </div>
            <div className="font-mono text-white font-bold select-all space-y-1 max-h-32 overflow-y-auto">
              {newlyCreatedKeys.map((k) => (
                <div key={k.key} className="flex justify-between items-center py-0.5 border-b border-[#30352B]/40">
                  <span className="text-[#E7FF32]">{k.key}</span>
                  <span className="text-[10px] font-normal text-[#A1A69A]">{k.customer_note || 'Single Sale'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key Audit & Device Tracking Table */}
      <div className="p-5 bg-[#1C2019] border border-[#30352B] rounded-[24px] space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#30352B]">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
            <Smartphone className="w-4 h-4 mr-1.5 text-[#38BDF8]" />
            Key & Live Device Directory ({filteredKeys.length})
          </span>

          {/* Search & Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys, devices..."
                className="bg-[#151812] border border-[#30352B] rounded-xl pl-7 pr-3 py-1.5 text-xs text-white w-44 focus:outline-none focus:border-[#38BDF8]"
              />
              <Search className="w-3.5 h-3.5 text-[#A1A69A] absolute left-2.5 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#151812] border border-[#30352B] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="activated">Activated</option>
              <option value="unused">Unused</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 bg-[#E7FF32]/10 border border-[#E7FF32]/40 rounded-xl text-xs text-[#E7FF32]">
            {statusMsg}
          </div>
        )}

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#A1A69A]">
            <thead className="bg-[#151812] text-white uppercase text-[10px] font-bold border-b border-[#30352B]">
              <tr>
                <th className="py-3 px-3.5">Key Code</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Bound Device Name & ID</th>
                <th className="py-3 px-3.5">Customer Note</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30352B]/60">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#A1A69A]">
                    No activation keys found. Click "+ 1 Key" above to generate your first key.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((k) => (
                  <tr key={k.key} className="hover:bg-[#151812]/50 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-[#E7FF32] select-all">
                      {k.key}
                    </td>
                    <td className="py-3 px-3.5">
                      {k.status === 'activated' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A8E66A]/15 text-[#A8E66A] border border-[#A8E66A]/40">
                          ACTIVATED
                        </span>
                      )}
                      {k.status === 'unused' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FF32]/15 text-[#E7FF32] border border-[#E7FF32]/40">
                          UNUSED
                        </span>
                      )}
                      {k.status === 'revoked' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF6868]/15 text-[#FF6868] border border-[#FF6868]/40">
                          REVOKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      {k.bound_device_name ? (
                        <div>
                          <span className="font-bold text-white block">{k.bound_device_name}</span>
                          <span className="font-mono text-[10px] text-[#A1A69A]">{k.bound_device_id?.slice(0, 16)}...</span>
                        </div>
                      ) : (
                        <span className="text-[#A1A69A] italic">Not Bound</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-white">
                      {k.customer_note || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {k.status === 'activated' && (
                          <button
                            type="button"
                            onClick={() => handleResetDevice(k.key)}
                            className="px-2 py-1 rounded bg-[#23281F] text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#38BDF8] hover:text-[#090B08] text-[10px] font-bold transition-colors cursor-pointer"
                            title="Unbind Device Lock (Allows phone migration)"
                          >
                            Unbind
                          </button>
                        )}
                        {k.status !== 'revoked' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.key)}
                            className="px-2 py-1 rounded bg-[#23281F] text-[#FF6868] border border-[#FF6868]/40 hover:bg-[#FF6868] hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            title="Revoke Key Access"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.key)}
                          className="p-1 text-[#A1A69A] hover:text-[#FF6868] transition-colors cursor-pointer"
                          title="Delete Key Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
