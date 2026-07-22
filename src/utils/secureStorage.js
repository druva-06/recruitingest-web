const DB_NAME = 'recruitingest-secure-storage-db';
const STORE_NAME = 'keys';
const KEY_NAME = 'aes-key';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getCryptoKey() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      let key = request.result;
      if (!key) {
        // Generate new non-extractable AES-GCM 256 key
        key = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false, // non-extractable!
          ['encrypt', 'decrypt']
        );
        await saveCryptoKey(key);
      }
      resolve(key);
    };
  });
}

async function saveCryptoKey(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(key, KEY_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function encryptData(plainText) {
  if (!plainText) return null;
  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plainText)
    );
    
    // Convert array buffers to base64
    const encryptedBytes = new Uint8Array(encrypted);
    
    // Convert Uint8Array to binary string before btoa to support all browser environments
    let ivBinary = '';
    for (let i = 0; i < iv.length; i++) {
      ivBinary += String.fromCharCode(iv[i]);
    }
    const ivBase64 = btoa(ivBinary);

    let encryptedBinary = '';
    for (let i = 0; i < encryptedBytes.length; i++) {
      encryptedBinary += String.fromCharCode(encryptedBytes[i]);
    }
    const encryptedBase64 = btoa(encryptedBinary);
    
    return JSON.stringify({ iv: ivBase64, data: encryptedBase64 });
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to securely encrypt data.');
  }
}

export async function decryptData(encryptedJson) {
  if (!encryptedJson) return '';
  try {
    const { iv: ivBase64, data: encryptedBase64 } = JSON.parse(encryptedJson);
    
    const ivBinary = atob(ivBase64);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      iv[i] = ivBinary.charCodeAt(i);
    }

    const encryptedBinary = atob(encryptedBase64);
    const encryptedBytes = new Uint8Array(encryptedBinary.length);
    for (let i = 0; i < encryptedBinary.length; i++) {
      encryptedBytes[i] = encryptedBinary.charCodeAt(i);
    }
    
    const key = await getCryptoKey();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBytes
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return ''; // Return empty string if decryption fails
  }
}

export async function saveSecureApiKey(apiKey) {
  if (!apiKey) {
    localStorage.removeItem('recruitingest-secure-key');
    return;
  }
  const encrypted = await encryptData(apiKey);
  localStorage.setItem('recruitingest-secure-key', encrypted);
}

export async function loadSecureApiKey() {
  const encrypted = localStorage.getItem('recruitingest-secure-key');
  if (!encrypted) return '';
  return await decryptData(encrypted);
}

export async function saveProspeoApiKey(apiKey) {
  if (!apiKey) {
    localStorage.removeItem('recruitingest-prospeo-key');
    return;
  }
  const encrypted = await encryptData(apiKey);
  localStorage.setItem('recruitingest-prospeo-key', encrypted);
}

export async function loadProspeoApiKey() {
  const encrypted = localStorage.getItem('recruitingest-prospeo-key');
  if (!encrypted) return '';
  return await decryptData(encrypted);
}

export function saveModelName(modelName) {
  if (!modelName) {
    localStorage.removeItem('recruitingest-gemini-model');
    return;
  }
  localStorage.setItem('recruitingest-gemini-model', modelName);
}

export function loadModelName() {
  return localStorage.getItem('recruitingest-gemini-model') || 'gemini-3.5-flash';
}

export function saveRateLimitSettings(enabled, requests, interval) {
  localStorage.setItem('recruitingest-rate-limit-enabled', enabled ? 'true' : 'false');
  localStorage.setItem('recruitingest-rate-limit-requests', String(requests));
  localStorage.setItem('recruitingest-rate-limit-interval', String(interval));
}

export function loadRateLimitSettings() {
  const enabled = localStorage.getItem('recruitingest-rate-limit-enabled') === 'true';
  const requests = Number(localStorage.getItem('recruitingest-rate-limit-requests')) || 10;
  const interval = Number(localStorage.getItem('recruitingest-rate-limit-interval')) || 60;
  return { enabled, requests, interval };
}

// Job Scout keys (completely separate from existing Gemini/Prospeo keys)
export async function saveJobScoutApifyKey(value) {
  if (!value) {
    localStorage.removeItem('jobscout_apify_key');
    return;
  }
  const encrypted = await encryptData(value);
  localStorage.setItem('jobscout_apify_key', encrypted);
}

export async function loadJobScoutApifyKey() {
  const encrypted = localStorage.getItem('jobscout_apify_key');
  if (!encrypted) return '';
  return await decryptData(encrypted);
}

export async function saveJobScoutGeminiKey(value) {
  if (!value) {
    localStorage.removeItem('jobscout_gemini_key');
    return;
  }
  const encrypted = await encryptData(value);
  localStorage.setItem('jobscout_gemini_key', encrypted);
}

export async function loadJobScoutGeminiKey() {
  const encrypted = localStorage.getItem('jobscout_gemini_key');
  if (!encrypted) return '';
  return await decryptData(encrypted);
}

