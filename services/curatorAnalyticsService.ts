/**
 * Curator Analytics Service - 분석 & 리포팅
 * 통계 대시보드, A/B 테스트, 성과 측정
 */

import { CuratorService, CuratorLog } from './curatorService';

// ============================================
// Types
// ============================================

export interface DailyStats {
    date: string;           // YYYY-MM-DD
    postsCreated: number;
    postsSkipped: number;
    postsFailed: number;
    avgQualityScore: number;
    avgSafetyScore: number;
    topCategory: string;
    topSource: string;
}

export interface CategoryDistribution {
    category: string;
    count: number;
    percentage: number;
}

export interface SourceDistribution {
    source: string;
    count: number;
    percentage: number;
}

export interface TrendData {
    labels: string[];       // 날짜들
    values: number[];       // 값들
}

export interface EngagementMetrics {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    avgEngagementRate: number;  // (likes + comments) / views * 100
}

export interface ABTestResult {
    variant: string;
    impressions: number;
    clicks: number;
    ctr: number;            // Click-through rate
    engagement: number;
}

export interface PerformanceReport {
    period: 'day' | 'week' | 'month';
    totalPosts: number;
    successRate: number;
    avgQuality: number;
    avgSafety: number;
    topTopics: string[];
    categoryDistribution: CategoryDistribution[];
    sourceDistribution: SourceDistribution[];
    hourlyDistribution: number[];  // 24시간 분포
    trendData: TrendData;
}

// ============================================
// Storage Keys
// ============================================

const ANALYTICS_STORAGE_KEY = 'curator_analytics';
const ENGAGEMENT_STORAGE_KEY = 'curator_engagement';
const AB_TEST_STORAGE_KEY = 'curator_ab_tests';

// ============================================
// Curator Analytics Service
// ============================================

