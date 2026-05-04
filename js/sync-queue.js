// Offline sync queue — localStorage-backed queue for games played offline
const STORAGE_KEY = 'gm_sync_queue';
const MAX_RETRIES = 5;

export class SyncQueue {
  constructor() {
    this._onQueueChange = null; // callback(pendingCount)
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn('SyncQueue: failed to persist queue', err);
    }
    if (this._onQueueChange) {
      this._onQueueChange(this.pendingCount);
    }
  }

  /** Add an entry to the queue */
  enqueue(type, payload) {
    const entries = this._load();
    entries.push({
      id: crypto.randomUUID(),
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      type,
      payload,
    });
    this._save(entries);
  }

  /**
   * Process all pending entries sequentially.
   * @param {Function} syncFn  — async (entry) => true | false | 'auth_expired'
   * @param {Function} onAuthNeeded — called when auth has expired
   * @returns {number} count of successfully synced entries
   */
  async flush(syncFn, onAuthNeeded) {
    const entries = this._load();
    if (entries.length === 0) return 0;

    let synced = 0;
    const remaining = [];

    for (const entry of entries) {
      if (entry.failed) {
        remaining.push(entry);
        continue;
      }

      const result = await syncFn(entry);

      if (result === true) {
        synced++;
        // Entry removed (not pushed to remaining)
      } else if (result === 'auth_expired') {
        remaining.push(entry);
        // Push all unprocessed entries too, then stop
        const idx = entries.indexOf(entry);
        for (let i = idx + 1; i < entries.length; i++) {
          remaining.push(entries[i]);
        }
        this._save(remaining);
        if (onAuthNeeded) onAuthNeeded();
        return synced;
      } else {
        // Retry later
        entry.retryCount++;
        if (entry.retryCount >= MAX_RETRIES) {
          entry.failed = true;
          console.warn('SyncQueue: entry permanently failed after', MAX_RETRIES, 'retries', entry.id);
        }
        remaining.push(entry);
      }
    }

    this._save(remaining);
    return synced;
  }

  /** Count of entries still pending (not permanently failed) */
  get pendingCount() {
    return this._load().filter(e => !e.failed).length;
  }

  /** Count of permanently failed entries */
  get failedCount() {
    return this._load().filter(e => e.failed).length;
  }

  /** Wipe the entire queue */
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (this._onQueueChange) this._onQueueChange(0);
  }
}
