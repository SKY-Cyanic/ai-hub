/**
 * Context Analyzer - Phase A1
 * 사용자 질문의 의도와 맥락을 분석하여 최적의 검색 키워드 생성
 */

import { getGroqClient } from './groqClient';

// ============================================
// Types
// ============================================

export type IntentType =
    | 'definition'    // 정의 질문 (뭐야?, 무엇인가?)
    | 'comparison'    // 비교 질문 (차이점, vs)
    | 'fact-check'    // 사실 확인 (맞아?, 사실인가?)
    | 'how-to'        // 방법 질문 (어떻게?)
    | 'opinion'       // 의견 요청 (전망, 추천)
    | 'exploration';  // 탐색 (최신 동향)

export interface ContextAnalysis {
    originalQuery: string;
    intent: IntentType;
    intentConfidence: number;

    // 핵심 엔티티
    entities: Entity[];

    // 약어 확장
    abbreviationExpansions: AbbreviationExpansion[];

    // 검색 키워드
    searchKeywords: string[];

    // 다의어 가능성
    isAmbiguous: boolean;
    possibleMeanings: string[];

    // 복잡도
    complexity: 'simple' | 'complex';
}

export interface Entity {
    text: string;
    type: 'TECH' | 'COMPANY' | 'PERSON' | 'CONCEPT' | 'PRODUCT' | 'OTHER';
}

export interface AbbreviationExpansion {
    abbreviation: string;
    expansions: string[];
    mostLikely: string;
}

// ============================================
// Intent Detection Patterns
// ============================================

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
    'definition': [
        /무엇(인가|이야|인지|일까)/i,
        /뭐(야|예요|인가요)/i,
        /(이|가)\s*뭐/i,
        /what\s*is/i,
        /정의/i,
        /개념/i,
        /의미/i
    ],
    'comparison': [
        /차이(점)?/i,
        /비교/i,
        /vs\.?/i,
        /versus/i,
        /다른\s*점/i,
        /어떤\s*게\s*(더|나아|좋아)/i,
        /compare/i,
        /difference/i
    ],
    'fact-check': [
        /사실(인가|이야|인지)?/i,
        /맞(아|나요|습니까)/i,
        /진짜/i,
        /정말/i,
        /is\s*it\s*true/i,
        /검증/i,
        /확인/i
    ],
    'how-to': [
        /어떻게/i,
        /방법/i,
        /하는\s*법/i,
        /how\s*to/i,
        /guide/i,
        /tutorial/i,
        /설정/i,
        /설치/i
    ],
    'opinion': [
        /전망/i,
        /추천/i,
        /어떨까/i,
        /좋을까/i,
        /생각/i,
        /의견/i,
        /best/i,
        /recommend/i
    ],
    'exploration': [
        /최신/i,
        /동향/i,
        /트렌드/i,
        /현황/i,
        /news/i,
        /update/i,
        /latest/i,
        /recent/i
    ]
};

// 복잡도 판단 키워드
const COMPLEXITY_INDICATORS = {
    simple: [
        /^.{1,30}$/,  // 30자 이하
        /뭐야|무엇인가|무엇이야/i
    ],
    complex: [
        /그리고|또한|반면에|그러나/i,
        /비교.*분석/i,
        /장단점/i,
        /영향.*미치/i
    ]
};

// ============================================
// 기술 약어 사전 (Hallucination 방지)
// ============================================

