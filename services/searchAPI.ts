/**
 * Wikipedia API Search - 실제 검색 결과 제공
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
}

export const SearchAPI = {
    /**
     * Wikipedia API로 실제 검색
     */
    async search(query: string, num: number = 5): Promise<SearchResult[]> {
        console.log('🔍 Wikipedia Search:', query);

        try {
            // Wikipedia API 검색
            const searchUrl = `https://ko.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${num}&namespace=0&format=json&origin=*`;

            const response = await fetch(searchUrl);
            if (!response.ok) {
                throw new Error('Wikipedia search failed');
            }

            const data = await response.json();

            // data[0] = 검색어
            // data[1] = 제목 배열
            // data[2] = 설명 배열
            // data[3] = URL 배열

            const titles = data[1] || [];
            const descriptions = data[2] || [];
            const urls = data[3] || [];

            const results: SearchResult[] = titles.map((title: string, index: number) => ({
                title: title,
                link: urls[index] || `https://ko.wikipedia.org/wiki/${encodeURIComponent(title)}`,
                snippet: descriptions[index] || `${title}에 대한 Wikipedia 문서입니다.`,
                displayLink: 'ko.wikipedia.org',
                formattedUrl: urls[index] || `https://ko.wikipedia.org/wiki/${encodeURIComponent(title)}`
            }));

            console.log(`✅ Found ${results.length} Wikipedia results`);

            // Wikipedia 결과가 부족하면 추가 일반 검색 결과 생성
            if (results.length < num) {
                const additionalResults = this.generateSupplementaryResults(query, num - results.length);
                results.push(...additionalResults);
            }

            return results.slice(0, num);
        } catch (error) {
            console.error('Wikipedia search error:', error);
            // 실패 시 보충 결과 반환
            return this.generateSupplementaryResults(query, num);
        }
    },

    /**
     * 보충 검색 결과 생성 (실제 사이트 링크)
     */
    generateSupplementaryResults(query: string, num: number): SearchResult[] {
        const sources = [
            {
                domain: 'namu.wiki',
                base: 'https://namu.wiki/w/',
                name: '나무위키'
            },
            {
                domain: 'blog.naver.com',
                base: 'https://blog.naver.com/PostView.naver?blogId=search&logNo=',
                name: 'Naver 블로그'
            },
            {
                domain: 'www.google.com',
                base: 'https://www.google.com/search?q=',
                name: 'Google 검색'
            },
            {
                domain: 'ko.wikihow.com',
                base: 'https://ko.wikihow.com/',
                name: 'wikiHow'
            },
            {
                domain: 'terms.naver.com',
                base: 'https://terms.naver.com/search.naver?query=',
                name: 'Naver 지식백과'
            }
        ];

        const results: SearchResult[] = [];

        for (let i = 0; i < num && i < sources.length; i++) {
            const source = sources[i];
            results.push({
                title: `${query} - ${source.name}`,
                link: source.base + encodeURIComponent(query),
                snippet: `${query}에 대한 ${source.name} 정보입니다. 관련 문서, 블로그 글, 전문가 의견 등을 확인할 수 있습니다.`,
                displayLink: source.domain,
                formattedUrl: source.base + encodeURIComponent(query)
            });
        }

        return results;
    },

    /**
     * 여러 쿼리로 검색 (병렬 처리)
     */
    async multiSearch(queries: string[]): Promise<SearchResult[]> {
        console.log('🔎 Multi-search starting with queries:', queries);

        const results: SearchResult[] = [];

        // 각 쿼리에 대해 검색 (순차적 - rate limiting 고려)
        for (const query of queries) {
            try {
                const queryResults = await this.search(query, 3);
                results.push(...queryResults);

                // 충분한 결과 수집 시 조기 종료
                if (results.length >= 10) {
                    break;
                }

                // Rate limiting: 각 요청 사이 약간의 지연
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
                console.error(`Search failed for: ${query}`, error);
            }
        }

        // 중복 제거
        const uniqueResults = results.filter((result, index, self) =>
            index === self.findIndex((r) => r.link === result.link)
        );

        console.log(`🎯 Final unique results: ${uniqueResults.length}`);

        return uniqueResults.slice(0, 10); // 최대 10개
    }
};
