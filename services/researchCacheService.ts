/**
 * Research Cache Service - Phase C1
 * 리서치 결과 캐싱으로 API 비용 절감 및 응답 속도 향상
 */

// ============================================
// Types
// ============================================

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;  // Time To Live (ms)
    hits: number; // 캐시 히트 횟수
}

interface CacheStats {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    memoryUsage: number;
    entryCount: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_TTL = 30 * 60 * 1000;  // 30분
const SEARCH_TTL = 15 * 60 * 1000;    // 검색 결과: 15분
const ANALYSIS_TTL = 60 * 60 * 1000;  // AI 분석: 1시간
const MAX_CACHE_SIZE = 100;           // 최대 캐시 항목 수

// ============================================
// Cache Storage
// ============================================

const cache = new Map<string, CacheEntry<any>>();
let stats = {
    totalHits: 0,
    totalMisses: 0
};

// ============================================
// Research Cache Service
// ============================================

export const ResearchCacheService = {
    /**
     * 캐시에서 데이터 조회
     */
    get<T>(key: string): T | null {
        const entry = cache.get(key);

        if (!entry) {
            stats.totalMisses++;
            return null;
        }

        // TTL 만료 체크
        if (Date.now() - entry.timestamp > entry.ttl) {
            cache.delete(key);
            stats.totalMisses++;
            return null;
        }

        // 캐시 히트
        entry.hits++;
        stats.totalHits++;
        console.log(`📦 Cache HIT: ${key.substring(0, 50)}...`);
        return entry.data as T;
    },

    /**
     * 캐시에 데이터 저장
     */
    set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
        // 최대 크기 초과 시 가장 오래된 항목 제거
        if (cache.size >= MAX_CACHE_SIZE) {
            this.evictOldest();
        }

        cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            hits: 0
        });
        console.log(`💾 Cache SET: ${key.substring(0, 50)}... (TTL: ${ttl / 1000}s)`);
    },

    /**
     * 검색 결과 캐싱
     */
    cacheSearchResults(query: string, results: any[]): void {
        const key = `search:${this.hashQuery(query)}`;
        this.set(key, results, SEARCH_TTL);
    },

    /**
     * 검색 결과 조회
     */
    getSearchResults(query: string): any[] | null {
        const key = `search:${this.hashQuery(query)}`;
        return this.get(key) as any[] | null;
    },

    /**
     * AI 분석 결과 캐싱
     */
    cacheAnalysis(query: string, analysis: any): void {
        const key = `analysis:${this.hashQuery(query)}`;
        this.set(key, analysis, ANALYSIS_TTL);
    },

    /**
     * AI 분석 결과 조회
     */
    getAnalysis(query: string): any | null {
        const key = `analysis:${this.hashQuery(query)}`;
        return this.get(key);
    },

    /**
     * 전체 리포트 캐싱 (isDeepAnalysis 고려)
     */
    cacheReport(query: string, isDeepAnalysis: boolean, report: any): void {
        const key = `report:${isDeepAnalysis ? 'deep:' : ''}${this.hashQuery(query)}`;
        this.set(key, report, ANALYSIS_TTL);
    },

    /**
     * 전체 리포트 조회
     */
    getReport(query: string, isDeepAnalysis: boolean): any | null {
        const key = `report:${isDeepAnalysis ? 'deep:' : ''}${this.hashQuery(query)}`;
        return this.get(key);
    },

    /**
     * 쿼리 해시 생성
     */
    hashQuery(query: string): string {
        const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
        // 간단한 해시 함수
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    /**
     * 가장 오래된 캐시 항목 제거
     */
    evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            cache.delete(oldestKey);
            console.log(`🗑️ Cache EVICT: ${oldestKey.substring(0, 50)}...`);
        }
    },

    /**
     * 캐시 통계 조회
     */
    getStats(): CacheStats {
        const total = stats.totalHits + stats.totalMisses;
        return {
            totalHits: stats.totalHits,
            totalMisses: stats.totalMisses,
            hitRate: total > 0 ? stats.totalHits / total : 0,
            memoryUsage: this.estimateMemoryUsage(),
            entryCount: cache.size
        };
    },

    /**
     * 메모리 사용량 추정
     */
    estimateMemoryUsage(): number {
        let size = 0;
        for (const [key, entry] of cache.entries()) {
            size += key.length * 2;
            size += JSON.stringify(entry.data).length * 2;
        }
        return size;
    },

    /**
     * 캐시 초기화
     */
    clear(): void {
        cache.clear();
        stats = { totalHits: 0, totalMisses: 0 };
        console.log('🧹 Cache CLEARED');
    },

    /**
     * 만료된 캐시 정리
     */
    cleanup(): void {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cache CLEANUP: ${removed} expired entries removed`);
        }
    }
};

// 주기적 정리 (5분마다)
setInterval(() => {
    ResearchCacheService.cleanup();
}, 5 * 60 * 1000);

export default ResearchCacheService;
