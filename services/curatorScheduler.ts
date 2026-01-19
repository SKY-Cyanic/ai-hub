/**
 * AI Curator Scheduler - Phase 4
 * setInterval 기반 자동 큐레이션 스케줄러
 */

import { CuratorService, CuratorConfig } from './curatorService';

const STORAGE_KEY_LAST_RUN = 'curator_last_run';
const STORAGE_KEY_SCHEDULER_STATE = 'curator_scheduler_state';

export class CuratorScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * 스케줄러 시작
     */
    start(config: CuratorConfig) {
        if (this.isRunning) {
            console.log('⚠️ Scheduler already running');
            return;
        }

        if (!config.enabled) {
            console.log('📴 Curator is disabled');
            return;
        }

        console.log(`🚀 Starting Curator Scheduler (every ${config.intervalHours}h)`);

        this.isRunning = true;
        this.saveSchedulerState(true);

        // 즉시 한 번 실행 (누락 확인)
        this.checkAndRun(config);

        // Interval 설정
        const intervalMs = config.intervalHours * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.checkAndRun(config);
        }, intervalMs);

        console.log(`✅ Scheduler started. Next run in ${config.intervalHours}h`);
    }

    /**
     * 스케줄러 중지
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        this.saveSchedulerState(false);
        console.log('🛑 Scheduler stopped');
    }

    /**
     * 실행 여부 확인 및 큐레이션 실행
     */
    private async checkAndRun(config: CuratorConfig) {
        console.log('⏰ Scheduler tick - checking conditions...');

        // 1. 마지막 실행 시간 확인
        const lastRun = this.getLastRunTime();
        const now = Date.now();
        const elapsed = now - lastRun;
        const interval = config.intervalHours * 60 * 60 * 1000;

        if (elapsed < interval) {
            const remaining = Math.ceil((interval - elapsed) / (1000 * 60));
            console.log(`⏳ Too soon. Next run in ${remaining} minutes`);
            return;
        }

        // 2. 오늘 게시 가능 여부 확인
        if (!CuratorService.canPost()) {
            console.log('📊 Daily post limit reached. Skipping.');
            return;
        }

        // 3. 큐레이션 실행
        await this.runCuration(config);
    }

    /**
     * 큐레이션 실행
     */
    private async runCuration(config: CuratorConfig) {
        console.log('🎬 Starting curation cycle...');

        try {
            // 1. 트렌딩 토픽 수집
            const topics = await CuratorService.fetchAllTrendingTopics();

            if (topics.length === 0) {
                console.log('❌ No trending topics found');
                return;
            }

            // 2. 우선순위 결정
            const prioritized = CuratorService.prioritizeTopics(topics);

            // 3. 상위 토픽 선택
            const topTopic = prioritized[0];

            if (!topTopic) {
                console.log('❌ No suitable topic found');
                return;
            }

            console.log(`🎯 Selected topic: ${topTopic.title} (score: ${topTopic.score})`);

            // 4. 자동 리서치 & 게시
            const postId = await CuratorService.autoResearchAndPost(topTopic, this.userId);

            if (postId) {
                console.log(`🎉 Curation successful! Post ID: ${postId}`);
                this.setLastRunTime(Date.now());
            } else {
                console.log('⚠️ Curation failed or skipped');
            }

        } catch (error) {
            console.error('❌ Curation error:', error);
        }
    }

    /**
     * 마지막 실행 시간 저장
     */
    private setLastRunTime(timestamp: number) {
        localStorage.setItem(STORAGE_KEY_LAST_RUN, timestamp.toString());
    }

    /**
     * 마지막 실행 시간 조회
     */
    private getLastRunTime(): number {
        const stored = localStorage.getItem(STORAGE_KEY_LAST_RUN);
        return stored ? parseInt(stored, 10) : 0;
    }

    /**
     * 스케줄러 상태 저장
     */
    private saveSchedulerState(isRunning: boolean) {
        localStorage.setItem(STORAGE_KEY_SCHEDULER_STATE, JSON.stringify({
            isRunning,
            lastUpdate: Date.now()
        }));
    }

    /**
     * 스케줄러 상태 조회
     */
    static getSchedulerState(): { isRunning: boolean; lastUpdate: number } | null {
        const stored = localStorage.getItem(STORAGE_KEY_SCHEDULER_STATE);
        return stored ? JSON.parse(stored) : null;
    }

    /**
     * 수동 실행
     */
    async runNow(config: CuratorConfig) {
        console.log('🔧 Manual curation triggered');
        await this.runCuration(config);
    }

    /**
     * 실행 상태 확인
     */
    getStatus(): { isRunning: boolean; lastRun: number; nextRun: number } {
        const lastRun = this.getLastRunTime();
        const config = CuratorService.loadConfig();
        const interval = config.intervalHours * 60 * 60 * 1000;
        const nextRun = lastRun + interval;

        return {
            isRunning: this.isRunning,
            lastRun,
            nextRun
        };
    }
}

// 싱글톤 인스턴스
let schedulerInstance: CuratorScheduler | null = null;

export function getCuratorScheduler(userId: string): CuratorScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new CuratorScheduler(userId);
    }
    return schedulerInstance;
}
