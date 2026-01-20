/**
 * Keyword Duplication Manager - Phase 4.1 Checkpoint 2
 * 24시간 내 키워드 중복 방지 시스템
 */

export interface KeywordHistory {
    keywords: string[];      // 추출된 핵심 키워드
    title: string;           // 원본 제목
    postId: string;          // 게시물 ID
    timestamp: number;       // 게시 시간
}

const KEYWORD_HISTORY_KEY = 'curator_keyword_history';
const MAX_KEYWORD_HISTORY = 20;  // 최근 20개 추적
const SIMILARITY_THRESHOLD = 0.7; // 70% 이상 유사하면 중복
const DUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24시간

export const KeywordDuplicationManager = {
    /**
     * 키워드 히스토리 가져오기
     */
    getKeywordHistory(): KeywordHistory[] {
        try {
            const stored = localStorage.getItem(KEYWORD_HISTORY_KEY);
            if (!stored) return [];

            const history: KeywordHistory[] = JSON.parse(stored);

            // 24시간 이내 항목만 필터링
            const now = Date.now();
            const recent = history.filter(item =>
                item &&
                typeof item.timestamp === 'number' &&
                (now - item.timestamp) < DUPLICATION_WINDOW_MS
            );

            // 만료된 항목은 삭제
            if (recent.length !== history.length) {
                this.saveKeywordHistory(recent);
            }

            return recent;
        } catch (error) {
            console.error('Error loading keyword history:', error);
            return [];
        }
    },

    /**
     * 키워드 히스토리 저장
     */
    saveKeywordHistory(history: KeywordHistory[]) {
        const trimmed = history.slice(0, MAX_KEYWORD_HISTORY);
        localStorage.setItem(KEYWORD_HISTORY_KEY, JSON.stringify(trimmed));
    },

    /**
     * 새 키워드 추가
     */
    addKeywordHistory(keywords: string[], title: string, postId: string) {
        const history = this.getKeywordHistory();

        history.unshift({
            keywords,
            title,
            postId,
            timestamp: Date.now()
        });

        this.saveKeywordHistory(history);

        console.log(`🔑 Keyword history updated: [${keywords.join(', ')}] (total: ${history.length})`);
    },

    /**
     * 키워드에서 핵심 단어 추출 (간단한 버전)
     * 
     * 추후 AI 기반으로 업그레이드 예정
     */
    extractKeywords(title: string): string[] {
        const lower = title.toLowerCase();

        // 불용어 제거
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
            'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            '은', '는', '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과',
            '이다', '있다', '하다', '되다', '다', '것', '수', '등'];

        // 단어 분리 (공백, 특수문자 기준)
        const words = lower
            .replace(/[^\w\s가-힣]/g, ' ')
            .split(/\s+/)
            .filter(word =>
                word.length > 2 &&  // 2글자 이상
                !stopWords.includes(word)
            );

        // 중복 제거
        const unique = Array.from(new Set(words));

        return unique.slice(0, 10); // 최대 10개
    },

    /**
     * 키워드 유사도 계산 (Jaccard Similarity)
     */
    calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
        const set1 = new Set(keywords1.map(k => k.toLowerCase()));
        const set2 = new Set(keywords2.map(k => k.toLowerCase()));

        const intersection = new Set([...set1].filter(k => set2.has(k)));
        const union = new Set([...set1, ...set2]);

        if (union.size === 0) return 0;

        return intersection.size / union.size;
    },

    /**
     * 중복 체크
     * @returns true면 중복 (게시 안 함), false면 unique(게시 가능)
     */
    isDuplicateKeywords(title: string): { isDuplicate: boolean; matchedTitle?: string; similarity?: number } {
        const keywords = this.extractKeywords(title);
        const history = this.getKeywordHistory();

        for (const item of history) {
            const similarity = this.calculateKeywordSimilarity(keywords, item.keywords);

            if (similarity >= SIMILARITY_THRESHOLD) {
                console.log(`🚫 Keyword duplication detected!`);
                console.log(`   Current: "${title}"`);
                console.log(`   Previous: "${item.title}"`);
                console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);
                console.log(`   Keywords overlap: [${keywords.filter(k => item.keywords.includes(k)).join(', ')}]`);

                return {
                    isDuplicate: true,
                    matchedTitle: item.title,
                    similarity
                };
            }
        }

        return { isDuplicate: false };
    },

    /**
     * 디버그: 히스토리 출력
     */
    debugHistory() {
        const history = this.getKeywordHistory();
        console.log('📚 Keyword History:');
        history.forEach((item, idx) => {
            const age = Math.floor((Date.now() - item.timestamp) / (1000 * 60 * 60));
            console.log(`  ${idx + 1}. [${age}h ago] "${item.title}"`);
            console.log(`     Keywords: [${item.keywords.join(', ')}]`);
        });
    }
};
