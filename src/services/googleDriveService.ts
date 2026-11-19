// AURIX PRO - Google Drive Cloud Sync & Encrypted Vault Backup Service
// Auto-creates 'AURIX_PRO_Backups' folder in Google Drive and syncs encrypted local DB payloads.

import { SettingsRepository } from '../db/repositories/settingsRepository';

export interface GoogleDriveSyncStatus {
  connected: boolean;
  folderId?: string;
  lastSyncedAt?: string;
  message?: string;
}

export class GoogleDriveService {
  private static FOLDER_NAME = 'AURIX_PRO_Backups';
  private static FILE_NAME = 'aurix_vault_backup_latest.json';

  /**
   * Opens the official Google OAuth 2.0 Account Consent Popup
   */
  static openGoogleOAuthPopup(customClientId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const clientId =
        customClientId?.trim() ||
        '1092837465012-aurixpro.apps.googleusercontent.com';

      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
      const responseType = 'token';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=${responseType}&scope=${scope}&prompt=consent&include_granted_scopes=true`;

      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'GoogleDriveOAuth',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
      );

      if (!popup) {
        reject(new Error('Popup blocked! Please allow popups for this website to connect Google Drive.'));
        return;
      }

      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            reject(new Error('Google Drive sign-in popup was closed before completing authorization.'));
            return;
          }

          if (popup.location && popup.location.origin === window.location.origin) {
            const hash = popup.location.hash;
            if (hash.includes('access_token=')) {
              clearInterval(timer);
              const params = new URLSearchParams(hash.replace(/^#/, ''));
              const token = params.get('access_token');
              popup.close();

              if (token) {
                resolve(token);
              } else {
                reject(new Error('Failed to extract access_token from Google OAuth response.'));
              }
            } else if (hash.includes('error=')) {
              clearInterval(timer);
              const params = new URLSearchParams(hash.replace(/^#/, ''));
              const err = params.get('error_description') || params.get('error') || 'OAuth denied';
              popup.close();
              reject(new Error(`Google OAuth error: ${err}`));
            }
          }
        } catch (e) {
          // Cross-origin check while on accounts.google.com
        }
      }, 500);
    });
  }

  /**
   * Search for existing AURIX_PRO_Backups folder or create a new one in Google Drive
   */
  static async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      throw new Error('Google Drive Access Token is missing.');
    }

    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive API error (${searchRes.status})`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Create new folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: this.FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to create folder in Google Drive (${createRes.status})`);
    }

    const folderData = await createRes.json();
    return folderData.id;
  }

  /**
   * Diagnostic test connection for Google Drive Access Token
   */
  static async testDriveConnection(accessToken: string): Promise<{ success: boolean; message: string }> {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      return { success: false, message: 'Please enter your Google Drive Access Token.' };
    }

    try {
      const folderId = await this.getOrCreateBackupFolder(cleanToken);
      return {
        success: true,
        message: `✅ Connected to Google Drive! Auto-created folder 'AURIX_PRO_Backups' (ID: ${folderId.slice(0, 8)}...).`,
      };
    } catch (err: any) {
      return { success: false, message: `Google Drive Error: ${err.message}` };
    }
  }

  /**
   * Backup encrypted local DB vault payload to Google Drive inside AURIX_PRO_Backups folder
   */
  static async backupToDrive(accessToken: string, passphrase = 'monetra_local_key'): Promise<boolean> {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      throw new Error('Please enter or connect your Google Drive Access Token.');
    }

    // 1. Get or create folder
    const folderId = await this.getOrCreateBackupFolder(cleanToken);

    // 2. Export and encrypt local DB payload
    const rawDataJson = await SettingsRepository.exportAllData();
    const encryptedPayload = await this.encryptData(rawDataJson, passphrase);

    const backupFileContent = JSON.stringify(
      {
        app: 'AURIX PRO',
        version: '1.1.7',
        encrypted: true,
        updated_at: new Date().toISOString(),
        payload: encryptedPayload,
      },
      null,
      2
    );

    // 3. Search for existing file in folder
    const fileSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${this.FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id,name)`;
    const fileSearchRes = await fetch(fileSearchUrl, {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });

    const fileSearchData = await fileSearchRes.json().catch(() => ({ files: [] }));
    const existingFileId = fileSearchData.files && fileSearchData.files.length > 0 ? fileSearchData.files[0].id : null;

    // 4. Multipart upload or update
    const metadata = {
      name: this.FILE_NAME,
      mimeType: 'application/json',
      parents: existingFileId ? undefined : [folderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      backupFileContent +
      closeDelimiter;

    const uploadUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const uploadRes = await fetch(uploadUrl, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive Upload failed (${uploadRes.status})`);
    }

    // Update settings
    await SettingsRepository.update({
      gdrive_token: cleanToken,
      last_backup_at: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Restore encrypted vault from Google Drive folder
   */
  static async restoreFromDrive(accessToken: string, passphrase = 'monetra_local_key'): Promise<boolean> {
    const cleanToken = accessToken.trim();
    if (!cleanToken) {
      throw new Error('Please enter or connect your Google Drive Access Token.');
    }

    // 1. Get folder ID
    const folderId = await this.getOrCreateBackupFolder(cleanToken);

    // 2. Search for backup file
    const fileSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${this.FILE_NAME}' and '${folderId}' in parents and trashed=false&fields=files(id,name)`;
    const fileSearchRes = await fetch(fileSearchUrl, {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });

    const fileSearchData = await fileSearchRes.json().catch(() => ({ files: [] }));
    if (!fileSearchData.files || fileSearchData.files.length === 0) {
      throw new Error(`No backup file '${this.FILE_NAME}' found inside Google Drive folder '${this.FOLDER_NAME}'.`);
    }

    const fileId = fileSearchData.files[0].id;

    // 3. Download file content
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to download backup file from Google Drive (${downloadRes.status})`);
    }

    const backupJson = await downloadRes.json();
    if (!backupJson || !backupJson.payload) {
      throw new Error('Downloaded Google Drive file does not contain a valid encrypted payload.');
    }

    // 4. Decrypt and import
    const decryptedJson = await this.decryptData(backupJson.payload, passphrase);
    const success = await SettingsRepository.importData(decryptedJson);

    if (success) {
      await SettingsRepository.update({ gdrive_token: cleanToken });
    }
    return success;
  }

  /**
   * Encrypt payload using AES-GCM
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
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));

    const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt payload
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

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  }
}
