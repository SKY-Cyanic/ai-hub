/**
 * Resource Manager - Phase 4.3 Checkpoint 10
 * 메모리 및 리소스 모니터링
 */

interface ResourceStats {
    localStorageUsed: number;
    localStorageTotal: number;
    localStoragePercent: number;
    itemCount: number;
    largestItems: Array<{ key: string; size: number }>;
}

const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024; // 5MB (일반적인 제한)
const WARNING_THRESHOLD = 0.8; // 80%

export const ResourceManager = {
    /**
     * localStorage 사용량 체크
     */
    checkLocalStorage(): ResourceStats {
        let totalSize = 0;
        let itemCount = 0;
        const items: Array<{ key: string; size: number }> = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            const value = localStorage.getItem(key);
            if (value) {
                const size = value.length * 2; // Unicode = 2 bytes per char
                totalSize += size;
                itemCount++;
                items.push({ key, size });
            }
        }

        // 크기순 정렬
        items.sort((a, b) => b.size - a.size);

        const stats: ResourceStats = {
            localStorageUsed: totalSize,
            localStorageTotal: MAX_LOCALSTORAGE_SIZE,
            localStoragePercent: (totalSize / MAX_LOCALSTORAGE_SIZE) * 100,
            itemCount,
            largestItems: items.slice(0, 5) // Top 5
        };

        // 경고
        if (stats.localStoragePercent > WARNING_THRESHOLD * 100) {
            console.warn(`⚠️ localStorage usage: ${stats.localStoragePercent.toFixed(1)}%`);
            console.warn('Consider cleanup:', stats.largestItems);
        }

        return stats;
    },

    /**
     * 자동 정리 (오래된/큰 항목 제거)
     */
    autoCleanup(targetPercent: number = 50): number {
        const stats = this.checkLocalStorage();

        if (stats.localStoragePercent < WARNING_THRESHOLD * 100) {
            return 0; // 정리 불필요
        }

        console.log(`🧹 Starting auto cleanup (current: ${stats.localStoragePercent.toFixed(1)}%)`);

        let removed = 0;
        const targetSize = MAX_LOCALSTORAGE_SIZE * (targetPercent / 100);

        // 1. 만료된 캐시 제거
        const { CacheManager } = require('./cacheManager');
        const cacheCleared = CacheManager?.clearExpired() || 0;
        removed += cacheCleared;

        // 2. 오래된 로그 제거
        const logKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('curator_logs') || key?.includes('_history')) {
                logKeys.push(key);
            }
        }

        // 가장 오래된 것부터 제거
        const halfRemove = Math.floor(logKeys.length / 2);
        for (let i = 0; i < halfRemove; i++) {
            localStorage.removeItem(logKeys[i]);
            removed++;
        }

        const newStats = this.checkLocalStorage();
        console.log(`✅ Cleanup complete: ${removed} items removed`);
        console.log(`   Before: ${stats.localStoragePercent.toFixed(1)}%`);
        console.log(`   After: ${newStats.localStoragePercent.toFixed(1)}%`);

        return removed;
    },

    /**
     * 메모리 모니터링 (performance API 사용)
     */
    getMemoryStats(): any {
        if ('memory' in performance && (performance as any).memory) {
            const mem = (performance as any).memory;
            return {
                usedJSHeapSize: mem.usedJSHeapSize,
                totalJSHeapSize: mem.totalJSHeapSize,
                jsHeapSizeLimit: mem.jsHeapSizeLimit,
                usedPercent: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
            };
        }
        return null;
    },

    /**
     * 리소스 상태 요약
     */
    getSummary(): string {
        const storage = this.checkLocalStorage();
        const memory = this.getMemoryStats();

        let summary = `📊 Resource Status:\n`;
        summary += `   localStorage: ${(storage.localStorageUsed / 1024).toFixed(0)}KB / ${(storage.localStorageTotal / 1024).toFixed(0)}KB (${storage.localStoragePercent.toFixed(1)}%)\n`;
        summary += `   Items: ${storage.itemCount}`;

        if (memory) {
            summary += `\n   Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB (${memory.usedPercent.toFixed(1)}%)`;
        }

        return summary;
    },

    /**
     * 주기적 모니터링 시작
     */
    startMonitoring(intervalMinutes: number = 30): NodeJS.Timeout {
        console.log(`🔍 Resource monitoring started (interval: ${intervalMinutes}min)`);

        return setInterval(() => {
            console.log(this.getSummary());

            const stats = this.checkLocalStorage();
            if (stats.localStoragePercent > WARNING_THRESHOLD * 100) {
                this.autoCleanup();
            }
        }, intervalMinutes * 60 * 1000);
    }
};
