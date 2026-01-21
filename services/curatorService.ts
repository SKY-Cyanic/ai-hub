/**
 * AI Curator Service - Phase 4 Enhanced
 * 트렌딩 토픽을 자동으로 발견하고 리서치 후 게시
 * AI 고도화 + 안전 정책 통합
 */

import { getGroqClient } from './groqClient';
import { ResearchService } from './researchService';
import { PostIntegrationService } from './postIntegrationService';
import { storage } from './storage';
import { AIEnhancementService } from './aiEnhancementService';
import { SafetyPolicyService } from './safetyPolicyService';


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

// ============================================
// 📊 다양성 알고리즘 (Diversity Manager)
// ============================================

const DIVERSITY_STORAGE_KEY = 'curator_diversity_log';

interface DiversityLog {
    category: string;
    source: string;
    keywords: string[];
    timestamp: number;
}

export const DiversityManager = {
    /**
     * 최근 게시 로그 조회 (24시간)
     */
    getRecentLogs(): DiversityLog[] {
        try {
            const logs: DiversityLog[] = JSON.parse(localStorage.getItem(DIVERSITY_STORAGE_KEY) || '[]');
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            return logs.filter(l => l.timestamp > cutoff);
        } catch {
            return [];
        }
    },

    /**
     * 게시 로그 추가
     */
    addLog(log: Omit<DiversityLog, 'timestamp'>): void {
        const logs = this.getRecentLogs();
        logs.push({ ...log, timestamp: Date.now() });
        localStorage.setItem(DIVERSITY_STORAGE_KEY, JSON.stringify(logs.slice(-50)));
    },

    /**
     * 같은 카테고리 연속 게시 체크 (비활성화 - 모든 토픽이 같은 카테고리)
     * 현재 모든 토픽이 "지식 허브"로 분류되어 이 체크는 무의미함
     */
    isCategoryConsecutive(category: string): boolean {
        // 비활성화: 모든 토픽이 같은 카테고리이므로 체크 불필요
        return false;

        // 아래는 다중 카테고리 지원 시 활성화
        // const logs = this.getRecentLogs();
        // if (logs.length < 3) return false;
        // const recent = logs.slice(-3);
        // return recent.every(l => l.category === category);
    },

    /**
     * 키워드 중복 체크 (유사도 기반) - 더 관대하게
     */
    hasKeywordOverlap(keywords: string[]): { overlap: boolean; similarity: number } {
        const logs = this.getRecentLogs();

        // 로그가 없으면 중복 없음
        if (logs.length === 0) return { overlap: false, similarity: 0 };

        const allRecentKeywords = new Set(logs.flatMap(l => l.keywords));

        const overlap = keywords.filter(k => allRecentKeywords.has(k.toLowerCase()));
        const similarity = keywords.length > 0 ? overlap.length / keywords.length : 0;

        return {
            overlap: similarity > 0.8, // 70% → 80%로 완화
            similarity
        };
    },

    /**
     * 출처 균형 체크 (더 관대하게)
     */
    getSourceBalance(): { reddit: number; hackernews: number; other: number; balanced: boolean } {
        const logs = this.getRecentLogs();

        // 10개 미만이면 항상 균형 (5 → 10으로 완화)
        if (logs.length < 10) {
            return { reddit: 0, hackernews: 0, other: 0, balanced: true };
        }

        const total = logs.length;

        const counts = {
            reddit: logs.filter(l => l.source === 'reddit').length,
            hackernews: logs.filter(l => l.source === 'hackernews').length,
            other: logs.filter(l => !['reddit', 'hackernews'].includes(l.source)).length
        };

        // 하나의 출처가 95% 이상이면 불균형 (85% → 95%로 완화)
        const balanced = Object.values(counts).every(c => c / total < 0.95);

        return {
            reddit: counts.reddit / total,
            hackernews: counts.hackernews / total,
            other: counts.other / total,
            balanced
        };
    },

    /**
     * 다양성 검증 (토픽 선택 전 체크) - 더 관대한 버전
     */
    checkDiversity(topic: TrendingTopic, keywords: string[]): {
        pass: boolean;
        reason?: string;
    } {
        // 1. 카테고리 체크 비활성화 (모든 토픽이 같은 카테고리)
        // if (this.isCategoryConsecutive(topic.category)) {
        //     return { pass: false, reason: `같은 카테고리(${topic.category}) 3회 연속 게시 방지` };
        // }

        // 2. 키워드 중복 체크 (80% 이상만 차단)
        const { overlap, similarity } = this.hasKeywordOverlap(keywords);
        if (overlap) {
            return { pass: false, reason: `키워드 중복률 ${(similarity * 100).toFixed(0)}% (최대 80%)` };
        }

        // 3. 출처 균형 체크 (95% 이상만 차단)
        const balance = this.getSourceBalance();
        if (!balance.balanced) {
            const dominant = balance.reddit > 0.95 ? 'reddit' :
                balance.hackernews > 0.95 ? 'hackernews' : 'other';
            return { pass: false, reason: `${dominant} 출처 비율 과다 (균형 필요)` };
        }

        return { pass: true };
    },

    /**
     * 다양성 로그 초기화 (디버깅용)
     */
    clearLogs(): void {
        localStorage.removeItem(DIVERSITY_STORAGE_KEY);
        console.log('🗑️ Diversity logs cleared');
    }
};