const TECH_ABBREVIATIONS: Record<string, {
    fullForm: string;
    context: string;
    description: string;
    relatedTerms: string[];
}> = {
    'LPU': {
        fullForm: 'Language Processing Unit',
        context: 'Groq',
        description: 'Groq이 개발한 AI 추론 전용 프로세서. GPU/CPU보다 빠른 LLM 추론 가능.',
        relatedTerms: ['Groq', 'AI 추론', '반도체', 'Tensor Streaming Processor', 'TSP']
    },
    'TPU': {
        fullForm: 'Tensor Processing Unit',
        context: 'Google',
        description: 'Google이 개발한 텐서 연산 전용 프로세서.',
        relatedTerms: ['Google', 'TensorFlow', 'AI 가속기', 'Cloud TPU']
    },
    'NPU': {
        fullForm: 'Neural Processing Unit',
        context: 'AI Accelerator',
        description: '신경망 연산에 최적화된 AI 가속기.',
        relatedTerms: ['AI 가속기', '온디바이스 AI', 'Qualcomm', 'Apple Neural Engine']
    },
    'GPU': {
        fullForm: 'Graphics Processing Unit',
        context: 'NVIDIA/AMD',
        description: '그래픽 및 병렬 연산 처리 장치.',
        relatedTerms: ['NVIDIA', 'AMD', 'CUDA', 'Deep Learning']
    },
    'LLM': {
        fullForm: 'Large Language Model',
        context: 'AI',
        description: '대규모 언어 모델. GPT, Claude, Gemini 등.',
        relatedTerms: ['ChatGPT', 'Claude', 'Gemini', 'Transformer']
    },
    'RAG': {
        fullForm: 'Retrieval-Augmented Generation',
        context: 'AI',
        description: '검색 증강 생성. 외부 지식을 활용한 AI 응답 생성.',
        relatedTerms: ['Vector DB', 'Embedding', 'Knowledge Base']
    },
    'MoE': {
        fullForm: 'Mixture of Experts',
        context: 'AI Architecture',
        description: '전문가 혼합 아키텍처. Mixtral, Switch Transformer 등.',
        relatedTerms: ['Mixtral', 'Sparse Model', 'Gating Network']
    },
    'RLHF': {
        fullForm: 'Reinforcement Learning from Human Feedback',
        context: 'AI Training',
        description: '인간 피드백 기반 강화학습. ChatGPT 학습 방법론.',
        relatedTerms: ['PPO', 'DPO', 'InstructGPT', 'Alignment']
    },
    'AGI': {
        fullForm: 'Artificial General Intelligence',
        context: 'AI',
        description: '인공 일반 지능. 인간 수준의 범용 AI.',
        relatedTerms: ['Strong AI', 'Superintelligence', 'OpenAI']
    }
};

/**
 * 알려진 약어인지 확인하고 컨텍스트 정보 반환
 */
function getKnownAbbreviation(text: string): typeof TECH_ABBREVIATIONS[string] | null {
    const upper = text.toUpperCase();
    return TECH_ABBREVIATIONS[upper] || null;
}

// ============================================
// Context Analyzer
// ============================================

