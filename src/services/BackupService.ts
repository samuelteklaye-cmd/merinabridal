import { InventoryItem, Rental, Sale } from '../types';

export interface BackupData {
  inventory: InventoryItem[];
  rentals: Rental[];
  sales: Sale[];
  timestamp: string;
}

class BackupService {
  private DB_NAME = 'AuraBoutiqueBackup';
  private STORE_NAME = 'backups';

  async initDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBackup(data: Omit<BackupData, 'timestamp'>) {
    const db = await this.initDB();
    const backup: BackupData = {
      ...data,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Keep only the last 5 backups to save space
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result >= 5) {
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              cursor.delete();
            }
          };
        }
      };

      const addRequest = store.add(backup);
      addRequest.onsuccess = () => resolve(true);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  async getLatestBackup(): Promise<BackupData | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.openCursor(null, 'prev');
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  async downloadBackup() {
    const latest = await this.getLatestBackup();
    if (!latest) {
      // If no backup in IDB, try to fetch fresh data
      try {
        const [inv, rent, sale] = await Promise.all([
          fetch('/api/inventory').then(r => r.json()),
          fetch('/api/rentals').then(r => r.json()),
          fetch('/api/sales').then(r => r.json())
        ]);
        const data = { inventory: inv, rentals: rent, sales: sale, timestamp: new Date().toISOString() };
        this.triggerDownload(data);
      } catch (err) {
        alert('No backup found and server is unreachable.');
      }
      return;
    }
    this.triggerDownload(latest);
  }

  private triggerDownload(data: BackupData) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aura_Boutique_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const backupService = new BackupService();
