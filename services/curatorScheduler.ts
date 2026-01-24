/**
 * AI Curator Auto Scheduler - Phase 4 Enhanced
 * 매시 정각 자동 큐레이션 (수동 활성화 불필요)
 * 1:00, 2:00, ..., 23:00, 0:00 자동 실행
 */

import { CuratorService, CuratorConfig, DiversityManager, QualityGate } from './curatorService';
import { ErrorRecoveryService } from './researchErrorRecovery';

// ============================================
// Constants
// ============================================

const STORAGE_KEY_LAST_RUN = 'curator_last_run_hour';
const STORAGE_KEY_SCHEDULER_STATE = 'curator_scheduler_state';
const STORAGE_KEY_EMERGENCY_STOP = 'curator_emergency_stop';

// ============================================
// Types
// ============================================

interface SchedulerStatus {
    enabled: boolean;
    lastRunHour: number;
    lastRunDate: string;
    nextRunHour: number;
    isProcessing: boolean;
    totalRuns: number;
    successfulRuns: number;
}

// ============================================
// Auto Hourly Curator Scheduler
// ============================================

export class AutoCuratorScheduler {
    private checkIntervalId: number | null = null;
    private userId: string;
    private isProcessing: boolean = false;
    private emergencyStop: boolean = false;

    private status: SchedulerStatus = {
        enabled: true,  // 기본 활성화
        lastRunHour: -1,
        lastRunDate: '',
        nextRunHour: -1,
        isProcessing: false,
        totalRuns: 0,
        successfulRuns: 0
    };

    constructor(userId: string) {
        this.userId = userId;
        this.loadStatus();
        this.checkEmergencyStop();
    }

    /**
     * 🚀 자동 스케줄러 시작 (앱 로드 시 자동 호출)
     */
    startAutoScheduler(): void {
        if (this.emergencyStop) {
            console.log('🛑 Emergency stop is active. Scheduler disabled.');
            return;
        }

        console.log('🤖 Auto Curator Scheduler starting...');

        // 🔥 Catch-up: 놓친 시간만큼 즉시 실행
        this.runCatchUpIfNeeded();

        // 1분마다 현재 시간 체크
        this.checkIntervalId = setInterval(() => {
            this.checkAndRunHourly();
        }, 60 * 1000) as unknown as number; // 60초마다 체크

        // 즉시 한 번 체크
        this.checkAndRunHourly();

        console.log('✅ Auto Scheduler is now running (every hour at :00)');
    }

    /**
     * 🔥 Catch-up 모드: 놓친 시간만큼 즉시 실행
     */
    private async runCatchUpIfNeeded(): Promise<void> {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDate = now.toISOString().split('T')[0];

        // 마지막 실행 정보 확인
        const lastRunDate = this.status.lastRunDate;
        const lastRunHour = this.status.lastRunHour;

        // 오늘 아직 실행 안했으면
        if (lastRunDate !== currentDate) {
            // 새로운 날이면 현재 시간만큼 놓친 것
            const missedHours = Math.min(currentHour, 3); // 최대 3개까지만 catch-up
            console.log(`🔄 Catch-up mode: missed ~${currentHour}h, running ${missedHours} jobs`);

            for (let i = 0; i < missedHours; i++) {
                if (this.checkEmergencyStop()) break;
                if (!CuratorService.canPost()) {
                    console.log('⚠️ Daily post limit reached during catch-up.');
                    break;
                }

                console.log(`⏳ Catch-up job ${i + 1}/${missedHours}...`);

                try {
                    await this.runCuration(currentHour, currentDate);
                    // 성공 시 대기 (API 부하 방지)
                    await new Promise(r => setTimeout(r, 20000));
                } catch (e) {
                    console.error('❌ Catch-up job failed, stopping catch-up sequence:', e);
                    break; // 하나라도 실패하면 나머지 catch-up 포기
                }
            }
        } else if (lastRunHour < currentHour - 1) {
            // 같은 날이지만 시간이 많이 지났으면
            const missedHours = Math.min(currentHour - lastRunHour - 1, 3);
            console.log(`🔄 Catch-up mode: missed ${missedHours}h today`);

            for (let i = 0; i < missedHours; i++) {
                if (this.checkEmergencyStop()) break;
                if (!CuratorService.canPost()) break;

                console.log(`⏳ Catch-up job ${i + 1}/${missedHours}...`);
                try {
                    await this.runCuration(currentHour, currentDate);
                    await new Promise(r => setTimeout(r, 20000));
                } catch (e) {
                    console.error('❌ Catch-up job failed:', e);
                    break;
                }
            }
        }
    }

    /**
     * 🛑 스케줄러 중지
     */
    stop(): void {
        if (this.checkIntervalId) {
            clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }
        this.status.enabled = false;
        this.saveStatus();
        console.log('🛑 Auto Scheduler stopped');
    }

    /**
     * ⏰ 매시 정각 실행 체크
     */
    private async checkAndRunHourly(): Promise<void> {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // 정각 체크 (0-5분 사이만 실행)
        if (currentMinute > 5) {
            return;
        }

        // 이미 이 시간에 실행했는지 체크
        if (this.status.lastRunHour === currentHour &&
            this.status.lastRunDate === currentDate) {
            return;
        }

        // Emergency stop 체크
        if (this.checkEmergencyStop()) {
            console.log('🛑 Emergency stop active');
            return;
        }

        // 처리 중이면 스킵
        if (this.isProcessing) {
            console.log('⏳ Already processing, skipping...');
            return;
        }

        console.log(`⏰ Hourly trigger: ${currentHour}:00`);
        await this.runCuration(currentHour, currentDate);
    }

