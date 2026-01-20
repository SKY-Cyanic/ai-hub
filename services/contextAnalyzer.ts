/**
 * Context Analyzer - Phase 4.2 Checkpoint 5
 * 사용자 의도 분석 및 맥락 파악
 */

import { getGroqClient } from './groqClient';

export type IntentType = 'definition' | 'comparison' | 'fact-check' | 'how-to' | 'opinion' | 'exploration';
export type Complexity = 'simple' | 'moderate' | 'complex';

export interface UserIntent {
    type: IntentType;
    complexity: Complexity;
    keywords: string[];
    searchQueries: string[];
    confidence: number;
}

export interface ContextAnalysisResult {
    originalQuery: string;
    intent: UserIntent;
    recommendedTemplate: string;
    reasoning: string;
}

export const ContextAnalyzer = {
    async analyzeContext(query: string): Promise<ContextAnalysisResult> {
        const groqClient = getGroqClient();

        const prompt = `사용자 질문: "${query}"

이 질문의 의도를 분석하세요:

1. **의도 유형** (하나 선택):
   - definition: 무엇인가? 정의/설명 요청
   - comparison: A vs B, 비교/분석
   - fact-check: 사실인가? 검증 요청
   - how-to: 어떻게? 방법 안내
   - opinion: 찬반, 의견/논쟁
   - exploration: 일반적 정보 탐색

2. **복잡도** (하나 선택):
   - simple: 단순 답변 가능
   - moderate: 중간 수준 분석 필요
   - complex: 깊은 추론 필요

3. **핵심 키워드** (3-5개):

4. **검색 쿼리** (다각도 3-4개):

응답 형식:
type: [의도]
complexity: [복잡도]
keywords: [키워드1, 키워드2, ...]
queries: [쿼리1, 쿼리2, ...]
reasoning: [1문장 설명]`;

        let response = '';
        await groqClient.streamChat({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 400
        }, (_, full) => { response = full; });

        return this.parseAnalysisResponse(query, response);
    },

    parseAnalysisResponse(query: string, response: string): ContextAnalysisResult {
        const lines = response.split('\n');

        let type: IntentType = 'exploration';
        let complexity: Complexity = 'moderate';
        let keywords: string[] = [];
        let queries: string[] = [];
        let reasoning = '';

        for (const line of lines) {
            const lower = line.toLowerCase().trim();

            if (lower.startsWith('type:')) {
                const match = line.match(/(definition|comparison|fact-check|how-to|opinion|exploration)/i);
                if (match) type = match[1].toLowerCase() as IntentType;
            } else if (lower.startsWith('complexity:')) {
                const match = line.match(/(simple|moderate|complex)/i);
                if (match) complexity = match[1].toLowerCase() as Complexity;
            } else if (lower.startsWith('keywords:')) {
                const keywordStr = line.substring(line.indexOf(':') + 1);
                keywords = keywordStr.split(',').map(k => k.trim()).filter(k => k);
            } else if (lower.startsWith('queries:')) {
                const queryStr = line.substring(line.indexOf(':') + 1);
                queries = queryStr.split(',').map(q => q.trim()).filter(q => q);
            } else if (lower.startsWith('reasoning:')) {
                reasoning = line.substring(line.indexOf(':') + 1).trim();
            }
        }

        const templateMap: Record<IntentType, string> = {
            definition: 'definition_template',
            comparison: 'comparison_template',
            'fact-check': 'fact_check_template',
            'how-to': 'how_to_template',
            opinion: 'opinion_template',
            exploration: 'exploration_template'
        };

        console.log(`🎯 Intent: ${type} (${complexity})`);
        console.log(`🔑 Keywords: [${keywords.join(', ')}]`);

        return {
            originalQuery: query,
            intent: {
                type,
                complexity,
                keywords,
                searchQueries: queries.length > 0 ? queries : [query],
                confidence: 0.85
            },
            recommendedTemplate: templateMap[type],
            reasoning
        };
    }
};
