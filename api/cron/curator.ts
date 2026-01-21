/**
 * AI Curator Cron Job - Vercel Serverless Function
 * 외부 Cron 서비스 (cron-job.org)에서 매시 호출
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from '../lib/firebase-admin';

// 보안: Cron 시크릿 검증
const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret-change-me';

// AI 관련 키워드
const AI_KEYWORDS = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'gpt', 'claude', 'gemini', 'llm', 'chatbot', 'neural network',
    'openai', 'anthropic', 'google ai', 'meta ai', 'microsoft ai',
    'transformer', 'diffusion', 'stable diffusion', 'midjourney',
    'langchain', 'rag', 'vector database', 'embedding',
    'computer vision', 'nlp', 'natural language', 'robotics',
    'autonomous', 'self-driving', 'tesla fsd', 'waymo'
];

// 제외 키워드
const EXCLUDE_KEYWORDS = ['game', 'gaming', 'sport', 'celebrity', 'movie', 'music'];

interface HNStory {
    id: number;
    title: string;
    url?: string;
    score: number;
    time: number;
}

interface RedditPost {
    data: {
        title: string;
        url: string;
        score: number;
        created_utc: number;
        subreddit: string;
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // 보안 검증 (선택적)
    const authHeader = req.headers['x-cron-secret'] || req.query.secret;
    if (authHeader !== CRON_SECRET && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ Unauthorized cron request');
        // 개발 중에는 우회 허용
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🤖 Cron job started at', new Date().toISOString());

    try {
        // 1. 트렌딩 토픽 수집
        const topics = await collectTrendingTopics();
        console.log(`📊 Collected ${topics.length} topics`);

        if (topics.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No relevant topics found',
                timestamp: new Date().toISOString()
            });
        }

        // 2. 상위 토픽 선택 (최대 3개)
        const selectedTopics = topics.slice(0, 3);

        // 3. 각 토픽에 대해 게시물 생성
        const db = getFirestore();
        const results = [];

        for (const topic of selectedTopics) {
            try {
                // 중복 체크
                const existing = await db.collection('posts')
                    .where('title', '==', topic.title)
                    .limit(1)
                    .get();

                if (!existing.empty) {
                    console.log(`⏭️ Skipping duplicate: ${topic.title}`);
                    continue;
                }

                // 게시물 생성
                const post = {
                    title: topic.title,
                    content: generateContent(topic),
                    authorId: 'ai-curator',
                    authorName: 'AI 큐레이터',
                    category: '지식 허브',
                    boardId: 'knowledge',
                    tags: ['AI큐레이터', topic.source.toUpperCase(), 'AI', '트렌딩'],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    views: 0,
                    likes: 0,
                    commentCount: 0,
                    isPinned: false,
                    isAICurated: true,
                    sourceUrl: topic.url
                };

                const docRef = await db.collection('posts').add(post);
                console.log(`✅ Created post: ${docRef.id}`);

                results.push({
                    id: docRef.id,
                    title: topic.title,
                    source: topic.source
                });

            } catch (error: any) {
                console.error(`❌ Failed to create post for: ${topic.title}`, error.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Created ${results.length} posts`,
            posts: results,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Cron job failed:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// 트렌딩 토픽 수집
async function collectTrendingTopics(): Promise<Array<{
    title: string;
    url: string;
    score: number;
    source: string;
}>> {
    const topics: Array<{ title: string; url: string; score: number; source: string }> = [];

    // Hacker News
    try {
        const hnResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const hnIds: number[] = await hnResponse.json();

        for (const id of hnIds.slice(0, 20)) {
            const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            const story: HNStory = await storyRes.json();

            if (story && story.title && isAIRelated(story.title)) {
                topics.push({
                    title: story.title,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    score: story.score,
                    source: 'hackernews'
                });
            }
        }
    } catch (e) {
        console.error('HN fetch error:', e);
    }

    // Reddit r/artificial
    try {
        const redditResponse = await fetch(
            'https://www.reddit.com/r/artificial/hot.json?limit=20',
            { headers: { 'User-Agent': 'AI-Hub-Curator/1.0' } }
        );
        const redditData = await redditResponse.json();

        for (const post of redditData.data?.children || []) {
            const p = post.data;
            if (p.title && isAIRelated(p.title)) {
                topics.push({
                    title: p.title,
                    url: `https://reddit.com${p.permalink}`,
                    score: p.score,
                    source: 'reddit'
                });
            }
        }
    } catch (e) {
        console.error('Reddit fetch error:', e);
    }

    // 점수순 정렬
    return topics.sort((a, b) => b.score - a.score);
}

// AI 관련 토픽인지 확인
function isAIRelated(title: string): boolean {
    const lower = title.toLowerCase();

    // 제외 키워드 체크
    if (EXCLUDE_KEYWORDS.some(k => lower.includes(k))) {
        return false;
    }

    // AI 키워드 체크
    return AI_KEYWORDS.some(k => lower.includes(k));
}

// 게시물 내용 생성
function generateContent(topic: { title: string; url: string; source: string }): string {
    return `## 📰 ${topic.title}

### 🔗 원문 링크
[원문 보기](${topic.url})

### 📌 출처
- **플랫폼**: ${topic.source === 'hackernews' ? 'Hacker News' : 'Reddit'}
- **수집 시간**: ${new Date().toLocaleString('ko-KR')}

---

*이 게시물은 AI 큐레이터가 자동으로 수집한 트렌딩 콘텐츠입니다.*

> 💡 더 자세한 분석이 필요하시면 [AI 리서치](/research) 기능을 이용해보세요!
`;
}