    /**
     * 🤖 큐레이션 실행
     */
    private async runCuration(hour: number, date: string): Promise<void> {
        this.isProcessing = true;
        this.status.isProcessing = true;
        this.status.totalRuns++;
        this.saveStatus();

        console.log(`🚀 Starting auto curation at ${hour}:00...`);

        try {
            // 1. 게시 가능 여부 확인
            if (!CuratorService.canPost()) {
                console.log('📊 Daily post limit reached');
                return;
            }

            // 2. 토픽 수집 (with retry)
            const topicsResult = await ErrorRecoveryService.withRetry(
                () => CuratorService.fetchAllTrendingTopics(),
                { maxRetries: 3 },
                async () => [] // 폴백: 빈 배열
            );

            if (!topicsResult.success || !topicsResult.data || topicsResult.data.length === 0) {
                console.log('⚠️ No topics found');
                return;
            }

            const topics = topicsResult.data;
            console.log(`📰 Found ${topics.length} topics`);

            // 3. 우선순위 결정
            const prioritized = CuratorService.prioritizeTopics(topics);

            if (prioritized.length === 0) {
                console.log('⚠️ No topics passed filtering');
                return;
            }

            // 4. 다양성 통과하는 토픽 선택 (첫 번째가 실패하면 다음 시도)
            let selectedTopic = null;
            for (const topic of prioritized.slice(0, 5)) {
                const keywords = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                const diversityCheck = DiversityManager.checkDiversity(topic, keywords);

                if (diversityCheck.pass) {
                    selectedTopic = topic;
                    break;
                } else {
                    console.log(`⏭️ Skipping (diversity): ${diversityCheck.reason}`);
                }
            }

            if (!selectedTopic) {
                console.log('⚠️ No topics passed diversity check');
                return;
            }

            console.log(`🎯 Selected: ${selectedTopic.title}`);

            // 5. 자동 리서치 & 게시
            const postId = await CuratorService.autoResearchAndPost(selectedTopic, this.userId);

            if (postId) {
                console.log(`✅ Successfully curated: ${postId}`);
                this.status.successfulRuns++;
                this.status.lastRunHour = hour;
                this.status.lastRunDate = date;
            }

        } catch (error) {
            console.error('❌ Curation error:', error);
        } finally {
            this.isProcessing = false;
            this.status.isProcessing = false;
            this.status.nextRunHour = (hour + 1) % 24;
            this.saveStatus();
        }
    }

    /**
     * 🔧 수동 실행 (디버그/테스트용)
     */
    async runNow(): Promise<void> {
        const now = new Date();
        await this.runCuration(now.getHours(), now.toISOString().split('T')[0]);
    }

    /**
     * 🚨 긴급 중단
     */
    emergencyStopNow(): void {
        console.log('🚨 EMERGENCY STOP ACTIVATED');
        localStorage.setItem(STORAGE_KEY_EMERGENCY_STOP, 'true');
        this.emergencyStop = true;
        this.stop();
    }

    /**
     * ✅ 긴급 중단 해제
     */
    clearEmergencyStop(): void {
        localStorage.removeItem(STORAGE_KEY_EMERGENCY_STOP);
        this.emergencyStop = false;
        console.log('✅ Emergency stop cleared');
    }

    /**
     * 긴급 중단 상태 확인
     */
    private checkEmergencyStop(): boolean {
        this.emergencyStop = localStorage.getItem(STORAGE_KEY_EMERGENCY_STOP) === 'true';
        return this.emergencyStop;
    }

    /**
     * 상태 저장
     */
    private saveStatus(): void {
        localStorage.setItem(STORAGE_KEY_SCHEDULER_STATE, JSON.stringify(this.status));
    }

    /**
     * 상태 로드
     */
    private loadStatus(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SCHEDULER_STATE);
            if (stored) {
                this.status = { ...this.status, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load scheduler status:', e);
        }
    }

    /**
     * 📊 상태 조회
     */
    getStatus(): {
        isRunning: boolean;
        lastRunHour: number;
        lastRunDate: string;
        nextRunHour: number;
        isProcessing: boolean;
        successRate: number;
        emergencyStop: boolean;
    } {
        const successRate = this.status.totalRuns > 0
            ? this.status.successfulRuns / this.status.totalRuns
            : 1;

        return {
            isRunning: this.checkIntervalId !== null,
            lastRunHour: this.status.lastRunHour,
            lastRunDate: this.status.lastRunDate,
            nextRunHour: this.status.nextRunHour,
            isProcessing: this.isProcessing,
            successRate,
            emergencyStop: this.emergencyStop
        };
    }
}

// ============================================
// Singleton Instance
// ============================================

let autoSchedulerInstance: AutoCuratorScheduler | null = null;

export function getAutoCuratorScheduler(userId: string): AutoCuratorScheduler {
    if (!autoSchedulerInstance) {
        autoSchedulerInstance = new AutoCuratorScheduler(userId);
    }
    return autoSchedulerInstance;
}

/**
 * 앱 초기화 시 자동 시작
 */
export function initAutoCurator(userId: string): AutoCuratorScheduler {
    const scheduler = getAutoCuratorScheduler(userId);
    scheduler.startAutoScheduler();
    return scheduler;
}

// Legacy compatibility
export { AutoCuratorScheduler as CuratorScheduler };
export function getCuratorScheduler(userId: string) {
    return getAutoCuratorScheduler(userId);
}
