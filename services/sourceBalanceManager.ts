/**
 * Source Balance Manager - Phase 4.1 Checkpoint 3
 * 출처별 게시 비율 균형 유지 시스템
 */

export interface SourceBalance {
    reddit: number;        // Reddit 게시 횟수
    hackernews: number;    // Hacker News 게시 횟수
    directSearch: number;  // 직접 검색 게시 횟수
    lastResetDate: string; // 마지막 리셋 날짜 (YYYY-MM-DD)
}

const SOURCE_BALANCE_KEY = 'curator_source_balance';

// 목표 비율
const TARGET_RATIOS = {
    reddit: 0.5,        // 50%
    hackernews: 0.3,    // 30%
    directSearch: 0.2   // 20%
};

export const SourceBalanceManager = {
    /**
     * 출처 균형 데이터 가져오기
     */
    getSourceBalance(): SourceBalance {
        try {
            const stored = localStorage.getItem(SOURCE_BALANCE_KEY);
            if (!stored) {
                return this.createEmptyBalance();
            }

            const balance: SourceBalance = JSON.parse(stored);

            // 날짜가 바뀌었으면 리셋
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            if (balance.lastResetDate !== today) {
                console.log(`📅 New day detected. Resetting source balance.`);
                return this.createEmptyBalance();
            }

            return balance;
        } catch (error) {
            console.error('Error loading source balance:', error);
            return this.createEmptyBalance();
        }
    },

    /**
     * 빈 균형 데이터 생성
     */
    createEmptyBalance(): SourceBalance {
        const today = new Date().toISOString().split('T')[0];
        const balance: SourceBalance = {
            reddit: 0,
            hackernews: 0,
            directSearch: 0,
            lastResetDate: today
        };

        this.saveSourceBalance(balance);
        return balance;
    },

    /**
     * 출처 균형 저장
     */
    saveSourceBalance(balance: SourceBalance) {
        localStorage.setItem(SOURCE_BALANCE_KEY, JSON.stringify(balance));
    },

    /**
     * 출처 기록
     */
    recordSource(source: 'reddit' | 'hackernews' | 'wikipedia') {
        const balance = this.getSourceBalance();

        if (source === 'reddit') {
            balance.reddit++;
        } else if (source === 'hackernews') {
            balance.hackernews++;
        } else {
            balance.directSearch++;
        }

        this.saveSourceBalance(balance);

        console.log(`📊 Source balance updated: R${balance.reddit} / HN${balance.hackernews} / DS${balance.directSearch}`);
    },

    /**
     * 현재 비율 계산
     */
    getCurrentRatios(): { reddit: number; hackernews: number; directSearch: number } {
        const balance = this.getSourceBalance();
        const total = balance.reddit + balance.hackernews + balance.directSearch;

        if (total === 0) {
            return { reddit: 0, hackernews: 0, directSearch: 0 };
        }

        return {
            reddit: balance.reddit / total,
            hackernews: balance.hackernews / total,
            directSearch: balance.directSearch / total
        };
    },

    /**
     * 출처 우선순위 결정
     * 목표 비율에서 가장 부족한 출처를 우선
     */
    getPrioritySource(): 'reddit' | 'hackernews' | 'directSearch' {
        const current = this.getCurrentRatios();
        const balance = this.getSourceBalance();
        const total = balance.reddit + balance.hackernews + balance.directSearch;

        // 아직 게시물이 없으면 reddit 우선
        if (total === 0) {
            console.log(`🎯 Priority source: reddit (first post)`);
            return 'reddit';
        }

        // 각 출처의 "부족분" 계산 (목표 - 현재)
        const deficit = {
            reddit: TARGET_RATIOS.reddit - current.reddit,
            hackernews: TARGET_RATIOS.hackernews - current.hackernews,
            directSearch: TARGET_RATIOS.directSearch - current.directSearch
        };

        console.log(`📊 Current ratios: R${(current.reddit * 100).toFixed(1)}% / HN${(current.hackernews * 100).toFixed(1)}% / DS${(current.directSearch * 100).toFixed(1)}%`);
        console.log(`📊 Target ratios: R50% / HN30% / DS20%`);
        console.log(`📊 Deficits: R${(deficit.reddit * 100).toFixed(1)}% / HN${(deficit.hackernews * 100).toFixed(1)}% / DS${(deficit.directSearch * 100).toFixed(1)}%`);

        // 가장 부족한 출처 선택
        let priority: 'reddit' | 'hackernews' | 'directSearch' = 'reddit';
        let maxDeficit = deficit.reddit;

        if (deficit.hackernews > maxDeficit) {
            priority = 'hackernews';
            maxDeficit = deficit.hackernews;
        }

        if (deficit.directSearch > maxDeficit) {
            priority = 'directSearch';
            maxDeficit = deficit.directSearch;
        }

        console.log(`🎯 Priority source: ${priority} (deficit: ${(maxDeficit * 100).toFixed(1)}%)`);

        return priority;
    },

    /**
     * 출처 선택 (우선순위 기반)
     * @param availableSources 사용 가능한 출처 목록
     * @returns 선택된 출처
     */
    selectSource(availableSources: Array<'reddit' | 'hackernews' | 'directSearch'>): 'reddit' | 'hackernews' | 'directSearch' | null {
        if (availableSources.length === 0) {
            return null;
        }

        const priority = this.getPrioritySource();

        // 우선순위 출처가 사용 가능하면 선택
        if (availableSources.includes(priority)) {
            return priority;
        }

        // 없으면 다음 우선순위
        const priorities: Array<'reddit' | 'hackernews' | 'directSearch'> =
            [priority, 'reddit', 'hackernews', 'directSearch'];

        for (const source of priorities) {
            if (availableSources.includes(source)) {
                console.log(`⚠️ Priority ${priority} not available, using ${source}`);
                return source;
            }
        }

        return availableSources[0];
    },

    /**
     * 디버그: 현재 상태 출력
     */
    debugBalance() {
        const balance = this.getSourceBalance();
        const ratios = this.getCurrentRatios();
        const total = balance.reddit + balance.hackernews + balance.directSearch;

        console.log('📊 Source Balance Status:');
        console.log(`   Date: ${balance.lastResetDate}`);
        console.log(`   Total: ${total} posts`);
        console.log(`   Reddit: ${balance.reddit} (${(ratios.reddit * 100).toFixed(1)}% / target 50%)`);
        console.log(`   HN: ${balance.hackernews} (${(ratios.hackernews * 100).toFixed(1)}% / target 30%)`);
        console.log(`   Direct: ${balance.directSearch} (${(ratios.directSearch * 100).toFixed(1)}% / target 20%)`);
    }
};
