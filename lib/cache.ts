import crypto from "crypto";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class SimpleCache<T> {
  private store: Map<string, CacheEntry<T>>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.store = new Map();
    this.maxSize = maxSize;
    
    // Cleanup expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.timestamp + entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  private getKey(...parts: string[]): string {
    return crypto.createHash("sha256").update(parts.join(":")).digest("hex");
  }

  set(keyParts: string[], data: T, ttlMs: number): void {
    const key = this.getKey(...keyParts);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };

    // If cache is full, remove oldest entries
    if (this.store.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [k, entry] of this.store.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, entry);
  }

  get(keyParts: string[]): T | null {
    const key = this.getKey(...keyParts);
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now >= entry.timestamp + entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  has(keyParts: string[]): boolean {
    const key = this.getKey(...keyParts);
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now >= entry.timestamp + entry.ttl) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// Cache instances for different types of data
export const aiVerificationCache = new SimpleCache<any>(500);
export const governmentIdCache = new SimpleCache<any>(200);
export const biometricCache = new SimpleCache<any>(100);

// Cache TTLs in milliseconds
export const CACHE_TTLS = {
  GOVERNMENT_ID: 30 * 60 * 1000, // 30 minutes
  BIOMETRIC: 60 * 60 * 1000,     // 1 hour
  AI_VERIFICATION: 15 * 60 * 1000 // 15 minutes
};