export const ContextAnalyzer = {
    /**
     * 질문 분석 메인 함수
     */
    async analyze(query: string): Promise<ContextAnalysis> {
        console.log(`🔍 Analyzing context: "${query}"`);

        // 1. 의도 분류
        const intent = this.detectIntent(query);

        // 2. 복잡도 판단
        const complexity = this.assessComplexity(query);

        // 3. AI를 통한 심층 분석
        const aiAnalysis = await this.performAIAnalysis(query, intent, complexity);

        console.log(`✅ Context analysis complete:`, {
            intent: aiAnalysis.intent,
            keywords: aiAnalysis.searchKeywords.slice(0, 3),
            complexity: aiAnalysis.complexity
        });

        return aiAnalysis;
    },

    /**
     * 규칙 기반 의도 분류
     */
    detectIntent(query: string): IntentType {
        let bestMatch: IntentType = 'definition';
        let highestScore = 0;

        for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
            let score = 0;
            for (const pattern of patterns) {
                if (pattern.test(query)) {
                    score++;
                }
            }
            if (score > highestScore) {
                highestScore = score;
                bestMatch = intent as IntentType;
            }
        }

        return bestMatch;
    },

    /**
     * 복잡도 판단
     */
    assessComplexity(query: string): 'simple' | 'complex' {
        // 복잡 지표 확인
        for (const pattern of COMPLEXITY_INDICATORS.complex) {
            if (pattern.test(query)) {
                return 'complex';
            }
        }

        // 단순 지표 확인
        for (const pattern of COMPLEXITY_INDICATORS.simple) {
            if (pattern.test(query)) {
                return 'simple';
            }
        }

        // 기본값: 길이 기준
        return query.length > 50 ? 'complex' : 'simple';
    },

    /**
     * AI를 통한 심층 분석
     */
    async performAIAnalysis(
        query: string,
        detectedIntent: IntentType,
        complexity: 'simple' | 'complex'
    ): Promise<ContextAnalysis> {
        const groqClient = getGroqClient();

        // 🔍 알려진 약어 감지
        const detectedAbbreviations: string[] = [];
        let abbreviationContext = '';

        for (const abbr of Object.keys(TECH_ABBREVIATIONS)) {
            if (query.toUpperCase().includes(abbr)) {
                const info = TECH_ABBREVIATIONS[abbr];
                detectedAbbreviations.push(abbr);
                abbreviationContext += `\n- **${abbr}** = ${info.fullForm} (${info.context}): ${info.description}`;
            }
        }

        const prompt = `사용자 질문을 분석하여 JSON 형식으로 응답하세요.

## 사용자 질문
"${query}"

## 초기 분석
- 감지된 의도: ${detectedIntent}
- 복잡도: ${complexity}
${abbreviationContext ? `
## ⚠️ 주의: 알려진 기술 약어 (정확히 이 의미로 사용하세요!)${abbreviationContext}
` : ''}
## 분석 요청
다음 JSON 형식으로 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
{
    "intent": "definition|comparison|fact-check|how-to|opinion|exploration",
    "intentConfidence": 0.0~1.0,
    "entities": [
        {"text": "엔티티명", "type": "TECH|COMPANY|PERSON|CONCEPT|PRODUCT|OTHER"}
    ],
    "abbreviationExpansions": [
        {"abbreviation": "약어", "expansions": ["확장1", "확장2"], "mostLikely": "가장 가능성 높은 의미"}
    ],
    "searchKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
    "isAmbiguous": true|false,
    "possibleMeanings": ["가능한 의미1", "가능한 의미2"]
}

## 중요 규칙
1. searchKeywords는 실제 검색에 사용할 3-5개의 최적화된 키워드
2. 약어(LPU, GPU 등)는 반드시 가능한 모든 의미를 expansions에 포함
3. 다의어가 있으면 isAmbiguous를 true로
4. 검색 키워드에는 원본 질문을 그대로 넣지 말고, 분석된 핵심 개념으로 구성`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1000
            },
            (chunk, full) => {
                response = full;
            }
        );

        try {
            // JSON 파싱 시도
            const parsed = this.parseAIResponse(response);

            return {
                originalQuery: query,
                intent: parsed.intent || detectedIntent,
                intentConfidence: parsed.intentConfidence || 0.8,
                entities: parsed.entities || [],
                abbreviationExpansions: parsed.abbreviationExpansions || [],
                searchKeywords: parsed.searchKeywords || [query],
                isAmbiguous: parsed.isAmbiguous || false,
                possibleMeanings: parsed.possibleMeanings || [],
                complexity: complexity
            };
        } catch (error) {
            console.error('AI analysis parsing failed:', error);
            // 폴백: 기본 분석 반환
            return this.createFallbackAnalysis(query, detectedIntent, complexity);
        }
    },

    /**
     * AI 응답 파싱
     */
    parseAIResponse(response: string): any {
        // JSON 블록 추출 시도
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        return JSON.parse(jsonMatch[0]);
    },

    /**
     * 폴백 분석 생성
     */
    createFallbackAnalysis(
        query: string,
        intent: IntentType,
        complexity: 'simple' | 'complex'
    ): ContextAnalysis {
        // 기본 키워드 추출
        const keywords = this.extractBasicKeywords(query);

        return {
            originalQuery: query,
            intent: intent,
            intentConfidence: 0.6,
            entities: [],
            abbreviationExpansions: [],
            searchKeywords: keywords,
            isAmbiguous: false,
            possibleMeanings: [],
            complexity: complexity
        };
    },

    /**
     * 기본 키워드 추출
     */
    extractBasicKeywords(query: string): string[] {
        // 불용어 제거
        const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '로',
            '와', '과', '도', '만', '뭐', '무엇', '어떻게', '왜', '어디', '언제'];

        const words = query.split(/\s+/).filter(word => {
            const cleaned = word.replace(/[?!.,]/g, '');
            return cleaned.length > 1 && !stopWords.includes(cleaned);
        });

        // 원본 + 변형 키워드
        const keywords = [...new Set([
            query.replace(/[?!]/g, '').trim(),
            ...words,
            `${words.join(' ')} 정의`,
            `${words.join(' ')} 설명`
        ])];

        return keywords.slice(0, 5);
    }
};

export default ContextAnalyzer;
