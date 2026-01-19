/**
 * AI Curator Service - Phase 4
 * 트렌딩 토픽을 자동으로 발견하고 리서치 후 게시
 */

import { getGroqClient } from './groqClient';
import { ResearchService } from './researchService';
import { PostIntegrationService } from './postIntegrationService';
import { storage } from './storage';

export interface TrendingTopic {
    title: string;
    source: 'reddit' | 'hackernews' | 'wikipedia';
    url: string;
    score: number;
    category: string;
    timestamp: number;
    subreddit?: string;
}

export interface CuratorConfig {
    enabled: boolean;
    intervalHours: number;
    maxPostsPerDay: number;
    targetBoards: string[];
    minScore: number; // 최소 점수 (Reddit upvotes, HN points)
}

export interface CuratorLog {
    id: string;
    timestamp: number;
    topic: string;
    source: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
    postId?: string;
}

const DEFAULT_CONFIG: CuratorConfig = {
    enabled: false,
    intervalHours: 6,
    maxPostsPerDay: 3,
    targetBoards: ['지식 허브'],
    minScore: 100
};

// 인기 서브레딧 목록
const TRENDING_SUBREDDITS = [
    'technology',
    'science',
    'artificial',
    'programming',
    'MachineLearning',
    'worldnews'
];

// AI 큐레이터 봇 사용자 ID
const AI_CURATOR_USER_ID = 'ai_curator_bot';

// 지능형 키워드 매칭 시스템
interface KeywordCategory {
    name: string;
    keywords: string[];
    weight: number; // 가중치
}

const KEYWORD_CATEGORIES: KeywordCategory[] = [
    {
        name: 'AI Model & Algorithms',
        weight: 2.5,
        keywords: [
            'llm', 'gpt', 'transformer', 'attention', 'diffusion', 'moe', 'slm', 'multimodal',
            'agi', 'asi', 'generative ai', 'hallucination', 'rag', 'fine-tuning', 'inference',
            'zero-shot', 'few-shot', 'chain-of-thought', 'cot', 'rlhf', 'dpo', 'prompt engineering',
            'quantization', 'pruning', 'distillation', 'synthetic data', 'openai', 'anthropic',
            'claude', 'gemini', 'copilot', 'chatgpt', 'llama', 'mistral', 'qwen'
        ]
    },
    {
        name: 'Semiconductor & Hardware',
        weight: 2.0,
        keywords: [
            'gpu', 'cpu', 'npu', 'tpu', 'fpga', 'asic', 'nvidia', 'amd', 'intel',
            'tsmc', 'samsung', 'hbm', 'gddr', 'chip', 'semiconductor', 'foundry',
            'euv', '3nm', '2nm', 'wafer', 'chiplet', 'soc', 'transistor', 'finfet',
            'memory', 'bandwidth', 'flops', 'tops', 'cuda', 'rocm'
        ]
    },
    {
        name: 'Machine Learning & Research',
        weight: 2.0,
        keywords: [
            'deep learning', 'neural network', 'cnn', 'rnn', 'lstm', 'gan', 'vae',
            'reinforcement learning', 'supervised', 'unsupervised', 'self-supervised',
            'transfer learning', 'meta-learning', 'computer vision', 'nlp', 'speech',
            'robotics', 'autonomous', 'arxiv', 'paper', 'research', 'benchmark',
            'dataset', 'model', 'training', 'pytorch', 'tensorflow', 'jax'
        ]
    },
    {
        name: 'Tech Industry & Market',
        weight: 1.5,
        keywords: [
            'startup', 'funding', 'acquisition', 'ipo', 'unicorn', 'venture capital',
            'market cap', 'earnings', 'stock', 'cloud', 'azure', 'aws', 'gcp',
            'data center', 'edge computing', 'chips act', 'export control',
            'geopolitics', 'supply chain', 'silicon valley', 'tech news'
        ]
    },
    {
        name: 'Development & Tools',
        weight: 1.3,
        keywords: [
            'github', 'open source', 'api', 'sdk', 'framework', 'library',
            'docker', 'kubernetes', 'python', 'rust', 'c++', 'compiler',
            'hugging face', 'langchain', 'llamaindex', 'vllm', 'onnx'
        ]
    },
    {
        name: 'Emerging Tech',
        weight: 1.8,
        keywords: [
            'quantum', 'blockchain', 'crypto', 'web3', 'metaverse', 'vr', 'ar',
            'biotech', 'neuroscience', 'brain-computer', 'nanotech', 'fusion',
            'space tech', 'satellite', 'drone', '6g', 'photonics'
        ]
    }
];

