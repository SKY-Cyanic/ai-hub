/**
 * AI Curator Cron Job - 간소화된 버전
 * Firebase Admin 없이도 동작하도록 수정
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI 관련 키워드
const AI_KEYWORDS = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'gpt', 'claude', 'gemini', 'llm', 'chatbot', 'neural network',
    'openai', 'anthropic', 'google ai', 'meta ai', 'microsoft',
    'transformer', 'diffusion', 'stable diffusion', 'midjourney',
    'langchain', 'rag', 'vector', 'embedding', 'agent',
    'computer vision', 'nlp', 'natural language', 'robotics',
    'autonomous', 'self-driving', 'tesla', 'waymo', 'deepseek',
    'sora', 'gemini 2', 'o1', 'reasoning', 'multimodal'
];

// 제외 키워드
const EXCLUDE_KEYWORDS = ['game', 'gaming', 'sport', 'celebrity', 'movie', 'music', 'crypto', 'bitcoin'];

interface TrendingTopic {
    title: string;
    url: string;
    score: number;
    source: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('🤖 Curator API called at', new Date().toISOString());

    try {
        // 1. 트렌딩 토픽 수집
        const topics = await collectTrendingTopics();
        console.log(`📊 Collected ${topics.length} AI-related topics`);

        // 2. 결과 반환 (클라이언트가 게시물 생성 처리)
        return res.status(200).json({
            success: true,
            topics: topics.slice(0, 10), // 상위 10개
            timestamp: new Date().toISOString(),
            message: `Found ${topics.length} AI topics`
        });

    } catch (error: any) {
        console.error('❌ Curator API failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

async function collectTrendingTopics(): Promise<TrendingTopic[]> {
    const topics: TrendingTopic[] = [];

    // Hacker News
    try {
        const hnResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const hnIds: number[] = await hnResponse.json();

        const promises = hnIds.slice(0, 30).map(async (id) => {
            const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            return storyRes.json();
        });

        const stories = await Promise.all(promises);
        
        for (const story of stories) {
            if (story && story.title && isAIRelated(story.title)) {
                topics.push({
                    title: story.title,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    score: story.score || 0,
                    source: 'hackernews'
                });
            }
        }
    } catch (e) {
        console.error('HN fetch error:', e);
    }

    // Reddit - 여러 서브레딧
    const subreddits = ['artificial', 'MachineLearning', 'LocalLLaMA'];
    
    for (const sub of subreddits) {
        try {
            const redditResponse = await fetch(
                `https://www.reddit.com/r/${sub}/hot.json?limit=15`,
                { 
                    headers: { 
                        'User-Agent': 'AI-Hub-Curator/1.0',
                        'Accept': 'application/json'
                    } 
                }
            );
            
            if (!redditResponse.ok) continue;
            
            const redditData = await redditResponse.json();

            for (const post of redditData.data?.children || []) {
                const p = post.data;
                if (p.title && !p.stickied && isAIRelated(p.title)) {
                    topics.push({
                        title: p.title,
                        url: `https://reddit.com${p.permalink}`,
                        score: p.score || 0,
                        source: `reddit/${sub}`
                    });
                }
            }
        } catch (e) {
            console.error(`Reddit ${sub} fetch error:`, e);
        }
    }

    // 점수순 정렬, 중복 제거
    const seen = new Set<string>();
    return topics
        .filter(t => {
            const key = t.title.toLowerCase().substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => b.score - a.score);
}

function isAIRelated(title: string): boolean {
    const lower = title.toLowerCase();

    // 제외 키워드 체크
    if (EXCLUDE_KEYWORDS.some(k => lower.includes(k))) {
        return false;
    }

    // AI 키워드 체크
    return AI_KEYWORDS.some(k => lower.includes(k));
}
