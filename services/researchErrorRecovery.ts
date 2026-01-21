/**
 * Research Error Recovery Service - Phase C2
 * API 실패 시 재시도, Exponential Backoff, 대체 소스 처리
 */

// ============================================
// Types
// ============================================

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export interface RecoveryResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    attempts: number;
    fallbackUsed: boolean;
}

// ============================================
// Default Config
// ============================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

// ============================================
// Request Limiter (동시 요청 제한)
// ============================================

let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;
const requestQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        activeRequests++;
        return Promise.resolve();
    }

    return new Promise(resolve => {
        requestQueue.push(resolve);
    });
}

function releaseSlot(): void {
    activeRequests--;
    if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
        const next = requestQueue.shift();
        if (next) {
            activeRequests++;
            next();
        }
    }
}

// ============================================
// Error Recovery Service
// ============================================

export const ErrorRecoveryService = {
    /**
     * 재시도 가능한 함수 실행
     */
    async withRetry<T>(
        fn: () => Promise<T>,
        config: Partial<RetryConfig> = {},
        fallbackFn?: () => Promise<T>
    ): Promise<RecoveryResult<T>> {
        const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
        let lastError: Error | null = null;
        let attempts = 0;

        // 동시 요청 제한 적용
        await acquireSlot();

        try {
            for (let i = 0; i <= finalConfig.maxRetries; i++) {
                attempts = i + 1;

                try {
                    const result = await fn();
                    return {
                        success: true,
                        data: result,
                        attempts,
                        fallbackUsed: false
                    };
                } catch (error: any) {
                    lastError = error;
                    console.warn(`⚠️ Attempt ${attempts} failed: ${error.message}`);

                    // 마지막 시도가 아니면 대기
                    if (i < finalConfig.maxRetries) {
                        const delay = this.calculateDelay(i, finalConfig);
                        console.log(`⏳ Retrying in ${delay}ms...`);
                        await this.sleep(delay);
                    }
                }
            }

            // 모든 재시도 실패 → 폴백 시도
            if (fallbackFn) {
                try {
                    console.log('🔄 Using fallback function...');
                    const fallbackResult = await fallbackFn();
                    return {
                        success: true,
                        data: fallbackResult,
                        attempts,
                        fallbackUsed: true
                    };
                } catch (fallbackError: any) {
                    console.error('❌ Fallback also failed:', fallbackError.message);
                }
            }

            return {
                success: false,
                error: lastError?.message || 'Unknown error',
                attempts,
                fallbackUsed: false
            };
        } finally {
            releaseSlot();
        }
    },

    /**
     * Exponential Backoff 지연 계산
     */
    calculateDelay(attempt: number, config: RetryConfig): number {
        const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
        // 지터 추가 (±20%)
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        return Math.min(delay + jitter, config.maxDelayMs);
    },

    /**
     * 지연 대기
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 부분 결과 반환 헬퍼
     */
    partialResult<T>(
        results: (T | null)[],
        minRequired: number = 1
    ): T[] {
        const valid = results.filter((r): r is T => r !== null);

        if (valid.length >= minRequired) {
            console.log(`📦 Partial result: ${valid.length}/${results.length} items`);
            return valid;
        }

        return [];
    },

    /**
     * 타임아웃 래퍼
     */
    async withTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number,
        timeoutError: string = 'Operation timed out'
    ): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
            )
        ]);
    },

    /**
     * API 상태 확인
     */
    async checkApiHealth(apiName: string, healthCheckFn: () => Promise<boolean>): Promise<boolean> {
        try {
            return await this.withTimeout(healthCheckFn, 5000);
        } catch {
            console.warn(`⚠️ ${apiName} health check failed`);
            return false;
        }
    },

    /**
     * 현재 활성 요청 수
     */
    getActiveRequests(): number {
        return activeRequests;
    },

    /**
     * 큐 대기 중인 요청 수
     */
    getQueuedRequests(): number {
        return requestQueue.length;
    }
};

export default ErrorRecoveryService;