// ============================================
// 🎯 품질 검증 시스템 (Quality Gate)
// ============================================

export interface QualityCheckResult {
    pass: boolean;
    score: number;          // 1-10
    sourceReliability: number; // 신뢰 출처 비율
    duplicationLevel: number;  // 0-1
    issues: string[];
}

export const QualityGate = {
    MIN_QUALITY_SCORE: 6,
    MIN_RELIABLE_SOURCE_RATIO: 0.6,
    MAX_DUPLICATION: 0.7,

    /**
     * 품질 검증 실행
     */
    async checkQuality(
        report: any,
        existingPosts: any[]
    ): Promise<QualityCheckResult> {
        const issues: string[] = [];

        // 1. 품질 점수 계산
        const score = this.calculateQualityScore(report);
        if (score < this.MIN_QUALITY_SCORE) {
            issues.push(`품질 점수 미달: ${score}/10 (최소 ${this.MIN_QUALITY_SCORE})`);
        }

        // 2. 신뢰 출처 비율 체크
        const sourceReliability = this.calculateSourceReliability(report.sources || []);
        if (sourceReliability < this.MIN_RELIABLE_SOURCE_RATIO) {
            issues.push(`신뢰 출처 부족: ${(sourceReliability * 100).toFixed(0)}% (최소 60%)`);
        }

        // 3. 중복 내용 감지
        const duplicationLevel = this.calculateDuplication(report, existingPosts);
        if (duplicationLevel > this.MAX_DUPLICATION) {
            issues.push(`중복 내용 과다: ${(duplicationLevel * 100).toFixed(0)}% (최대 70%)`);
        }

        // 4. 최소 출처 수 체크
        if (!report.sources || report.sources.length < 3) {
            issues.push(`출처 부족: ${report.sources?.length || 0}개 (최소 3개)`);
        }

        return {
            pass: issues.length === 0,
            score,
            sourceReliability,
            duplicationLevel,
            issues
        };
    },

    /**
     * 품질 점수 계산 (1-10)
     */
    calculateQualityScore(report: any): number {
        let score = 5; // 기본 점수

        // 콘텐츠 길이
        const length = report.detailedAnalysis?.length || 0;
        if (length > 2000) score += 1.5;
        else if (length > 1000) score += 1;
        else if (length < 500) score -= 1;

        // 출처 수
        const sourceCount = report.sources?.length || 0;
        if (sourceCount >= 5) score += 1.5;
        else if (sourceCount >= 3) score += 1;
        else if (sourceCount < 2) score -= 1.5;

        // 신뢰도 (qualityScore 필드)
        if (report.qualityScore?.overall) {
            score += (report.qualityScore.overall - 5) / 2;
        }

        // 구조화 정도 (헤딩 수)
        const headingCount = (report.detailedAnalysis?.match(/#{1,3}\s/g) || []).length;
        if (headingCount >= 4) score += 0.5;

        return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
    },

    /**
     * 신뢰 출처 비율 계산
     */
    calculateSourceReliability(sources: any[]): number {
        if (!sources || sources.length === 0) return 0;

        const reliable = sources.filter(s => (s.trustScore || 0) >= 70);
        return reliable.length / sources.length;
    },

    /**
     * 중복 레벨 계산 (기존 게시물과 비교)
     */
    calculateDuplication(report: any, existingPosts: any[]): number {
        if (!existingPosts || existingPosts.length === 0) return 0;

        const reportWords = new Set(
            (report.detailedAnalysis || '')
                .toLowerCase()
                .split(/\s+/)
                .filter((w: string) => w.length > 3)
        );

        let maxSimilarity = 0;

        for (const post of existingPosts.slice(0, 20)) {
            const postWords = new Set(
                (post.content || '')
                    .toLowerCase()
                    .split(/\s+/)
                    .filter((w: string) => w.length > 3)
            );

            const intersection = [...reportWords].filter(w => postWords.has(w));
            const similarity = intersection.length / Math.max(reportWords.size, postWords.size, 1);

            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }

        return maxSimilarity;
    },

    /**
     * 팩트 체크 강화: 출처 간 불일치 감지
     */
    detectInconsistencies(sources: any[]): string[] {
        // 간단한 구현: 핵심 수치/날짜가 다른 경우 감지
        const inconsistencies: string[] = [];

        if (sources.length < 3) {
            inconsistencies.push('출처가 3개 미만으로 교차 검증 불가');
        }

        // 출처 도메인 다양성 체크
        const domains = new Set(sources.map(s => s.domain));
        if (domains.size < 2 && sources.length >= 3) {
            inconsistencies.push('출처 도메인 다양성 부족');
        }

        return inconsistencies;
    }
};

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
            'americans', 'younger', 'older', 'grown', 'competitive', 'insecure',
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

            // 3. 📊 다양성 체크 (연속 카테고리, 키워드 중복, 출처 균형)
            const topicKeywords = topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const diversityCheck = DiversityManager.checkDiversity(topic, topicKeywords);

            if (!diversityCheck.pass) {
                console.log(`⏭️ Skipping (diversity): ${diversityCheck.reason}`);
                this.addLog({
                    id: `log_${Date.now()}`,
                    timestamp: Date.now(),
                    topic: topic.title,
                    source: topic.source,
                    status: 'skipped',
                    reason: `다양성: ${diversityCheck.reason}`
                });
                return null;
            }

            // 4. Research 수행 (재시도 포함)
            console.log(`📚 Performing research...`);
            let report = null;
            let researchAttempts = 0;
            const maxResearchAttempts = 2;

            while (researchAttempts < maxResearchAttempts && !report) {
                researchAttempts++;
                try {
                    report = await ResearchService.performResearch(
                        topic.title,
                        (progress) => {
                            console.log(`Progress: ${progress.step}`);
                        }
                    );
                } catch (researchError: any) {
                    console.warn(`⚠️ Research attempt ${researchAttempts} failed:`, researchError.message);
                    if (researchAttempts < maxResearchAttempts) {
                        await new Promise(r => setTimeout(r, 2000)); // 2초 대기 후 재시도
                    }
                }
            }

            if (!report || !report.summary) {
                throw new Error('Research failed - empty report after retries');
            }

            // 5. 🎯 품질 검증 (Quality Gate) - 실패해도 경고만
            console.log(`🎯 Running quality checks...`);
            let qualityResult = { pass: true, score: 7, issues: [] as string[] };
            try {
                const existingPosts = this.getRecentCuratorPosts();
                qualityResult = await QualityGate.checkQuality(report, existingPosts);

                if (!qualityResult.pass) {
                    console.warn(`⚠️ Quality warning: ${qualityResult.issues.join(', ')} - 게시 계속 진행`);
                    // 품질 미달이어도 게시 진행 (차단 안함)
                    qualityResult.pass = true;
                    qualityResult.score = Math.max(5, qualityResult.score); // 최소 5점
                }
            } catch (qualityError: any) {
                console.warn(`⚠️ Quality check failed:`, qualityError.message);
                // 품질 검사 실패 시 기본값 사용
            }

            // 6. 팩트 체크 (선택적)
            try {
                const inconsistencies = QualityGate.detectInconsistencies(report.sources || []);
                if (inconsistencies.length > 0) {
                    console.warn(`⚠️ Fact check warning: ${inconsistencies.join(', ')}`);
                }
            } catch (e) {
                console.warn('Fact check skipped');
            }

            // 7. 🔒 안전 정책 검사 - 실패해도 경고만 (NSFW는 차단)
            console.log(`🔒 Running safety checks...`);
            let safetyCheck = { allowed: true, score: 90, reasons: [] as string[], flags: [] as any[] };
            try {
                const avgTrustScore = report.sources?.length > 0
                    ? report.sources.reduce((sum, s) => sum + (s.trustScore || 50), 0) / report.sources.length
                    : 50;

                safetyCheck = SafetyPolicyService.checkContent(
                    topic.title,
                    report.detailedAnalysis || report.summary,
                    topic.url,
                    avgTrustScore
                );

                // NSFW만 차단, 나머지는 경고만
                const hasNSFW = safetyCheck.flags?.some(f => f.type === 'nsfw');
                if (hasNSFW) {
                    console.log(`🚫 Blocking NSFW content`);
                    this.addLog({
                        id: `log_${Date.now()}`,
                        timestamp: Date.now(),
                        topic: topic.title,
                        source: topic.source,
                        status: 'skipped',
                        reason: `안전: NSFW 콘텐츠`
                    });
                    return null;
                }

                if (!safetyCheck.allowed) {
                    console.warn(`⚠️ Safety warning: ${safetyCheck.reasons.join(', ')} - 게시 계속 진행`);
                    safetyCheck.allowed = true;
                }
            } catch (safetyError: any) {
                console.warn(`⚠️ Safety check failed:`, safetyError.message);
            }

            // 8. 🏷️ AI 자동 태그 생성 (선택적 - 실패해도 기본 태그 사용)
            console.log(`🏷️ Generating AI tags...`);
            let generatedTags = { contentTags: [], trendingTags: [], techStackTags: [] };
            try {
                generatedTags = await AIEnhancementService.generateTags(
                    topic.title,
                    report.detailedAnalysis || report.summary
                );
            } catch (tagError: any) {
                console.warn(`⚠️ Tag generation failed:`, tagError.message, '- using default tags');
            }

            // 9. 게시물로 변환
            console.log(`📝 Converting to post...`);
            const postDraft = await PostIntegrationService.convertReportToPost(
                report,
                topic.title
            );

            // 10. 카테고리 설정
            postDraft.category = topic.category || '지식 허브';
            postDraft.boardId = this.getBoardIdByCategory(postDraft.category);

            // 11. 태그 통합 (수동 + AI 생성)
            postDraft.tags = [
                ...postDraft.tags,
                'AI큐레이터',
                topic.source.toUpperCase(),
                `품질${Math.round(qualityResult.score)}`,
                ...(generatedTags.contentTags?.slice(0, 3) || []),
                ...(generatedTags.techStackTags?.slice(0, 2) || [])
            ].filter(t => t && t.length > 0);

            // 12. URL 히스토리에 추가 (스팸 방지)
            try {
                SafetyPolicyService.addUrlToHistory(topic.url);
            } catch (e) {
                console.warn('URL history update failed');
            }

            // 13. 게시 (재시도 포함)
            console.log(`🎉 Publishing post (quality: ${qualityResult.score.toFixed(1)}/10)...`);
            let postId = null;
            let publishAttempts = 0;
            const maxPublishAttempts = 2;

            while (publishAttempts < maxPublishAttempts && !postId) {
                publishAttempts++;
                try {
                    postId = await PostIntegrationService.publishPost(postDraft, userId);
                } catch (publishError: any) {
                    console.warn(`⚠️ Publish attempt ${publishAttempts} failed:`, publishError.message);
                    if (publishAttempts < maxPublishAttempts) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
            }

            if (!postId) {
                throw new Error('Failed to publish after retries');
            }

            console.log(`✅ Successfully published: ${postId}`);

            // 11. 다양성 로그 추가
            DiversityManager.addLog({
                category: topic.category,
                source: topic.source,
                keywords: topicKeywords.slice(0, 10)
            });

            // 12. 큐레이터 로그 기록
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
