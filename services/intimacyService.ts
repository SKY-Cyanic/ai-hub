/**
 * 친밀도 & 게이미피케이션 시스템
 */

// 친밀도 시스템
export interface Intimacy {
    persona_id: string;
    user_id: string;
    level: number;           // 1-100
    exp: number;             // 현재 경험치
    exp_to_next: number;     // 다음 레벨까지
    total_messages: number;
    unlocked_styles: string[]; // 해금된 대화 스타일
    last_interaction: string; // 마지막 대화 시간
}

// 일일 퀘스트
export interface DailyQuest {
    id: string;
    type: 'chat_count' | 'specific_topic' | 'use_feature';
    description: string;
    target: number;
    current: number;
    reward_cr: number;
    completed: boolean;
    date: string; // YYYY-MM-DD
}

// 숨겨진 대사
export interface HiddenDialogue {
    id: string;
    persona_id: string;
    trigger_keywords: string[];
    trigger_condition: 'keyword' | 'time' | 'intimacy_level' | 'random';
    required_intimacy?: number;
    dialogue: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    collected: boolean;
    unlocked_at?: string;
}

// 연속 대화 스트릭
export interface ConversationStreak {
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_chat_date: string; // YYYY-MM-DD
    total_days: number;
}

// 친밀도 서비스
export const IntimacyService = {
    // 경험치 획득량 (메시지당)
    EXP_PER_MESSAGE: 10,

    // 레벨별 필요 경험치 계산
    getExpForLevel(level: number): number {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    },

    // 친밀도 조회
    async getIntimacy(userId: string, personaId: string): Promise<Intimacy> {
        const key = `intimacy_${userId}_${personaId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            return JSON.parse(stored);
        }

        // 기본 친밀도
        const newIntimacy: Intimacy = {
            persona_id: personaId,
            user_id: userId,
            level: 1,
            exp: 0,
            exp_to_next: this.getExpForLevel(1),
            total_messages: 0,
            unlocked_styles: [],
            last_interaction: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(newIntimacy));
        return newIntimacy;
    },

    // EXP 획득 및 레벨업
    async addExp(userId: string, personaId: string, messages: number = 1): Promise<{ intimacy: Intimacy; leveledUp: boolean; newLevel?: number }> {
        const intimacy = await this.getIntimacy(userId, personaId);
        const gainedExp = this.EXP_PER_MESSAGE * messages;

        intimacy.exp += gainedExp;
        intimacy.total_messages += messages;
        intimacy.last_interaction = new Date().toISOString();

        let leveledUp = false;
        let newLevel = intimacy.level;

        // 레벨업 체크
        while (intimacy.exp >= intimacy.exp_to_next && intimacy.level < 100) {
            intimacy.exp -= intimacy.exp_to_next;
            intimacy.level++;
            newLevel = intimacy.level;
            leveledUp = true;
            intimacy.exp_to_next = this.getExpForLevel(intimacy.level);

            // 레벨별 해금 항목
            this.unlockFeatures(intimacy);
        }

        const key = `intimacy_${userId}_${personaId}`;
        localStorage.setItem(key, JSON.stringify(intimacy));

        return { intimacy, leveledUp, newLevel: leveledUp ? newLevel : undefined };
    },

    // 레벨별 기능 해금
    unlockFeatures(intimacy: Intimacy): void {
        if (intimacy.level === 10 && !intimacy.unlocked_styles.includes('nickname')) {
            intimacy.unlocked_styles.push('nickname');
        }
        if (intimacy.level === 25 && !intimacy.unlocked_styles.includes('flirty')) {
            intimacy.unlocked_styles.push('flirty');
        }
        if (intimacy.level === 50 && !intimacy.unlocked_styles.includes('deep_talk')) {
            intimacy.unlocked_styles.push('deep_talk');
        }
        if (intimacy.level === 75 && !intimacy.unlocked_styles.includes('confession')) {
            intimacy.unlocked_styles.push('confession');
        }
    }
};

// 퀘스트 서비스
export const QuestService = {
    // 오늘 퀘스트 조회
    async getTodayQuests(userId: string): Promise<DailyQuest[]> {
        const today = new Date().toISOString().split('T')[0];
        const key = `quests_${userId}_${today}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            return JSON.parse(stored);
        }

        // 새 퀘스트 생성
        const quests: DailyQuest[] = [
            {
                id: 'daily_chat_5',
                type: 'chat_count',
                description: 'AI 친구와 5회 대화하기',
                target: 5,
                current: 0,
                reward_cr: 5,
                completed: false,
                date: today
            },
            {
                id: 'daily_chat_10',
                type: 'chat_count',
                description: 'AI 친구와 10회 대화하기',
                target: 10,
                current: 0,
                reward_cr: 15,
                completed: false,
                date: today
            }
        ];

        localStorage.setItem(key, JSON.stringify(quests));
        return quests;
    },

    // 퀘스트 진행도 업데이트
    async updateQuestProgress(userId: string, type: string, increment: number = 1): Promise<DailyQuest[]> {
        const quests = await this.getTodayQuests(userId);
        const today = new Date().toISOString().split('T')[0];

        quests.forEach(quest => {
            if (quest.type === type && !quest.completed) {
                quest.current = Math.min(quest.current + increment, quest.target);
                if (quest.current >= quest.target) {
                    quest.completed = true;
                }
            }
        });

        const key = `quests_${userId}_${today}`;
        localStorage.setItem(key, JSON.stringify(quests));

        return quests;
    },

    // 퀘스트 보상 수령
    async claimReward(userId: string, questId: string): Promise<number> {
        const quests = await this.getTodayQuests(userId);
        const quest = quests.find(q => q.id === questId);

        if (quest && quest.completed) {
            // 보상 지급 로직은 storage.ts에서 처리
            return quest.reward_cr;
        }

        return 0;
    }
};

// 스트릭 서비스
export const StreakService = {
    // 스트릭 조회
    async getStreak(userId: string): Promise<ConversationStreak> {
        const key = `streak_${userId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            return JSON.parse(stored);
        }

        const newStreak: ConversationStreak = {
            user_id: userId,
            current_streak: 0,
            longest_streak: 0,
            last_chat_date: '',
            total_days: 0
        };

        localStorage.setItem(key, JSON.stringify(newStreak));
        return newStreak;
    },

    // 오늘 대화 체크
    async checkTodayChat(userId: string): Promise<{ streak: ConversationStreak; bonus?: number }> {
        const streak = await this.getStreak(userId);
        const today = new Date().toISOString().split('T')[0];

        if (streak.last_chat_date === today) {
            // 오늘 이미 체크됨
            return { streak };
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (streak.last_chat_date === yesterdayStr) {
            // 연속 대화
            streak.current_streak++;
        } else if (streak.last_chat_date !== '') {
            // 스트릭 끊김
            streak.current_streak = 1;
        } else {
            // 첫 대화
            streak.current_streak = 1;
        }

        streak.last_chat_date = today;
        streak.total_days++;

        if (streak.current_streak > streak.longest_streak) {
            streak.longest_streak = streak.current_streak;
        }

        const key = `streak_${userId}`;
        localStorage.setItem(key, JSON.stringify(streak));

        // 보너스 계산
        let bonus = 0;
        if (streak.current_streak === 7) bonus = 20;
        if (streak.current_streak === 14) bonus = 50;
        if (streak.current_streak === 30) bonus = 100;

        return { streak, bonus };
    }
};
