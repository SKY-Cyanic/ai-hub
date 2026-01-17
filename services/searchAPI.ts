/**
 * Google Custom Search JSON API Integration
 * https://developers.google.com/custom-search/v1/overview
 */

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
    formattedUrl: string;
}

export interface SearchResponse {
    items: SearchResult[];
    searchInformation: {
        totalResults: string;
        searchTime: number;
    };
}

// Vite 환경변수 접근
const GOOGLE_API_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';
const GOOGLE_CX = (import.meta as any).env?.VITE_GOOGLE_CX || '';

export const GoogleSearchAPI = {
    /**
     * Google Custom Search API로 검색 수행
     * @param query 검색 쿼리
     * @param num 결과 개수 (최대 10)
     */
    async search(query: string, num: number = 5): Promise<SearchResult[]> {
        if (!GOOGLE_API_KEY || !GOOGLE_CX) {
            console.error('Google API credentials not found');
            throw new Error('검색 API가 설정되지 않았습니다. 관리자에게 문의하세요.');
        }

        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${num}`;

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('일일 검색 한도를 초과했습니다. 내일 다시 시도해주세요.');
                }
                throw new Error('검색 중 오류가 발생했습니다.');
            }

            const data: SearchResponse = await response.json();

            if (!data.items || data.items.length === 0) {
                return [];
            }

            return data.items;
        } catch (error: any) {
            console.error('Google Search API error:', error);
            throw error;
        }
    },

    /**
     * 여러 쿼리로 검색 수행 (더 포괄적인 정보 수집)
     */
    async multiSearch(queries: string[]): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        for (const query of queries) {
            try {
                const queryResults = await this.search(query, 3);
                results.push(...queryResults);
            } catch (error) {
                console.error(`Search failed for query: ${query}`, error);
            }
        }

        // 중복 제거 (URL 기준)
        const uniqueResults = results.filter((result, index, self) =>
            index === self.findIndex((r) => r.link === result.link)
        );

        return uniqueResults;
    }
};
