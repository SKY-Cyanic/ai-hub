/**
 * Cache Manager - Phase 4.3 Checkpoint 8
 * API/Research 결과 캐싱 시스템
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const CACHE_PREFIX = 'cache_';

export const CacheManager = {
    /**
     * 캐시 저장
     */
    set<T>(key: string, data: T, ttlMs: number): void {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttlMs
        };

        try {
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
            console.log(`💾 Cached: ${key} (TTL: ${ttlMs / 1000 / 60}min)`);
        } catch (error) {
            console.error('Cache set error:', error);
            this.clearExpired(); // 용량 부족 시 정리 시도
        }
    },

    /**
     * 캐시 조회
     */
    get<T>(key: string): T | null {
        try {
            const stored = localStorage.getItem(CACHE_PREFIX + key);
            if (!stored) return null;

            const entry: CacheEntry<T> = JSON.parse(stored);

            // 만료 체크
            if (Date.now() > entry.expiresAt) {
                this.delete(key);
                console.log(`⏰ Cache expired: ${key}`);
                return null;
            }

            console.log(`✅ Cache hit: ${key}`);
            return entry.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    },

    /**
     * 캐시 삭제
     */
    delete(key: string): void {
        localStorage.removeItem(CACHE_PREFIX + key);
    },

    /**
     * 만료된 캐시 정리
     */
    clearExpired(): number {
        const now = Date.now();
        let cleared = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(CACHE_PREFIX)) continue;

            try {
                const entry = JSON.parse(localStorage.getItem(key)!);
                if (now > entry.expiresAt) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            } catch (e) {
                localStorage.removeItem(key); // 손상된 항목 제거
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log(`🗑️ Cleared ${cleared} expired cache entries`);
        }

        return cleared;
    },

    /**
     * 모든 캐시 삭제
     */
    clearAll(): void {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
        }

        keys.forEach(k => localStorage.removeItem(k));
        console.log(`🗑️ Cleared all cache (${keys.length} items)`);
    },

    /**
     * 캐시 통계
     */
    getStats(): {
        total: number;
        expired: number;
        size: number;
    } {
        const now = Date.now();
        let total = 0;
        let expired = 0;
        let size = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(CACHE_PREFIX)) continue;

            total++;
            const value = localStorage.getItem(key);
            if (value) {
                size += value.length;
                try {
                    const entry = JSON.parse(value);
                    if (now > entry.expiresAt) expired++;
                } catch (e) { }
            }
        }

        return { total, expired, size };
    }
};

// TTL 상수
export const CacheTTL = {
    ONE_HOUR: 60 * 60 * 1000,
    SIX_HOURS: 6 * 60 * 60 * 1000,
    TWELVE_HOURS: 12 * 60 * 60 * 1000,
    ONE_DAY: 24 * 60 * 60 * 1000
};
