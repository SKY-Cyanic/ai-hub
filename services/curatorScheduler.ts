/**
 * AI Curator Scheduler - Phase 4
 * setInterval 기반 자동 큐레이션 스케줄러
 */

import { CuratorService, CuratorConfig } from './curatorService';

const STORAGE_KEY_LAST_RUN = 'curator_last_run';
const STORAGE_KEY_SCHEDULER_STATE = 'curator_scheduler_state';

interface SchedulerStatus {
    enabled: boolean;
    lastRunTime: number | null;
    nextRunTime: number | null;
}

export class CuratorScheduler {
    private intervalId: number | null = null;
    private userId: string;
    private isRunning: boolean = false; // 중복 실행 방지 플래그
    private status: SchedulerStatus = {
        enabled: false,
        lastRunTime: null,
        nextRunTime: null
    };

    private readonly LAST_RUN_KEY = 'curator_last_run';
    private readonly STATUS_KEY = 'curator_status';

    constructor(userId: string) {
        this.userId = userId;
        // Load initial status from storage
        const storedStatus = localStorage.getItem(this.STATUS_KEY);
        if (storedStatus) {
            this.status = JSON.parse(storedStatus);
        }
        const storedLastRun = localStorage.getItem(this.LAST_RUN_KEY);
        if (storedLastRun) {
            this.status.lastRunTime = parseInt(storedLastRun, 10);
        }
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
        this.status.enabled = true;
        this.saveSchedulerState();

        // 즉시 한 번 실행 (누락 확인)
        this.checkAndRun(config);

        // Interval 설정
        const intervalMs = config.intervalHours * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.checkAndRun(config);
        }, intervalMs) as unknown as number; // Cast to number for browser compatibility

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
        this.status.enabled = false;
        this.saveSchedulerState();
        console.log('🛑 Scheduler stopped');
    }

    /**
     * 실행 여부 확인 및 큐레이션 실행
     */
    private async checkAndRun(config: CuratorConfig) {
        console.log('⏰ Scheduler tick - checking conditions...');

        // 1. 마지막 실행 시간 확인
        const lastRun = this.status.lastRunTime || 0;
        const now = Date.now();
        const elapsed = now - lastRun;
        const interval = config.intervalHours * 60 * 60 * 1000;

        if (elapsed < interval) {
            const remaining = Math.ceil((interval - elapsed) / (1000 * 60));
            console.log(`⏳ Too soon. Next run in ${remaining} minutes`);
            this.status.nextRunTime = now + (interval - elapsed);
            this.saveSchedulerState();
            return;
        }

        // 2. 오늘 게시 가능 여부 확인 (runCuration 내부로 이동)

        // 3. 큐레이션 실행
        await this.runCuration(this.userId);
        this.status.nextRunTime = (this.status.lastRunTime || now) + interval;
        this.saveSchedulerState();
    }

    /**
     * 큐레이션 실행
     */
    private async runCuration(userId: string): Promise<void> {
        // 중복 실행 방지
        if (this.isRunning) {
            console.log('⏸️ Curator already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🤖 Starting AI Curator run...');

        try {
            // 1. 게시 가능 여부 확인
            if (!CuratorService.canPost()) {
                console.log('📊 Daily post limit reached');
                return;
            }

            // 2. 토픽 수집
            const topics = await CuratorService.fetchAllTrendingTopics();

            if (topics.length === 0) {
                console.log('⚠️ No topics found');
                return;
            }

            // 3. 우선순위 결정
            const prioritized = CuratorService.prioritizeTopics(topics);

            if (prioritized.length === 0) {
                console.log('⚠️ No topics passed filtering');
                return;
            }

            // 4. 최고 우선순위 토픽 선택
            const selectedTopic = prioritized[0];
            console.log(`🎯 Selected topic: ${selectedTopic.title} (score: ${selectedTopic.score})`);

            // 5. 자동 리서치 & 게시 (한번만)
            const postId = await CuratorService.autoResearchAndPost(selectedTopic, userId);

            if (postId) {
                console.log(`✅ Successfully curated and posted: ${postId}`);
                // 마지막 실행 시간 저장
                this.status.lastRunTime = Date.now();
                localStorage.setItem(this.LAST_RUN_KEY, this.status.lastRunTime.toString());
            } else {
                console.warn('⚠️ Curation failed or skipped');
            }

        } catch (error) {
            console.error('❌ Curation error:', error);
        } finally {
            this.isRunning = false;
        }
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
    private saveSchedulerState() {
        localStorage.setItem(STORAGE_KEY_SCHEDULER_STATE, JSON.stringify({
            isRunning: this.isRunning,
            enabled: this.status.enabled,
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
