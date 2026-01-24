import { getGroqClient } from './groqClient';

export interface TrendingTopic {
    title: string;
    url: string;
    score: number;
    source: string;
}

/**
 * 실시간 과학기술/AI 트렌딩 서비스
 */
export const TrendingService = {
    /**
     * 트렌딩 토픽 수집 (HackerNews + Reddit)
     */
    async getTechTrending(): Promise<TrendingTopic[]> {
        // 캐시 확인
        const cached = localStorage.getItem('trending_tech_topics');
        const cachedTime = localStorage.getItem('trending_tech_timestamp');

        if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 15 * 60 * 1000) {
            return JSON.parse(cached);
        }

        const topics: TrendingTopic[] = [];

        try {
            // 1. Hacker News Technology/AI Stories
            const hnResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            const hnIds: number[] = await hnResponse.json();

            // 상위 30개만 가져와서 필터링 (병렬 처리)
            const hnPromises = hnIds.slice(0, 30).map(async (id) => {
                try {
                    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                    return res.json();
                } catch { return null; }
            });

            const hnStories = await Promise.all(hnPromises);

            hnStories.forEach((story: any) => {
                if (story && story.title && isTechRelated(story.title)) {
                    topics.push({
                        title: story.title,
                        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                        score: story.score || 0,
                        source: 'HN'
                    });
                }
            });

            // 2. Reddit r/technology & r/artificial API (No Auth required for public json)
            const subreddits = ['technology', 'artificial'];
            for (const sub of subreddits) {
                try {
                    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=10&t=day`);
                    if (res.ok) {
                        const data = await res.json();
                        data.data.children.forEach((child: any) => {
                            const post = child.data;
                            if (post.title && !post.stickied) {
                                topics.push({
                                    title: post.title,
                                    url: `https://reddit.com${post.permalink}`,
                                    score: post.score || 0,
                                    source: `r/${sub}`
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`Reddit ${sub} fetch failed:`, e);
                }
            }

        } catch (error) {
            console.error('Trending fetch failed:', error);
        }

        // 점수순 정렬 및 상위 10개
        const sorted = topics
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        // 캐시 저장
        localStorage.setItem('trending_tech_topics', JSON.stringify(sorted));
        localStorage.setItem('trending_tech_timestamp', Date.now().toString());

        return sorted;
    }
};

// 기술/AI 관련 키워드 필터링
function isTechRelated(title: string): boolean {
    const keywords = [
        'ai', 'gpt', 'llm', 'tech', 'code', 'programming', 'software',
        'hardware', 'apple', 'google', 'microsoft', 'linux', 'web',
        'data', 'server', 'cloud', 'security', 'hack', 'robot',
        'science', 'space', 'physics', 'math', 'neural', 'learning'
    ];
    const lower = title.toLowerCase();
    return keywords.some(k => lower.includes(k));
}
