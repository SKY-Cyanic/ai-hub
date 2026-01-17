/**
 * Phase 5: 대화 통계 & 감정 분석
 */

// 대화 통계
export interface ConversationStats {
    userId: string;
    personaId: string;
    totalMessages: number;
    totalDays: number;
    averageMessagesPerDay: number;
    longestStreak: number;
    favoriteTopics: string[];
    emotionDistribution: {
        positive: number;
        neutral: number;
        negative: number;
    };
    lastUpdated: string;
}

// 감정 분석 결과
export interface EmotionAnalysis {
    emotion: 'positive' | 'neutral' | 'negative';
    confidence: number;
    keywords: string[];
}

// 통계 서비스
export const StatsService = {
    // 대화 통계 조회
    async getStats(userId: string, personaId: string): Promise<ConversationStats> {
        const key = `stats_${userId}_${personaId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            return JSON.parse(stored);
        }

        const newStats: ConversationStats = {
            userId,
            personaId,
            totalMessages: 0,
            totalDays: 0,
            averageMessagesPerDay: 0,
            longestStreak: 0,
            favoriteTopics: [],
            emotionDistribution: {
                positive: 0,
                neutral: 0,
                negative: 0
            },
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(newStats));
        return newStats;
    },

    // 메시지 추가 시 통계 업데이트
    async updateStats(userId: string, personaId: string, message: string): Promise<ConversationStats> {
        const stats = await this.getStats(userId, personaId);

        stats.totalMessages++;

        // 감정 분석 (간단한 키워드 기반)
        const emotion = this.analyzeEmotion(message);
        if (emotion === 'positive') stats.emotionDistribution.positive++;
        else if (emotion === 'negative') stats.emotionDistribution.negative++;
        else stats.emotionDistribution.neutral++;

        // 주제 추출 (간단한 키워드 추출)
        const topics = this.extractTopics(message);
        topics.forEach(topic => {
            if (!stats.favoriteTopics.includes(topic)) {
                stats.favoriteTopics.push(topic);
            }
        });

        // 상위 5개만 유지
        if (stats.favoriteTopics.length > 5) {
            stats.favoriteTopics = stats.favoriteTopics.slice(0, 5);
        }

        stats.lastUpdated = new Date().toISOString();

        const key = `stats_${userId}_${personaId}`;
        localStorage.setItem(key, JSON.stringify(stats));

        return stats;
    },

    // 간단한 감정 분석 (키워드 기반)
    analyzeEmotion(text: string): 'positive' | 'neutral' | 'negative' {
        const positiveWords = ['좋아', '행복', '사랑', '기쁨', '최고', '감사', '멋져', '완벽', '대박', '좋은', '즐거', '웃', '고마워'];
        const negativeWords = ['싫어', '슬퍼', '화나', '짜증', '힘들어', '피곤', '우울', '답답', '속상', '걱정', '불안'];

        const lowerText = text.toLowerCase();

        let positiveCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            if (lowerText.includes(word)) positiveCount++;
        });

        negativeWords.forEach(word => {
            if (lowerText.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    },

    // 주제 추출 (간단한 키워드 추출)
    extractTopics(text: string): string[] {
        const topicKeywords = [
            '운동', '음식', '영화', '음악', '게임', '여행',
            '공부', '일', '친구', '가족', '연애', '취미',
            '책', '쇼핑', '패션', '요리', 'K-pop', '드라마'
        ];

        const found: string[] = [];
        const lowerText = text.toLowerCase();

        topicKeywords.forEach(topic => {
            if (lowerText.includes(topic.toLowerCase())) {
                found.push(topic);
            }
        });

        return found;
    }
};

// 보상 지급 서비스
export const RewardService = {
    // 퀘스트 보상 지급
    async claimQuestReward(userId: string, questId: string, rewardCR: number): Promise<boolean> {
        try {
            // 로컬 스토리지에서 사용자 세션 가져오기
            const sessionData = localStorage.getItem('ai_hub_session_v4');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);

            // 포인트 추가
            session.points = (session.points || 0) + rewardCR;

            // 세션 저장
            localStorage.setItem('ai_hub_session_v4', JSON.stringify(session));

            // 퀘스트를 claimed로 표시
            const today = new Date().toISOString().split('T')[0];
            const key = `quests_${userId}_${today}`;
            const stored = localStorage.getItem(key);

            if (stored) {
                const quests = JSON.parse(stored);
                const quest = quests.find((q: any) => q.id === questId);
                if (quest) {
                    quest.claimed = true;
                    localStorage.setItem(key, JSON.stringify(quests));
                }
            }

            return true;
        } catch (e) {
            console.error('Reward claim error:', e);
            return false;
        }
    },

    // 스트릭 보너스 지급
    async claimStreakBonus(userId: string, bonus: number): Promise<boolean> {
        try {
            const sessionData = localStorage.getItem('ai_hub_session_v4');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            session.points = (session.points || 0) + bonus;

            localStorage.setItem('ai_hub_session_v4', JSON.stringify(session));

            return true;
        } catch (e) {
            console.error('Streak bonus claim error:', e);
            return false;
        }
    }
};
