// AURIX - Single-Device 12-Character License Key Engine
// Connects to Firebase Realtime Database and binds 12-character activation keys to hardware UUIDs.

export interface LicenseRecord {
  key: string;               // e.g. "A7B9-K3X2-M8Q1"
  status: 'unused' | 'activated' | 'revoked';
  bound_device_id?: string;
  bound_device_name?: string;
  customer_note?: string;
  created_at: string;
  activated_at?: string;
}

export class LicenseService {
  private static FIREBASE_DB_URL = 'https://monetra-admin-default-rtdb.firebaseio.com';
  private static FIREBASE_API_KEY = 'AIzaSyClA49RA2x0GjRNlhi1Fp9dgt7rK7540zE';

  /**
   * Generates a stable unique hardware fingerprint and model string for this device
   */
  static getDeviceFingerprint(): { deviceId: string; deviceName: string } {
    if (typeof window === 'undefined') {
      return { deviceId: 'server_env', deviceName: 'Server' };
    }

    let deviceId = localStorage.getItem('aurix_hardware_device_id');
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('aurix_hardware_device_id', deviceId);
    }

    const ua = navigator.userAgent;
    let deviceName = 'Desktop Browser';

    if (/android/i.test(ua)) {
      const match = ua.match(/Build\/([a-z0-9_]+)/i) || ua.match(/\(([^;]+);/);
      deviceName = match ? `Android Device (${match[1]})` : 'Android Device';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      deviceName = 'Apple iPhone / iPad';
    } else if (/mac/i.test(ua)) {
      deviceName = 'macOS Workstation';
    } else if (/win/i.test(ua)) {
      deviceName = 'Windows PC';
    }

    return { deviceId, deviceName };
  }

  /**
   * Normalizes a 12-character key input into uppercase clean key
   */
  static formatKeyInput(input: string): string {
    const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (clean.length > 8) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
    }
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
    }
    return clean;
  }

  /**
   * Validates if local storage contains an active valid device license or admin mode
   */
  static isAppLicensed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    if (localStorage.getItem('aurix_admin_authenticated') === 'true') {
      return true;
    }
    const token = localStorage.getItem('aurix_active_license_token');
    if (!token) return false;

    try {
      const parsed = JSON.parse(token);
      const { deviceId } = this.getDeviceFingerprint();
      return Boolean(parsed && parsed.key && parsed.deviceId === deviceId);
    } catch (e) {
      return false;
    }
  }

  /**
   * Verifies live license key status against Firebase Realtime Database.
   * If key was revoked, unbound, or deleted on Firebase, clears local token & locks app immediately!
   */
  static async checkLiveLicenseStatus(): Promise<boolean> {
    if (typeof localStorage === 'undefined') return false;

    // Admin mode bypasses key check
    if (localStorage.getItem('aurix_admin_authenticated') === 'true') {
      return true;
    }

    const token = localStorage.getItem('aurix_active_license_token');
    if (!token) return false;

    try {
      const parsed = JSON.parse(token);
      if (!parsed || !parsed.key) {
        localStorage.removeItem('aurix_active_license_token');
        return false;
      }

      const cleanKey = parsed.key.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const { deviceId } = this.getDeviceFingerprint();

      const fetchUrl = `${this.FIREBASE_DB_URL}/keys/${cleanKey}.json?auth=${this.FIREBASE_API_KEY}`;
      const res = await fetch(fetchUrl);

      if (!res.ok) {
        // If network offline or Firebase unreachable, keep offline license token
        return true;
      }

      const record: LicenseRecord | null = await res.json();

      // If key no longer exists, was revoked, or was unbound/reset by admin:
      if (
        !record ||
        record.status !== 'activated' ||
        record.bound_device_id !== deviceId
      ) {
        // Key was revoked or device lock was reset by admin! Revoke local token immediately!
        localStorage.removeItem('aurix_active_license_token');
        return false;
      }

      return true;
    } catch (err) {
      // Offline fallback: keep local license active when offline
      return true;
    }
  }

  /**
   * Activates a 12-character activation key against Firebase and binds current hardware UUID
   */
  static async activateKey(rawKeyInput: string): Promise<{ success: boolean; message: string }> {
    const cleanKey = rawKeyInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanKey.length !== 12) {
      throw new Error('Please enter a valid 12-character activation key (e.g. A7B9-K3X2-M8Q1).');
    }

    const { deviceId, deviceName } = this.getDeviceFingerprint();
    const formattedKey = `${cleanKey.slice(0, 4)}-${cleanKey.slice(4, 8)}-${cleanKey.slice(8, 12)}`;

    // 1. Fetch key record from Firebase Realtime Database
    const fetchUrl = `${this.FIREBASE_DB_URL}/keys/${cleanKey}.json?auth=${this.FIREBASE_API_KEY}`;
    const res = await fetch(fetchUrl);

    if (!res.ok) {
      throw new Error(`Cloud activation server unreachable (${res.status}). Please check internet connection.`);
    }

    const record: LicenseRecord | null = await res.json();

    if (!record) {
      throw new Error(`Activation Key '${formattedKey}' does not exist. Please check for typos.`);
    }

    if (record.status === 'revoked') {
      throw new Error(`Activation Key '${formattedKey}' has been revoked by the administrator.`);
    }

    // 2. Check if already activated
    if (record.status === 'activated') {
      if (record.bound_device_id === deviceId) {
        // Same device re-activating or restoring
        localStorage.setItem(
          'aurix_active_license_token',
          JSON.stringify({ key: formattedKey, deviceId, activatedAt: record.activated_at })
        );
        return { success: true, message: 'License verified! Welcome back.' };
      }
      throw new Error(`Activation Key '${formattedKey}' is already locked to another device (${record.bound_device_name || 'Phone'}).`);
    }

    // 3. Activate unused key and bind to current device
    const now = new Date().toISOString();
    const updatedRecord: LicenseRecord = {
      ...record,
      status: 'activated',
      bound_device_id: deviceId,
      bound_device_name: deviceName,
      activated_at: now,
    };

    const updateRes = await fetch(fetchUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord),
    });

    if (!updateRes.ok) {
      throw new Error('Failed to bind activation key to device on cloud server.');
    }

    // 4. Save local offline license token
    localStorage.setItem(
      'aurix_active_license_token',
      JSON.stringify({ key: formattedKey, deviceId, activatedAt: now })
    );

    return { success: true, message: `✅ License activated successfully! Bound to ${deviceName}.` };
  }
}
