/**
 * AI Enhancement Service - AI 고도화
 * 토픽 추천 AI, 요약 품질 개선, 자동 태그 생성
 */

import { getGroqClient } from './groqClient';

// ============================================
// Types
// ============================================

export type WritingStyle = 'formal' | 'casual' | 'tech-savvy';
export type AudienceLevel = 'beginner' | 'intermediate' | 'expert';

export interface TopicScore {
    topic: string;
    trendScore: number;      // 인기 상승도 (0-100)
    timelinessScore: number; // 시의성 (0-100)
    relevanceScore: number;  // 커뮤니티 관련성 (0-100)
    finalScore: number;
    reasoning: string;
}

export interface SummaryOptions {
    style: WritingStyle;
    audienceLevel: AudienceLevel;
    maxLength?: number;
    includeEmoji?: boolean;
}

export interface GeneratedTags {
    contentTags: string[];      // 내용 기반 태그
    trendingTags: string[];     // 트렌딩 해시태그
    techStackTags: string[];    // 기술 스택 태그
}

// ============================================
// Trending Keywords (실시간 업데이트용)
// ============================================

const TRENDING_KEYWORDS_2026 = [
    'GPT-5', 'Gemini 3.0', 'Claude 4.5', 'Llama 4',
    'AGI', 'ASI', 'AI Alignment', 'Agentic AI',
    'Strawberry', 'o3', 'Reasoning Model',
    'NVIDIA H200', 'Blackwell', 'TPU v6',
    'Apple Intelligence', 'Meta AI',
    '양자컴퓨터', 'Quantum Supremacy',
    '뉴럴링크', 'Brain-Computer Interface',
    'Humanoid Robot', 'Boston Dynamics',
    'Space X', 'Starship'
];

const TECH_STACK_PATTERNS: Record<string, string[]> = {
    'AI/ML': ['pytorch', 'tensorflow', 'transformers', 'huggingface', 'langchain', 'llama', 'openai'],
    'Frontend': ['react', 'vue', 'svelte', 'next.js', 'typescript', 'tailwind'],
    'Backend': ['node.js', 'python', 'rust', 'go', 'fastapi', 'express'],
    'Cloud': ['aws', 'gcp', 'azure', 'kubernetes', 'docker', 'serverless'],
    'Database': ['postgresql', 'mongodb', 'redis', 'pinecone', 'vector db'],
    'Blockchain': ['ethereum', 'solana', 'defi', 'nft', 'web3'],
    'Hardware': ['nvidia', 'amd', 'apple silicon', 'tpu', 'gpu', 'semiconductor']
};

// ============================================
// AI Enhancement Service
// ============================================