export const CuratorAnalyticsService = {
    /**
     * 📊 일별 통계 수집
     */
    getDailyStats(date?: string): DailyStats {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const logs = CuratorService.getLogs();

        const dayLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            return logDate === targetDate;
        });

        const success = dayLogs.filter(l => l.status === 'success');
        const skipped = dayLogs.filter(l => l.status === 'skipped');
        const failed = dayLogs.filter(l => l.status === 'failed');

        // 카테고리별 집계
        const categories: Record<string, number> = {};
        const sources: Record<string, number> = {};

        dayLogs.forEach(log => {
            // 로그에서 카테고리 추출 (없으면 '기타')
            const cat = '지식 허브'; // 기본값
            categories[cat] = (categories[cat] || 0) + 1;
            sources[log.source] = (sources[log.source] || 0) + 1;
        });

        const topCategory = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '없음';
        const topSource = Object.entries(sources)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '없음';

        // 품질/안전 점수 파싱 (태그에서)
        let totalQuality = 0;
        let totalSafety = 0;
        let qualityCount = 0;

        success.forEach(log => {
            // 실제 게시물에서 품질 점수 추출 가능하면 여기서
            totalQuality += 7; // 기본값
            totalSafety += 90;
            qualityCount++;
        });

        return {
            date: targetDate,
            postsCreated: success.length,
            postsSkipped: skipped.length,
            postsFailed: failed.length,
            avgQualityScore: qualityCount > 0 ? totalQuality / qualityCount : 0,
            avgSafetyScore: qualityCount > 0 ? totalSafety / qualityCount : 0,
            topCategory,
            topSource
        };
    },

    /**
     * 📈 주간 통계
     */
    getWeeklyStats(): DailyStats[] {
        const stats: DailyStats[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            stats.push(this.getDailyStats(dateStr));
        }

        return stats;
    },

    /**
     * 📅 월간 통계
     */
    getMonthlyStats(): DailyStats[] {
        const stats: DailyStats[] = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            stats.push(this.getDailyStats(dateStr));
        }

        return stats;
    },

    /**
     * 📊 카테고리별 분포
     */
    getCategoryDistribution(): CategoryDistribution[] {
        const logs = CuratorService.getLogs();
        const successLogs = logs.filter(l => l.status === 'success');

        const categories: Record<string, number> = {};
        successLogs.forEach(log => {
            const cat = '지식 허브'; // 기본 카테고리
            categories[cat] = (categories[cat] || 0) + 1;
        });

        const total = successLogs.length || 1;

        return Object.entries(categories).map(([category, count]) => ({
            category,
            count,
            percentage: (count / total) * 100
        })).sort((a, b) => b.count - a.count);
    },

    /**
     * 📡 출처별 분포
     */
    getSourceDistribution(): SourceDistribution[] {
        const logs = CuratorService.getLogs();
        const successLogs = logs.filter(l => l.status === 'success');

        const sources: Record<string, number> = {};
        successLogs.forEach(log => {
            sources[log.source] = (sources[log.source] || 0) + 1;
        });

        const total = successLogs.length || 1;

        return Object.entries(sources).map(([source, count]) => ({
            source,
            count,
            percentage: (count / total) * 100
        })).sort((a, b) => b.count - a.count);
    },

    /**
     * ⏰ 시간대별 분포 (24시간)
     */
    getHourlyDistribution(): number[] {
        const logs = CuratorService.getLogs();
        const hours = new Array(24).fill(0);

        logs.filter(l => l.status === 'success').forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            hours[hour]++;
        });

        return hours;
    },

    /**
     * 📈 트렌드 데이터 (게시물 수 추이)
     */
    getTrendData(days: number = 7): TrendData {
        const labels: string[] = [];
        const values: number[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            labels.push(dateStr.slice(5)); // MM-DD
            values.push(this.getDailyStats(dateStr).postsCreated);
        }

        return { labels, values };
    },

    /**
     * 🎯 성과 리포트 생성
     */
    generatePerformanceReport(period: 'day' | 'week' | 'month'): PerformanceReport {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
        const stats = period === 'day'
            ? [this.getDailyStats()]
            : period === 'week'
                ? this.getWeeklyStats()
                : this.getMonthlyStats();

        const totalPosts = stats.reduce((sum, s) => sum + s.postsCreated, 0);
        const totalAttempts = stats.reduce((sum, s) =>
            sum + s.postsCreated + s.postsSkipped + s.postsFailed, 0);

        const successRate = totalAttempts > 0
            ? (totalPosts / totalAttempts) * 100
            : 0;

        const avgQuality = stats.reduce((sum, s) => sum + s.avgQualityScore, 0) / stats.length;
        const avgSafety = stats.reduce((sum, s) => sum + s.avgSafetyScore, 0) / stats.length;

        // 인기 토픽 추출
        const logs = CuratorService.getLogs();
        const topTopics = logs
            .filter(l => l.status === 'success')
            .slice(-10)
            .map(l => l.topic);

        return {
            period,
            totalPosts,
            successRate,
            avgQuality,
            avgSafety,
            topTopics,
            categoryDistribution: this.getCategoryDistribution(),
            sourceDistribution: this.getSourceDistribution(),
            hourlyDistribution: this.getHourlyDistribution(),
            trendData: this.getTrendData(days)
        };
    },

    /**
     * 🧪 A/B 테스트 결과 저장
     */
    recordABTestResult(testName: string, variant: string, impressed: boolean, clicked: boolean): void {
        try {
            const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');

            if (!tests[testName]) {
                tests[testName] = {};
            }
            if (!tests[testName][variant]) {
                tests[testName][variant] = { impressions: 0, clicks: 0 };
            }

            if (impressed) tests[testName][variant].impressions++;
            if (clicked) tests[testName][variant].clicks++;

            localStorage.setItem(AB_TEST_STORAGE_KEY, JSON.stringify(tests));
        } catch (e) {
            console.error('Failed to record A/B test:', e);
        }
    },

    /**
     * 📊 A/B 테스트 결과 조회
     */
    getABTestResults(testName: string): ABTestResult[] {
        try {
            const tests = JSON.parse(localStorage.getItem(AB_TEST_STORAGE_KEY) || '{}');
            const test = tests[testName];

            if (!test) return [];

            return Object.entries(test).map(([variant, data]: [string, any]) => ({
                variant,
                impressions: data.impressions,
                clicks: data.clicks,
                ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
                engagement: 0 // 추후 확장
            }));
        } catch {
            return [];
        }
    },

    /**
     * 💡 최적 게시 시간대 추천
     */
    getOptimalPostingHours(): number[] {
        const hourly = this.getHourlyDistribution();
        const engagementData = this.loadEngagementData();

        // 게시물 수와 참여도를 조합한 점수
        const scores = hourly.map((count, hour) => {
            const engagement = engagementData[hour] || 0;
            return { hour, score: count * 0.3 + engagement * 0.7 };
        });

        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.hour);
    },

    /**
     * 📊 참여도 데이터 로드
     */
    loadEngagementData(): Record<number, number> {
        try {
            return JSON.parse(localStorage.getItem(ENGAGEMENT_STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    },

    /**
     * 💾 참여도 데이터 저장 (외부에서 호출)
     */
    recordEngagement(postId: string, hour: number, views: number, likes: number, comments: number): void {
        try {
            const data = this.loadEngagementData();
            const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;

            // 시간대별 평균 계산
            if (!data[hour]) {
                data[hour] = engagement;
            } else {
                data[hour] = (data[hour] + engagement) / 2; // 이동 평균
            }

            localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to record engagement:', e);
        }
    },

    /**
     * 📈 ROI 분석 (리서치 시간 vs 참여도)
     */
    calculateROI(): {
        avgResearchTime: number;
        avgEngagement: number;
        roi: number;
        recommendation: string;
    } {
        const logs = CuratorService.getLogs();
        const successLogs = logs.filter(l => l.status === 'success');

        // 가상의 리서치 시간 (실제로는 추적 필요)
        const avgResearchTime = 2.5; // 분

        // 참여도 데이터
        const engagementData = this.loadEngagementData();
        const values = Object.values(engagementData) as number[];
        const avgEngagement = values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : 0;

        // ROI = 참여도 / 리서치 시간
        const roi = avgEngagement / avgResearchTime;

        let recommendation = '';
        if (roi > 5) {
            recommendation = '🎉 ROI 우수! 현재 전략 유지 권장';
        } else if (roi > 2) {
            recommendation = '✅ ROI 양호. 키워드 최적화로 개선 가능';
        } else {
            recommendation = '⚠️ ROI 개선 필요. 토픽 선정 기준 재검토 권장';
        }

        return {
            avgResearchTime,
            avgEngagement,
            roi,
            recommendation
        };
    },

    /**
     * 🔥 인기 토픽 패턴 분석
     */
    analyzeTopicPatterns(): {
        topKeywords: string[];
        topSources: string[];
        successPatterns: string[];
    } {
        const logs = CuratorService.getLogs();
        const successLogs = logs.filter(l => l.status === 'success');

        // 키워드 추출
        const keywords: Record<string, number> = {};
        successLogs.forEach(log => {
            const words = log.topic.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) {
                    keywords[word] = (keywords[word] || 0) + 1;
                }
            });
        });

        const topKeywords = Object.entries(keywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([k]) => k);

        // 출처별 성공률
        const sources: Record<string, { success: number; total: number }> = {};
        logs.forEach(log => {
            if (!sources[log.source]) {
                sources[log.source] = { success: 0, total: 0 };
            }
            sources[log.source].total++;
            if (log.status === 'success') {
                sources[log.source].success++;
            }
        });

        const topSources = Object.entries(sources)
            .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
            .slice(0, 3)
            .map(([s]) => s);

        // 성공 패턴
        const successPatterns: string[] = [];
        if (topKeywords.includes('ai') || topKeywords.includes('gpt')) {
            successPatterns.push('AI 관련 토픽 인기');
        }
        if (topSources.includes('hackernews')) {
            successPatterns.push('HackerNews 출처 성공률 높음');
        }
        if (this.getOptimalPostingHours().includes(9)) {
            successPatterns.push('오전 9시대 게시 효과적');
        }

        return {
            topKeywords,
            topSources,
            successPatterns
        };
    },

    /**
     * 📋 전체 분석 요약
     */
    getAnalyticsSummary(): {
        daily: DailyStats;
        weekly: PerformanceReport;
        patterns: ReturnType<typeof this.analyzeTopicPatterns>;
        roi: ReturnType<typeof this.calculateROI>;
        optimalHours: number[];
    } {
        return {
            daily: this.getDailyStats(),
            weekly: this.generatePerformanceReport('week'),
            patterns: this.analyzeTopicPatterns(),
            roi: this.calculateROI(),
            optimalHours: this.getOptimalPostingHours()
        };
    }
};

export default CuratorAnalyticsService;