export const CuratorService = {

    /**
     * Reddit API에서 트렌딩 토픽 수집
     */
    async fetchRedditTrending(subreddit: string = 'all', limit: number = 25): Promise<TrendingTopic[]> {
        try {
            // CORS 우회를 위해 프록시 사용
            const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
            const corsProxy = 'https://corsproxy.io/?';
            const url = corsProxy + encodeURIComponent(redditUrl);

            console.log(`📡 Fetching Reddit r/${subreddit}...`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'AI-Hub-Curator/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Reddit API error: ${response.status}`);
            }

            const data = await response.json();

            const topics: TrendingTopic[] = data.data.children
                .map((post: any) => ({
                    title: post.data.title,
                    source: 'reddit' as const,
                    url: `https://reddit.com${post.data.permalink}`,
                    score: post.data.score,
                    category: this.categorizeBySubreddit(post.data.subreddit),
                    timestamp: Date.now(),
                    subreddit: post.data.subreddit
                }))
                .filter((topic: TrendingTopic) => {
                    // 1. 점수 체크
                    if (topic.score < DEFAULT_CONFIG.minScore) return false;

                    // 2. 키워드 관련성 체크 (강제)
                    if (!this.isRelevantTopic(topic.title)) {
                        console.log(`🚫 Filtered non-AI topic: ${topic.title}`);
                        return false;
                    }

                    return true;
                });

            console.log(`✅ Found ${topics.length} relevant Reddit topics`);
            return topics;

        } catch (error) {
            console.error(`❌ Reddit fetch failed:`, error);
            return [];
        }
    },

    /**
     * Hacker News API에서 트렌딩 토픽 수집
     */
    async fetchHackerNewsTrending(limit: number = 10): Promise<TrendingTopic[]> {
        try {
            console.log(`📡 Fetching Hacker News top stories...`);

            // HN Top Stories IDs
            const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            const topStoryIds: number[] = await topStoriesRes.json();

            // 상위 N개 스토리 상세 정보 가져오기
            const storyPromises = topStoryIds.slice(0, limit).map(id =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
                    .then(r => r.json())
            );

            const stories = await Promise.all(storyPromises);

            const topics: TrendingTopic[] = stories
                .filter(story => {
                    if (!story || !story.title) return false;

                    // 키워드 관련성 체크 (강제)
                    if (!this.isRelevantTopic(story.title)) {
                        console.log(`🚫 Filtered non-AI topic: ${story.title}`);
                        return false;
                    }

                    return true;
                })
                .map(story => ({
                    title: story.title,
                    source: 'hackernews' as const,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    score: story.score || 0,
                    category: this.categorizeByKeywords(story.title),
                    timestamp: Date.now()
                }));

            console.log(`✅ Found ${topics.length} HN topics`);
            return topics;

        } catch (error) {
            console.error(`❌ Hacker News fetch failed:`, error);
            return [];
        }
    },

    /**
     * 여러 소스에서 트렌딩 토픽 수집
     */
    async fetchAllTrendingTopics(): Promise<TrendingTopic[]> {
        console.log('🔍 Starting trending topic collection...');

        const allTopics: TrendingTopic[] = [];

        // 1. Hacker News (CORS 없음, 안정적)
        const hnTopics = await this.fetchHackerNewsTrending(10);
        allTopics.push(...hnTopics);

        // 2. Reddit (여러 서브레딧)
        for (const subreddit of TRENDING_SUBREDDITS.slice(0, 3)) { // 3개만 시도 (rate limit)
            const redditTopics = await this.fetchRedditTrending(subreddit, 10);
            allTopics.push(...redditTopics);

            // Rate limit 고려 1초 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`📊 Total topics collected: ${allTopics.length}`);
        return allTopics;
    },

    /**
     * 토픽 우선순위 결정 (점수 기반)
     */
    prioritizeTopics(topics: TrendingTopic[]): TrendingTopic[] {
        // 1. 로그에 있는 토픽 제외
        const recentLogs = this.getLogs();
        const newTopics = topics.filter(topic => {
            for (const log of recentLogs) {
                const similarity = this.calculateSimilarity(
                    topic.title.toLowerCase(),
                    log.topic.toLowerCase()
                );
                if (similarity > 0.75) {
                    console.log(`🚫 Filtering logged topic (${(similarity * 100).toFixed(0)}%): ${topic.title}`);
                    return false;
                }
            }
            return true;
        });

        console.log(`📝 Filtered: ${topics.length} → ${newTopics.length} new topics`);

        if (newTopics.length === 0) {
            console.warn('⚠️ No new topics!');
            return [];
        }

        // 2. 중복 제거 (제목 유사도 기반)
        const uniqueTopics = this.removeDuplicates(newTopics);

        // 3. 점수 기반 정렬 (높은 순)
        const sorted = uniqueTopics.sort((a, b) => b.score - a.score);

        // 4. AI/기술 관련 키워드 가중치 부여
        const weighted = sorted.map(topic => ({
            ...topic,
            score: topic.score * this.getRelevanceMultiplier(topic.title)
        })).sort((a, b) => b.score - a.score);

        console.log(`🎯 Prioritized top 5:`, weighted.slice(0, 5).map(t => t.title));
        return weighted;
    },

    /**
     * 중복 토픽 제거
     */
    removeDuplicates(topics: TrendingTopic[]): TrendingTopic[] {
        const seen = new Set<string>();
        const unique: TrendingTopic[] = [];

        for (const topic of topics) {
            const normalized = topic.title.toLowerCase()
                .replace(/[^a-z0-9가-힣]/g, '')
                .substring(0, 30); // 앞 30자만 비교

            if (!seen.has(normalized)) {
                seen.add(normalized);
                unique.push(topic);
            }
        }

        return unique;
    },

    /**
     * 관련성 가중치 계산
     */
    getRelevanceMultiplier(title: string): number {
        const lowerTitle = title.toLowerCase();

        // AI/기술 관련 키워드
        const highPriorityKeywords = ['ai', 'artificial intelligence', 'machine learning',
            'gpt', 'llm', 'quantum', '양자', 'blockchain', 'crypto'];
        const mediumPriorityKeywords = ['tech', 'technology', 'science', 'programming',
            'software', 'hardware', '기술', '과학'];

        if (highPriorityKeywords.some(kw => lowerTitle.includes(kw))) {
            return 2.0;
        }
        if (mediumPriorityKeywords.some(kw => lowerTitle.includes(kw))) {
            return 1.5;
        }
        return 1.0;
    },

    /**
     * 제목이 AI/기술 관련 토픽인지 엄격하게 확인
     */
    isRelevantTopic(title: string): boolean {
        const lowerTitle = title.toLowerCase();

        // 🔴 1. 먼저 제외 키워드 체크 (최우선!)
        const excludeKeywords = [
            // 일반 뉴스/비기술
            'wikipedia', 'birthday', 'anniversary', 'turns', 'celebrates',
            // 정치/사회 (AI 관련 제외)
            'trump', 'election', 'politics', 'protest', 'supporters',
            // 엔터테인먼트
            'nsfw', 'porn', 'xxx', 'dating', 'casino', 'gambling',
            'meme', 'joke', 'funny', 'cute', 'aww', 'wholesome',
            'music video', 'music', 'movie', 'tv show', 'celebrity', 'fashion',
            // 일상
            'recipe', 'cooking', 'food', 'sports', 'gaming', 'game'
        ];

        for (const exclude of excludeKeywords) {
            if (lowerTitle.includes(exclude)) {
                console.log(`🚫 Excluded: "${title}" (keyword: ${exclude})`);
                return false;
            }
        }

        // ✅ 2. 그 다음 AI/기술 키워드 매칭 확인
        let hasMatch = false;
        let matchedKeyword = '';

        for (const category of KEYWORD_CATEGORIES) {
            for (const keyword of category.keywords) {
                if (lowerTitle.includes(keyword.toLowerCase())) {
                    hasMatch = true;
                    matchedKeyword = keyword;
                    break;
                }
            }
            if (hasMatch) break;
        }

        if (hasMatch) {
            console.log(`✅ Matched: "${title.substring(0, 50)}..." (keyword: ${matchedKeyword})`);
            return true;
        }

        console.log(`❌ No keyword match: "${title}"`);
        return false;
    },

    /**
     * 서브레딧 기반 카테고리 분류
     */
    categorizeBySubreddit(subreddit: string): string {
        const mapping: Record<string, string> = {
            'technology': '지식 허브',
            'science': '지식 허브',
            'artificial': '지식 허브',
            'MachineLearning': '코드 넥서스',
            'programming': '코드 넥서스',
            'worldnews': '자유 광장'
        };
        return mapping[subreddit] || '지식 허브';
    },

    /**
     * 제목 키워드 기반 카테고리 분류
     */
    categorizeByKeywords(title: string): string {
        const lower = title.toLowerCase();

        if (lower.includes('code') || lower.includes('programming') || lower.includes('software')) {
            return '코드 넥서스';
        }
        if (lower.includes('ai') || lower.includes('science') || lower.includes('tech')) {
            return '지식 허브';
        }
        return '자유 광장';
    },

    /**
     * 최근 24시간 큐레이터 게시물 확인
     */
    getRecentCuratorPosts(): any[] {
        const posts = storage.getPosts();
        const curatorPosts = posts.filter(p =>
            p.author_id === AI_CURATOR_USER_ID &&
            Date.now() - new Date(p.created_at).getTime() < 24 * 60 * 60 * 1000
        );
        return curatorPosts;
    },

    /**
     * 중복 게시물 체크
     */
    isDuplicate(topic: TrendingTopic): boolean {
        const recentPosts = this.getRecentCuratorPosts();

        return recentPosts.some(post => {
            const similarity = this.calculateSimilarity(
                post.title.toLowerCase(),
                topic.title.toLowerCase()
            );
            return similarity > 0.7; // 70% 유사도 이상이면 중복
        });
    },

    /**
     * 문자열 유사도 계산 (간단한 Jaccard)
     */
    calculateSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));

        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    },

    /**
     * 자동 리서치 & 게시
     */
    async autoResearchAndPost(topic: TrendingTopic, userId: string): Promise<string | null> {
        console.log(`🚀 Starting auto-research for: ${topic.title}`);

        try {
            // 1. 로그 기반 중복 체크 (먼저 확인)
            const recentLogs = this.getLogs();
            const isDuplicateInLogs = recentLogs.some(log => {
                const similarity = this.calculateSimilarity(
                    log.topic.toLowerCase(),
                    topic.title.toLowerCase()
                );
                return similarity > 0.8; // 80% 이상 유사하면 중복
            });

            if (isDuplicateInLogs) {
                console.log(`⏭️ Skipping duplicate (in logs): ${topic.title}`);
                // 로그에 추가하지 않음 (이미 있으니까)
                return null;
            }

            // 2. 게시물 기반 중복 체크
            if (this.isDuplicate(topic)) {
                console.log(`⏭️ Skipping duplicate (in posts): ${topic.title}`);
                this.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: Date.now(),
                    topic: topic.title,
                    source: topic.source,
                    status: 'skipped',
                    reason: 'Duplicate topic'
                });
                return null;
            }

            // 3. Research수행
            console.log(`📚 Performing research...`);
            const report = await ResearchService.performResearch(
                topic.title,
                (progress) => {
                    console.log(`Progress: ${progress.step}`);
                }
            );

            if (!report || !report.summary) {
                throw new Error('Research failed - empty report');
            }

            // 3. 게시물로 변환
            console.log(`📝 Converting to post...`);
            const postDraft = await PostIntegrationService.convertReportToPost(
                report,
                topic.title
            );

            // 4. 카테고리 설정
            postDraft.category = topic.category || '지식 허브';
            postDraft.boardId = this.getBoardIdByCategory(postDraft.category);

            // 5. AI Curator 메타데이터 추가
            postDraft.tags = [
                ...postDraft.tags,
                'AI큐레이터',
                topic.source.toUpperCase()
            ];

            // 6. 게시
            console.log(`🎉 Publishing post...`);
            const postId = await PostIntegrationService.publishPost(postDraft, userId);

            console.log(`✅ Successfully published: ${postId}`);

            // 7. 로그 기록 (unique ID로)
            this.addLog({
                id: `log_${topic.source}_${Date.now()}`,
                timestamp: Date.now(),
                topic: topic.title,
                source: topic.source,
                status: 'success',
                postId: postId
            });

            return postId;

        } catch (error: any) {
            console.error(`❌ Auto-research failed:`, error);

            this.addLog({
                id: Date.now().toString(),
                timestamp: Date.now(),
                topic: topic.title,
                source: topic.source,
                status: 'failed',
                reason: error.message
            });

            return null;
        }
    },

    /**
     * 카테고리 → Board ID 매핑
     */
    getBoardIdByCategory(category: string): string {
        const mapping: Record<string, string> = {
            '자유 광장': 'free',
            '지식 허브': 'knowledge',
            '코드 넥서스': 'dev',
            'deepweb': 'deepweb'
        };
        return mapping[category] || 'knowledge';
    },

    /**
     * 큐레이터 로그 추가
     */
    addLog(log: CuratorLog) {
        const logs = this.getLogs();
        logs.unshift(log);

        // 최근 100개만 유지
        const trimmed = logs.slice(0, 100);
        localStorage.setItem('curator_logs', JSON.stringify(trimmed));
    },

    /**
     * 큐레이터 로그 조회
     */
    getLogs(): CuratorLog[] {
        try {
            const stored = localStorage.getItem('curator_logs');
            if (!stored) return [];

            const logs = JSON.parse(stored);

            // 배열인지 검증
            if (!Array.isArray(logs)) {
                console.warn('Invalid curator_logs format, resetting...');
                localStorage.removeItem('curator_logs');
                return [];
            }

            // 각 로그 항목 검증
            return logs.filter(log =>
                log &&
                typeof log.topic === 'string' &&
                typeof log.source === 'string' &&
                typeof log.status === 'string' &&
                typeof log.timestamp === 'number'
            );
        } catch (error) {
            console.error('Error loading curator logs:', error);
            localStorage.removeItem('curator_logs');
            return [];
        }
    },

    /**
     * 설정 저장
     */
    saveConfig(config: CuratorConfig) {
        localStorage.setItem('curator_config', JSON.stringify(config));
    },

    /**
     * 설정 로드
     */
    loadConfig(): CuratorConfig {
        const stored = localStorage.getItem('curator_config');
        return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
    },

    /**
     * 오늘 게시한 게시물 수
     */
    getTodayPostCount(): number {
        const today = new Date().setHours(0, 0, 0, 0);
        const recentPosts = this.getRecentCuratorPosts();

        return recentPosts.filter(post => {
            const postDate = new Date(post.created_at).setHours(0, 0, 0, 0);
            return postDate === today;
        }).length;
    },

    /**
     * 게시 가능 여부 확인
     */
    canPost(): boolean {
        const config = this.loadConfig();
        const todayCount = this.getTodayPostCount();

        if (todayCount >= config.maxPostsPerDay) {
            console.log(`📊 Daily limit reached: ${todayCount}/${config.maxPostsPerDay}`);
            return false;
        }

        return true;
    }
};