export const AIEnhancementService = {
    /**
     * 🎯 토픽 추천 AI - 인기 상승 패턴 감지
     */
    async scoreTopics(topics: { title: string; score: number; source: string }[]): Promise<TopicScore[]> {
        const scored: TopicScore[] = topics.map(topic => {
            // 1. 트렌드 점수 (현재 인기도)
            const trendScore = Math.min(100, Math.log10(topic.score + 1) * 20);

            // 2. 시의성 점수 (트렌딩 키워드 매칭)
            const titleLower = topic.title.toLowerCase();
            const trendingMatches = TRENDING_KEYWORDS_2026.filter(kw =>
                titleLower.includes(kw.toLowerCase())
            );
            const timelinessScore = Math.min(100, trendingMatches.length * 30 + 20);

            // 3. 커뮤니티 관련성 (기술 관련 키워드)
            let relevanceScore = 40; // 기본값
            for (const [category, keywords] of Object.entries(TECH_STACK_PATTERNS)) {
                const matches = keywords.filter(kw => titleLower.includes(kw));
                if (matches.length > 0) {
                    relevanceScore += matches.length * 15;
                }
            }
            relevanceScore = Math.min(100, relevanceScore);

            // 최종 점수 (가중 평균)
            const finalScore = (trendScore * 0.3) + (timelinessScore * 0.4) + (relevanceScore * 0.3);

            return {
                topic: topic.title,
                trendScore,
                timelinessScore,
                relevanceScore,
                finalScore,
                reasoning: trendingMatches.length > 0
                    ? `트렌딩: ${trendingMatches.join(', ')}`
                    : '일반 토픽'
            };
        });

        // 최종 점수로 정렬
        return scored.sort((a, b) => b.finalScore - a.finalScore);
    },

    /**
     * 📝 요약 품질 개선 - 다양한 Writing Style
     */
    async generateStyledSummary(
        content: string,
        options: SummaryOptions
    ): Promise<string> {
        const groqClient = getGroqClient();

        const stylePrompts: Record<WritingStyle, string> = {
            'formal': '격식체로 작성하세요. 존댓말을 사용하고, 객관적이고 학술적인 톤을 유지하세요.',
            'casual': '친근한 반말체로 작성하세요. 이모지를 적절히 사용하고, 대화하듯 설명하세요.',
            'tech-savvy': '기술 전문가 스타일로 작성하세요. 전문 용어를 그대로 사용하고, 코드 예시를 포함할 수 있습니다.'
        };

        const levelPrompts: Record<AudienceLevel, string> = {
            'beginner': '비전공자도 이해할 수 있도록 쉬운 용어로 설명하세요. 비유와 예시를 많이 사용하세요.',
            'intermediate': '기본 지식이 있는 독자를 대상으로 합니다. 핵심 개념은 간단히 설명하세요.',
            'expert': '전문가 독자를 대상으로 합니다. 심층적인 분석과 기술적 세부사항을 포함하세요.'
        };

        const prompt = `다음 내용을 요약해주세요.

## 작성 스타일
${stylePrompts[options.style]}

## 독자 수준
${levelPrompts[options.audienceLevel]}

## 원본 내용
${content.substring(0, 3000)}

## 요구사항
- 최대 ${options.maxLength || 500}자
${options.includeEmoji ? '- 적절한 이모지 포함' : '- 이모지 사용 금지'}
- 핵심 내용 위주로 요약
- 한글과 영어 전문용어 자연스럽게 혼용`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.6,
                max_tokens: 800
            },
            (chunk, full) => {
                response = full;
            }
        );

        return response.trim();
    },

    /**
     * 🏷️ 자동 태그 생성
     */
    async generateTags(title: string, content: string): Promise<GeneratedTags> {
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        const combined = `${titleLower} ${contentLower}`;

        // 1. 내용 기반 태그 추출
        const contentTags: string[] = [];
        for (const keyword of TRENDING_KEYWORDS_2026) {
            if (combined.includes(keyword.toLowerCase())) {
                contentTags.push(keyword);
            }
        }

        // 2. 기술 스택 태그
        const techStackTags: string[] = [];
        for (const [category, keywords] of Object.entries(TECH_STACK_PATTERNS)) {
            const matches = keywords.filter(kw => combined.includes(kw));
            if (matches.length > 0) {
                techStackTags.push(category);
                techStackTags.push(...matches.slice(0, 2));
            }
        }

        // 3. 트렌딩 해시태그 (AI 기반)
        const trendingTags = await this.extractTrendingHashtags(title);

        return {
            contentTags: [...new Set(contentTags)].slice(0, 5),
            trendingTags: trendingTags.slice(0, 3),
            techStackTags: [...new Set(techStackTags)].slice(0, 5)
        };
    },

    /**
     * AI 기반 트렌딩 해시태그 추출
     */
    async extractTrendingHashtags(title: string): Promise<string[]> {
        const groqClient = getGroqClient();

        const prompt = `다음 제목에서 트렌딩 해시태그 3개를 추출하세요.

제목: "${title}"

규칙:
- 한글 또는 영어 해시태그
- 현재 트렌딩 중인 키워드 우선
- # 없이 단어만 출력
- 쉼표로 구분

예시: AI기술, GPT5, 양자컴퓨팅`;

        let response = '';
        try {
            await groqClient.streamChat(
                {
                    model: 'openai/gpt-oss-120b',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5,
                    max_tokens: 50
                },
                (chunk, full) => {
                    response = full;
                }
            );

            return response.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } catch (e) {
            console.error('Trending hashtag extraction failed:', e);
            return ['AI', '기술', '트렌드'];
        }
    }
};

export default AIEnhancementService;
