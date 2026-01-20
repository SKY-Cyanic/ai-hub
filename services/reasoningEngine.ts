/**
 * Reasoning Engine - Phase 4.2 Checkpoint 6
 * 5단계 추론 프레임워크
 */

import { getGroqClient } from './groqClient';

export interface ReasoningStep {
    step: 1 | 2 | 3 | 4 | 5;
    name: string;
    result: string;
    confidence: number;
    evidence: string[];
}

export interface ReasoningResult {
    steps: ReasoningStep[];
    finalAnswer: string;
    overallConfidence: number;
    warnings: string[];
    needsRetry: boolean;
}

const MIN_CONFIDENCE = 0.8;
const MAX_RETRIES = 2;

export const ReasoningEngine = {
    async reason(query: string, sources: string, complexity: 'simple' | 'moderate' | 'complex'): Promise<ReasoningResult> {
        if (complexity === 'simple') {
            return this.simpleReasoning(query, sources);
        }

        return this.fiveStepReasoning(query, sources);
    },

    async simpleReasoning(query: string, sources: string): Promise<ReasoningResult> {
        const groqClient = getGroqClient();

        const prompt = `질문: "${query}"

출처 정보:
${sources}

간단히 답변하세요. 응답 형식:
answer: [답변]
confidence: [0.0-1.0]
warning: [주의사항]`;

        let response = '';
        await groqClient.streamChat({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 500
        }, (_, full) => { response = full; });

        const answerMatch = response.match(/answer:\s*(.+)/i);
        const confMatch = response.match(/confidence:\s*(0?\.\d+|1\.0)/);
        const warnMatch = response.match(/warning:\s*(.+)/i);

        return {
            steps: [{
                step: 1,
                name: 'Simple Answer',
                result: answerMatch ? answerMatch[1].trim() : response,
                confidence: confMatch ? parseFloat(confMatch[1]) : 0.9,
                evidence: []
            }],
            finalAnswer: answerMatch ? answerMatch[1].trim() : response,
            overallConfidence: confMatch ? parseFloat(confMatch[1]) : 0.9,
            warnings: warnMatch ? [warnMatch[1].trim()] : [],
            needsRetry: false
        };
    },

    async fiveStepReasoning(query: string, sources: string, retryCount = 0): Promise<ReasoningResult> {
        const groqClient = getGroqClient();

        const prompt = `"${query}"에 대해 5단계 추론을 수행하세요.

출처:
${sources.substring(0, 3000)}

**5단계 프로세스:**

1. **분해 (Decompose)**: 하위 문제로 나누기
2. **해결 (Solve)**: 각 하위 문제 답변 + 신뢰도(0.0-1.0)
3. **검증 (Verify)**: 논리/사실/완전성/편향 체크
4. **종합 (Synthesize)**: 가중 평균으로 최종 답변
5. **성찰 (Reflect)**: 신뢰도 < 0.8이면 약점 파악

응답 형식:
step1: [하위문제1, 하위문제2, ...]
step2: [답변1(신뢰도), 답변2(신뢰도), ...]
step3: [검증결과]
step4: [최종답변]
step5: [종합신뢰도] [약점]`;

        let response = '';
        await groqClient.streamChat({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 1000
        }, (_, full) => { response = full; });

        const result = this.parseReasoningResponse(response);

        // 재시도 판정
        if (result.overallConfidence < MIN_CONFIDENCE && retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying reasoning (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            return this.fiveStepReasoning(query, sources, retryCount + 1);
        }

        return result;
    },

    parseReasoningResponse(response: string): ReasoningResult {
        const steps: ReasoningStep[] = [];
        let finalAnswer = '';
        let overallConfidence = 0.85;
        const warnings: string[] = [];

        const step1Match = response.match(/step1:\s*(.+)/i);
        const step2Match = response.match(/step2:\s*(.+)/i);
        const step4Match = response.match(/step4:\s*(.+)/i);
        const step5Match = response.match(/step5:\s*(0?\.\d+|1\.0)/);

        if (step1Match) {
            steps.push({
                step: 1,
                name: 'Decompose',
                result: step1Match[1].trim(),
                confidence: 0.9,
                evidence: []
            });
        }

        if (step2Match) {
            steps.push({
                step: 2,
                name: 'Solve',
                result: step2Match[1].trim(),
                confidence: 0.85,
                evidence: []
            });
        }

        if (step4Match) {
            finalAnswer = step4Match[1].trim();
            steps.push({
                step: 4,
                name: 'Synthesize',
                result: finalAnswer,
                confidence: 0.87,
                evidence: []
            });
        }

        if (step5Match) {
            overallConfidence = parseFloat(step5Match[1]);
        }

        if (overallConfidence < MIN_CONFIDENCE) {
            warnings.push(`신뢰도 낮음: ${overallConfidence.toFixed(2)}`);
        }

        return {
            steps,
            finalAnswer: finalAnswer || response.substring(0, 500),
            overallConfidence,
            warnings,
            needsRetry: overallConfidence < MIN_CONFIDENCE
        };
    }
};
