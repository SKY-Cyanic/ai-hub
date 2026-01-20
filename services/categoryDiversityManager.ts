// Phase 4.1: Category History Functions
// Temporary separate file - will be integrated into curatorService.ts

export interface CategoryHistory {
    category: string;
    timestamp: number;
    postId: string;
    title: string;
}

const CATEGORY_HISTORY_KEY = 'curator_category_history';
const MAX_CATEGORY_HISTORY = 10;
const MAX_CONSECUTIVE_SAME_CATEGORY = 2;

export const CategoryDiversityManager = {
    /**
     * 카테고리 히스토리 가져오기
     */
    getCategoryHistory(): CategoryHistory[] {
        try {
            const stored = localStorage.getItem(CATEGORY_HISTORY_KEY);
            if (!stored) return [];

            const history = JSON.parse(stored);
            return Array.isArray(history) ? history.filter(item =>
                item &&
                typeof item.category === 'string' &&
                typeof item.timestamp === 'number'
            ) : [];
        } catch (error) {
            console.error('Error loading category history:', error);
            return [];
        }
    },

    /**
     * 카테고리 히스토리에 추가
     */
    addCategoryHistory(category: string, postId: string, title: string) {
        const history = this.getCategoryHistory();

        history.unshift({
            category,
            timestamp: Date.now(),
            postId,
            title
        });

        const trimmed = history.slice(0, MAX_CATEGORY_HISTORY);
        localStorage.setItem(CATEGORY_HISTORY_KEY, JSON.stringify(trimmed));

        console.log(`📁 Category history updated: ${category} (total: ${trimmed.length})`);
    },

    /**
     * 최근 N개 게시물의 카테고리 가져오기
     */
    getRecentCategories(count: number = 3): string[] {
        const history = this.getCategoryHistory();
        return history.slice(0, count).map(h => h.category);
    },

    /**
     * 카테고리 연속 게시 체크
     */
    shouldSkipCategoryForDiversity(category: string): boolean {
        const recentCategories = this.getRecentCategories(MAX_CONSECUTIVE_SAME_CATEGORY);

        if (recentCategories.length >= MAX_CONSECUTIVE_SAME_CATEGORY) {
            const allSame = recentCategories.every(cat => cat === category);

            if (allSame) {
                console.log(`🚫 Category diversity: "${category}" × ${MAX_CONSECUTIVE_SAME_CATEGORY} consecutive`);
                console.log(`   Recent: [${recentCategories.join(', ')}]`);
                return true;
            }
        }

        return false;
    }
};
