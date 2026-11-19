// AURIX - Optional Supabase Cloud Sync & Encrypted Backup Service
// 100% Optional. Disabled by default. Zero data leaves the device unless explicitly configured.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SettingsRepository } from '../db/repositories/settingsRepository';

export interface SyncStatus {
  enabled: boolean;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncedAt?: string;
  errorMessage?: string;
}

export class SyncService {
  private static client: SupabaseClient | null = null;
  private static isSyncingInProgress = false;

  /**
   * Initializes or updates the optional Supabase client.
   */
  static initClient(url?: string, anonKey?: string): SupabaseClient | null {
    if (!url || !anonKey) {
      this.client = null;
      return null;
    }
    try {
      this.client = createClient(url, anonKey);
      return this.client;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  /**
   * Diagnostic connection test for user-supplied Supabase URL & Anon Key
   */
  static async testConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'Please enter both Supabase Project URL and Anon Key.' };
    }

    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      return {
        success: false,
        message: "Invalid Supabase URL format. It should look like 'https://your-ref.supabase.co'. Copy it from Supabase -> Project Settings -> API.",
      };
    }

    try {
      const client = createClient(cleanUrl, cleanKey);
      const { data, error } = await client.from('monetra_backups').select('user_id').limit(1);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return {
            success: false,
            message: "Table 'monetra_backups' not found in Supabase. Run the SQL setup commands in Supabase SQL Editor.",
          };
        }
        if (error.message?.toLowerCase().includes('data api') || error.message?.toLowerCase().includes('api disabled')) {
          return {
            success: false,
            message: "Supabase Data API Disabled: In Supabase Dashboard -> Table Editor -> monetra_backups, click 'Data API settings' to enable access.",
          };
        }
        if (
          error.code === '42501' ||
          error.code === 'PGRST301' ||
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('permission denied') ||
          error.message?.toLowerCase().includes('policy') ||
          error.message?.toLowerCase().includes('jwt')
        ) {
          return {
            success: false,
            message: `Supabase Permission Error (${error.code || 'RLS'}): If table badge says API DISABLED, enable Data API settings for monetra_backups in Supabase.`,
          };
        }
        return { success: false, message: `Supabase error (${error.code || 'API'}): ${error.message}` };
      }

      return { success: true, message: '✅ Connected successfully to Supabase! Table monetra_backups verified.' };
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
        return {
          success: false,
          message: `Could not reach '${cleanUrl}'. Please check your Supabase Project URL for typos or verify your internet connection.`,
        };
      }
      return { success: false, message: `Connection test failed: ${err.message}` };
    }
  }

  /**
   * Performs an encrypted vault backup to the optional Supabase cloud storage.
   * Uses user_id as primary key to prevent duplicate sync entries.
   */
  static async backupToCloud(passphrase = 'monetra_local_key', customUrl?: string, customAnonKey?: string): Promise<boolean> {
    const settings = await SettingsRepository.get();
    const url = customUrl || settings.cloud_url;
    const anonKey = customAnonKey || settings.cloud_anon_key;

    if (!url || !anonKey) {
      throw new Error('Supabase cloud credentials (Project URL and Anon Key) missing.');
    }

    const client = this.initClient(url, anonKey);
    if (!client) throw new Error('Supabase client could not be configured.');

    // 1. Export local DB payload
    const rawDataJson = await SettingsRepository.exportAllData();

    // 2. Encrypt payload using Web Crypto AES-GCM
    const encryptedPayload = await this.encryptData(rawDataJson, passphrase);
    const now = new Date().toISOString();

    // 3. Upsert into Supabase monetra_backups table (user_id primary key prevents duplicates)
    let { error } = await client
      .from('monetra_backups')
      .upsert({
        user_id: settings.id,
        payload: encryptedPayload,
        updated_at: now,
      });

    // Handle missing table error by attempting auto-creation RPC if configured
    if (error) {
      if (error.code === '42P01') {
        try {
          await client.rpc('create_monetra_backups_table');
          const retry = await client
            .from('monetra_backups')
            .upsert({
              user_id: settings.id,
              payload: encryptedPayload,
              updated_at: now,
            });
          error = retry.error;
        } catch (rpcErr) {
          // Fall through
        }
      }
    }

    if (error) {
      if (error.code === '42P01') {
        throw new Error("Table 'monetra_backups' not found in Supabase. Run SQL: CREATE TABLE monetra_backups (user_id text primary key, payload text, updated_at text); ALTER TABLE monetra_backups DISABLE ROW LEVEL SECURITY;");
      }
      if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('permission denied') || error.message?.toLowerCase().includes('policy')) {
        throw new Error("Supabase RLS Permission Error: Please run this in Supabase SQL Editor: ALTER TABLE monetra_backups DISABLE ROW LEVEL SECURITY;");
      }
      console.error('Supabase backup error:', error);
      throw new Error(error.message);
    }

    // Update settings with last backup time and credentials
    await SettingsRepository.update({
      cloud_backup_enabled: true,
      cloud_url: url,
      cloud_anon_key: anonKey,
      last_backup_at: now,
    });

    return true;
  }

  /**
   * Automatic background sync triggered whenever new data is added or modified.
   * Runs in non-blocking mode without duplicating rows.
   */
  static async autoSyncInBackground(): Promise<void> {
    if (this.isSyncingInProgress) return;
    try {
      const settings = await SettingsRepository.get();
      if (!settings.cloud_backup_enabled || !settings.cloud_url || !settings.cloud_anon_key) {
        return;
      }
      this.isSyncingInProgress = true;
      await this.backupToCloud();
    } catch (err) {
      console.warn('Background Cloud Sync silent warning:', err);
    } finally {
      this.isSyncingInProgress = false;
    }
  }

  /**
   * Restores database from optional Supabase backup.
   */
  static async restoreFromCloud(passphrase = 'monetra_local_key', customUrl?: string, customAnonKey?: string): Promise<boolean> {
    const settings = await SettingsRepository.get();
    const url = customUrl || settings.cloud_url;
    const anonKey = customAnonKey || settings.cloud_anon_key;

    if (!url || !anonKey) {
      throw new Error('Supabase cloud credentials (Project URL and Anon Key) missing.');
    }

    const client = this.initClient(url, anonKey);
    if (!client) throw new Error('Supabase client failed to connect.');

    const { data, error } = await client
      .from('monetra_backups')
      .select('payload')
      .eq('user_id', settings.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('No cloud backup record found for this user account.');
      }
      if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('permission denied') || error.message?.toLowerCase().includes('policy')) {
        throw new Error("Supabase RLS Permission Error: Please run this in Supabase SQL Editor: ALTER TABLE monetra_backups DISABLE ROW LEVEL SECURITY;");
      }
      throw new Error(error.message);
    }

    if (error || !data) {
      throw new Error('No cloud backup found for this account.');
    }

    // Decrypt
    const decryptedJson = await this.decryptData(data.payload, passphrase);
    const success = await SettingsRepository.importData(decryptedJson);
    if (success) {
      await SettingsRepository.update({
        cloud_backup_enabled: true,
        cloud_url: url,
        cloud_anon_key: anonKey,
      });
    }
    return success;
  }

  /**
   * Client-side AES-GCM encryption using Web Crypto API
   */
  private static async encryptData(plainText: string, passphrase: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Client-side AES-GCM decryption
   */
  private static async decryptData(cipherBase64: string, passphrase: string): Promise<string> {
    const binStr = atob(cipherBase64);
    const combined = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      combined[i] = binStr.charCodeAt(i);
    }

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  }
}

