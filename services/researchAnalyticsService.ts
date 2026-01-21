/**
 * Research Analytics Service - Phase D
 * 리서치 사용 통계 및 분석
 */

// ============================================
// Types
// ============================================

export interface ResearchEvent {
    id: string;
    type: 'search' | 'analysis' | 'report' | 'error' | 'cache_hit' | 'follow_up' | 'deep_analysis';
    query: string;
    userId?: string;
    timestamp: number;
    duration?: number;      // 소요 시간 (ms)
    success: boolean;
    metadata?: Record<string, any>;
}

export interface UsageStats {
    totalSearches: number;
    totalReports: number;
    deepAnalysisCount: number;
    cacheHitRate: number;
    avgResponseTime: number;
    errorRate: number;
    topQueries: { query: string; count: number }[];
    dailyUsage: { date: string; count: number }[];
}

export interface QueryInsight {
    query: string;
    intent: string;
    searchCount: number;
    avgDuration: number;
    lastSearched: number;
}

// ============================================
// Storage Keys
// ============================================

const ANALYTICS_KEY = 'ai_research_analytics';
const MAX_EVENTS = 1000;  // 최대 이벤트 저장 수

// ============================================
// Analytics Service
// ============================================

export const ResearchAnalyticsService = {
    /**
     * 이벤트 기록
     */
    trackEvent(event: Omit<ResearchEvent, 'id' | 'timestamp'>): void {
        const fullEvent: ResearchEvent = {
            ...event,
            id: this.generateId(),
            timestamp: Date.now()
        };

        const events = this.getEvents();
        events.push(fullEvent);

        // 최대 이벤트 수 초과 시 오래된 이벤트 제거
        if (events.length > MAX_EVENTS) {
            events.splice(0, events.length - MAX_EVENTS);
        }

        this.saveEvents(events);
        console.log(`📊 Analytics: ${event.type} - ${event.query.substring(0, 30)}...`);
    },

    /**
     * 검색 시작 추적
     */
    trackSearchStart(query: string, userId?: string): string {
        const sessionId = this.generateId();
        this.trackEvent({
            type: 'search',
            query,
            userId,
            success: true,
            metadata: { sessionId, phase: 'start' }
        });
        return sessionId;
    },

    /**
     * 검색 완료 추적
     */
    trackSearchComplete(query: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
        this.trackEvent({
            type: 'search',
            query,
            duration,
            success,
            metadata: { ...metadata, phase: 'complete' }
        });
    },

    /**
     * 리포트 생성 추적
     */
    trackReport(query: string, isDeepAnalysis: boolean, duration: number, success: boolean): void {
        this.trackEvent({
            type: isDeepAnalysis ? 'deep_analysis' : 'report',
            query,
            duration,
            success,
            metadata: { isDeepAnalysis }
        });
    },

    /**
     * 에러 추적
     */
    trackError(query: string, error: string, phase: string): void {
        this.trackEvent({
            type: 'error',
            query,
            success: false,
            metadata: { error, phase }
        });
    },

    /**
     * 캐시 히트 추적
     */
    trackCacheHit(query: string): void {
        this.trackEvent({
            type: 'cache_hit',
            query,
            success: true
        });
    },

    /**
     * 후속 질문 추적
     */
    trackFollowUp(originalQuery: string, followUpQuery: string): void {
        this.trackEvent({
            type: 'follow_up',
            query: followUpQuery,
            success: true,
            metadata: { originalQuery }
        });
    },

    /**
     * 사용 통계 조회
     */
    getUsageStats(): UsageStats {
        const events = this.getEvents();
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        // 기본 통계
        const searches = events.filter(e => e.type === 'search' && e.metadata?.phase === 'complete');
        const reports = events.filter(e => e.type === 'report' || e.type === 'deep_analysis');
        const deepAnalyses = events.filter(e => e.type === 'deep_analysis');
        const cacheHits = events.filter(e => e.type === 'cache_hit');
        const errors = events.filter(e => e.type === 'error');

        // 평균 응답 시간
        const durations = searches.filter(e => e.duration).map(e => e.duration!);
        const avgResponseTime = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        // 캐시 히트율
        const totalRequests = searches.length;
        const cacheHitRate = totalRequests > 0 ? cacheHits.length / totalRequests : 0;

        // 에러율
        const errorRate = totalRequests > 0 ? errors.length / totalRequests : 0;

        // 인기 검색어 (상위 10개)
        const queryCount = new Map<string, number>();
        searches.forEach(e => {
            const count = queryCount.get(e.query) || 0;
            queryCount.set(e.query, count + 1);
        });
        const topQueries = Array.from(queryCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([query, count]) => ({ query, count }));

        // 일별 사용량 (최근 7일)
        const dailyUsage: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const count = searches.filter(e =>
                e.timestamp >= dayStart.getTime() && e.timestamp < dayEnd.getTime()
            ).length;

            dailyUsage.push({
                date: dayStart.toISOString().split('T')[0],
                count
            });
        }

        return {
            totalSearches: searches.length,
            totalReports: reports.length,
            deepAnalysisCount: deepAnalyses.length,
            cacheHitRate,
            avgResponseTime,
            errorRate,
            topQueries,
            dailyUsage
        };
    },

    /**
     * 쿼리별 인사이트
     */
    getQueryInsights(): QueryInsight[] {
        const events = this.getEvents();
        const queryMap = new Map<string, {
            count: number;
            durations: number[];
            lastSearched: number;
            intent: string;
        }>();

        events
            .filter(e => e.type === 'search' && e.metadata?.phase === 'complete')
            .forEach(e => {
                const existing = queryMap.get(e.query) || {
                    count: 0,
                    durations: [],
                    lastSearched: 0,
                    intent: e.metadata?.intent || 'unknown'
                };

                existing.count++;
                if (e.duration) existing.durations.push(e.duration);
                if (e.timestamp > existing.lastSearched) existing.lastSearched = e.timestamp;

                queryMap.set(e.query, existing);
            });

        return Array.from(queryMap.entries())
            .map(([query, data]) => ({
                query,
                intent: data.intent,
                searchCount: data.count,
                avgDuration: data.durations.length > 0
                    ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
                    : 0,
                lastSearched: data.lastSearched
            }))
            .sort((a, b) => b.searchCount - a.searchCount);
    },

    /**
     * 이벤트 목록 조회
     */
    getEvents(): ResearchEvent[] {
        try {
            const stored = localStorage.getItem(ANALYTICS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    /**
     * 이벤트 저장
     */
    saveEvents(events: ResearchEvent[]): void {
        try {
            localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
        } catch (e) {
            console.error('Analytics save failed:', e);
        }
    },

    /**
     * 분석 데이터 내보내기
     */
    exportData(): string {
        const data = {
            stats: this.getUsageStats(),
            insights: this.getQueryInsights(),
            events: this.getEvents().slice(-100)  // 최근 100개만
        };
        return JSON.stringify(data, null, 2);
    },

    /**
     * 분석 데이터 초기화
     */
    clear(): void {
        localStorage.removeItem(ANALYTICS_KEY);
        console.log('📊 Analytics CLEARED');
    },

    /**
     * ID 생성
     */
    generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    },

    // ============================================
    // Phase D2: 성과 측정
    // ============================================

    /**
     * 성과 지표 조회
     */
    getPerformanceMetrics(): {
        avgQualityScore: number;
        avgConfidence: number;
        successRate: number;
        p50ResponseTime: number;
        p95ResponseTime: number;
        improvementTrend: number;
    } {
        const events = this.getEvents();
        const reports = events.filter(e =>
            (e.type === 'report' || e.type === 'deep_analysis') &&
            e.metadata?.confidence
        );

        // 평균 품질 점수 (confidence 기반)
        const confidences = reports.map(e => e.metadata?.confidence || 0);
        const avgConfidence = confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0;

        // 성공률
        const totalAttempts = events.filter(e => e.type === 'search').length;
        const successfulSearches = events.filter(e => e.type === 'search' && e.success).length;
        const successRate = totalAttempts > 0 ? successfulSearches / totalAttempts : 1;

        // 응답 시간 백분위수
        const durations = events
            .filter(e => e.duration && e.duration > 0)
            .map(e => e.duration!)
            .sort((a, b) => a - b);

        const p50ResponseTime = durations.length > 0
            ? durations[Math.floor(durations.length * 0.5)]
            : 0;
        const p95ResponseTime = durations.length > 0
            ? durations[Math.floor(durations.length * 0.95)]
            : 0;

        // 개선 추세 (최근 7일 vs 이전 7일)
        const now = Date.now();
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

        const recentReports = reports.filter(e => e.timestamp >= oneWeekAgo);
        const previousReports = reports.filter(e =>
            e.timestamp >= twoWeeksAgo && e.timestamp < oneWeekAgo
        );

        const recentAvg = recentReports.length > 0
            ? recentReports.reduce((a, e) => a + (e.metadata?.confidence || 0), 0) / recentReports.length
            : 0;
        const previousAvg = previousReports.length > 0
            ? previousReports.reduce((a, e) => a + (e.metadata?.confidence || 0), 0) / previousReports.length
            : 0;

        const improvementTrend = previousAvg > 0
            ? ((recentAvg - previousAvg) / previousAvg) * 100
            : 0;

        return {
            avgQualityScore: avgConfidence * 10, // 0-10 스케일
            avgConfidence,
            successRate,
            p50ResponseTime,
            p95ResponseTime,
            improvementTrend
        };
    },

    /**
     * 대시보드 데이터
     */
    getDashboardData(): {
        stats: UsageStats;
        performance: ReturnType<typeof ResearchAnalyticsService.getPerformanceMetrics>;
        recentActivity: ResearchEvent[];
    } {
        return {
            stats: this.getUsageStats(),
            performance: this.getPerformanceMetrics(),
            recentActivity: this.getEvents().slice(-20).reverse()
        };
    }
};

export default ResearchAnalyticsService;
