/**
 * Error Recovery Manager - Phase 4.3 Checkpoint 9
 * API 실패 재시도 및 오류 복구
 */

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,      // 1초
    maxDelay: 10000       // 10초
};

export const ErrorRecoveryManager = {
    /**
     * Exponential Backoff 재시도
     */
    async retry<T>(
        fn: () => Promise<T>,
        config: Partial<RetryConfig> = {},
        context: string = 'Operation'
    ): Promise<T> {
        const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
        let lastError: any;

        for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.calculateBackoff(attempt, cfg.baseDelay, cfg.maxDelay);
                    console.log(`🔄 Retry ${attempt}/${cfg.maxRetries} for ${context} (delay: ${delay}ms)`);
                    await this.sleep(delay);
                }

                const result = await fn();

                if (attempt > 0) {
                    console.log(`✅ ${context} succeeded after ${attempt} retries`);
                }

                return result;
            } catch (error: any) {
                lastError = error;
                console.error(`❌ ${context} failed (attempt ${attempt + 1}/${cfg.maxRetries + 1}):`, error.message);

                // 최종 시도 실패
                if (attempt === cfg.maxRetries) {
                    console.error(`💥 ${context} failed after ${cfg.maxRetries} retries`);
                    throw new Error(`${context} failed: ${error.message}`);
                }
            }
        }

        throw lastError;
    },

    /**
     * Exponential Backoff 계산
     */
    calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
        return Math.min(exponentialDelay + jitter, maxDelay);
    },

    /**
     * Sleep 유틸리티
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 타임아웃 래퍼
     */
    async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        context: string = 'Operation'
    ): Promise<T> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${context} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]);
    },

    /**
     * Fallback 체인
     */
    async fallback<T>(operations: Array<() => Promise<T>>, context: string = 'Operation'): Promise<T> {
        const errors: Error[] = [];

        for (let i = 0; i < operations.length; i++) {
            try {
                console.log(`🚀 Trying ${context} option ${i + 1}/${operations.length}`);
                return await operations[i]();
            } catch (error: any) {
                errors.push(error);
                console.warn(`⚠️ ${context} option ${i + 1} failed:`, error.message);

                if (i === operations.length - 1) {
                    throw new Error(`All ${operations.length} fallback options failed for ${context}`);
                }
            }
        }

        throw new Error('Fallback chain exhausted');
    }
};
