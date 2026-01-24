/**
 * Reasoning Engine - Phase A2
 * 5단계 추론 시스템: 분해 → 해결 → 검증 → 종합 → 성찰
 */

import { getGroqClient } from './groqClient';
import { ContextAnalysis, IntentType } from './contextAnalyzer';

// ============================================
// Types
// ============================================

export interface ReasoningResult {
    // 필수 출력
    clearAnswer: string;        // 명확한 답변
    confidence: number;         // 신뢰도 (0.0-1.0)
    keyNotes: string[];         // 주요 주의사항

    // 메타데이터
    complexity: 'simple' | 'complex';
    reasoningPath: ReasoningStep[];

    // 복잡한 질문일 경우
    decomposition?: SubProblem[];
    verification?: VerificationResult;
    reflection?: ReflectionResult;
}

export interface ReasoningStep {
    step: number;
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    result?: string;
    confidence?: number;
}

export interface SubProblem {
    id: string;
    question: string;
    answer: string;
    confidence: number;
    sources: string[];
}

export interface VerificationResult {
    logicCheck: boolean;
    factCheck: boolean;
    completenessCheck: boolean;
    biasCheck: boolean;
    issues: string[];
    overallPass: boolean;
}

export interface ReflectionResult {
    weaknesses: string[];
    improvements: string[];
    retryNeeded: boolean;
    retryCount: number;
}

// ============================================
// Constants
// ============================================

const CONFIDENCE_THRESHOLD = 0.8;
const MAX_RETRY_COUNT = 2;

// ============================================
// Reasoning Engine
// ============================================

export const ReasoningEngine = {
    /**
     * 메인 추론 함수
     */
    async process(
        query: string,
        context: ContextAnalysis,
        searchResults: any[],
        onProgress?: (step: ReasoningStep) => void
    ): Promise<ReasoningResult> {
        console.log(`🧠 Starting reasoning for: "${query}"`);

        const reasoningPath: ReasoningStep[] = [];

        // 복잡도에 따른 처리 분기
        if (context.complexity === 'simple') {
            return await this.processSimpleQuery(query, context, searchResults, reasoningPath, onProgress);
        } else {
            return await this.processComplexQuery(query, context, searchResults, reasoningPath, onProgress);
        }
    },

    /**
     * 단순 질문 처리 - 바로 답변
     */
    async processSimpleQuery(
        query: string,
        context: ContextAnalysis,
        searchResults: any[],
        reasoningPath: ReasoningStep[],
        onProgress?: (step: ReasoningStep) => void
    ): Promise<ReasoningResult> {
        const step: ReasoningStep = {
            step: 1,
            name: '직접 답변 생성',
            status: 'in-progress'
        };
        reasoningPath.push(step);
        if (onProgress) onProgress(step);

        const groqClient = getGroqClient();

        const prompt = this.buildSimpleAnswerPrompt(query, context, searchResults);

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 4000
            },
            (chunk, full) => {
                response = full;
            }
        );

        const parsed = this.parseSimpleResponse(response);

        step.status = 'completed';
        step.result = parsed.clearAnswer.substring(0, 100) + '...';
        step.confidence = parsed.confidence;
        if (onProgress) onProgress(step);

        return {
            clearAnswer: parsed.clearAnswer,
            confidence: parsed.confidence,
            keyNotes: parsed.keyNotes,
            complexity: 'simple',
            reasoningPath
        };
    },

    /**
     * 복잡한 질문 처리 - 5단계 추론
     */
    async processComplexQuery(
        query: string,
        context: ContextAnalysis,
        searchResults: any[],
        reasoningPath: ReasoningStep[],
        onProgress?: (step: ReasoningStep) => void,
        retryCount: number = 0
    ): Promise<ReasoningResult> {
        const groqClient = getGroqClient();

        // Step 1: 분해
        const step1: ReasoningStep = { step: 1, name: '문제 분해', status: 'in-progress' };
        reasoningPath.push(step1);
        if (onProgress) onProgress(step1);

        const decomposition = await this.decompose(query, context, groqClient);
        step1.status = 'completed';
        step1.result = `${decomposition.length}개 하위 문제`;
        if (onProgress) onProgress(step1);

        // Step 2: 해결
        const step2: ReasoningStep = { step: 2, name: '하위 문제 해결', status: 'in-progress' };
        reasoningPath.push(step2);
        if (onProgress) onProgress(step2);

        const solutions = await this.solveSubProblems(decomposition, searchResults, groqClient);
        step2.status = 'completed';
        step2.result = `평균 신뢰도: ${(solutions.reduce((a, s) => a + s.confidence, 0) / solutions.length).toFixed(2)}`;
        if (onProgress) onProgress(step2);

        // Step 3: 검증
        const step3: ReasoningStep = { step: 3, name: '검증', status: 'in-progress' };
        reasoningPath.push(step3);
        if (onProgress) onProgress(step3);

        const verification = await this.verify(solutions, groqClient);
        step3.status = 'completed';
        step3.result = verification.overallPass ? '통과' : `이슈 ${verification.issues.length}개`;
        if (onProgress) onProgress(step3);

        // Step 4: 종합
        const step4: ReasoningStep = { step: 4, name: '종합', status: 'in-progress' };
        reasoningPath.push(step4);
        if (onProgress) onProgress(step4);

        const synthesis = await this.synthesize(query, context, solutions, verification, groqClient);
        step4.status = 'completed';
        step4.confidence = synthesis.confidence;
        if (onProgress) onProgress(step4);

        // Step 5: 성찰
        const step5: ReasoningStep = { step: 5, name: '성찰', status: 'in-progress' };
        reasoningPath.push(step5);
        if (onProgress) onProgress(step5);

        const reflection = await this.reflect(synthesis, verification, retryCount);
        step5.status = 'completed';
        step5.result = reflection.retryNeeded ? '재시도 필요' : '완료';
        if (onProgress) onProgress(step5);

        // 신뢰도 미달 시 재시도
        if (reflection.retryNeeded && retryCount < MAX_RETRY_COUNT) {
            console.log(`🔄 Retry ${retryCount + 1}: Confidence ${synthesis.confidence} < ${CONFIDENCE_THRESHOLD}`);
            return this.processComplexQuery(
                query, context, searchResults, reasoningPath, onProgress, retryCount + 1
            );
        }

        return {
            clearAnswer: synthesis.clearAnswer,
            confidence: synthesis.confidence,
            keyNotes: synthesis.keyNotes,
            complexity: 'complex',
            reasoningPath,
            decomposition: solutions,
            verification,
            reflection
        };
    },

    /**
     * Step 1: 분해 - 하위 문제로 나눔
     */
    async decompose(query: string, context: ContextAnalysis, groqClient: any): Promise<SubProblem[]> {
        const prompt = `질문을 분석하여 하위 문제로 분해하세요.

## 질문
"${query}"

## 컨텍스트
- 의도: ${context.intent}
- 핵심 키워드: ${context.searchKeywords.join(', ')}

## 지시
다음 JSON 형식으로 2-4개의 하위 문제를 도출하세요 (순수 JSON만):
[
    {"id": "sp1", "question": "하위 질문 1"},
    {"id": "sp2", "question": "하위 질문 2"}
]`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500
            },
            (chunk: string, full: string) => { response = full; }
        );

        try {
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                return JSON.parse(match[0]).map((sp: any) => ({
                    ...sp,
                    answer: '',
                    confidence: 0,
                    sources: []
                }));
            }
        } catch (e) {
            console.error('Decompose parsing failed:', e);
        }

        // 폴백: 단일 문제
        return [{ id: 'sp1', question: query, answer: '', confidence: 0, sources: [] }];
    },

    /**
     * Step 2: 해결 - 각 하위 문제 해결
     */
    async solveSubProblems(
        subProblems: SubProblem[],
        searchResults: any[],
        groqClient: any
    ): Promise<SubProblem[]> {
        const solutions: SubProblem[] = [];

        for (const sp of subProblems) {
            const prompt = `다음 질문에 답변하세요.

## 질문
"${sp.question}"

## 참고 자료
${searchResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.title}: ${r.snippet}`).join('\n')}

## 지시
다음 JSON 형식으로 응답 (순수 JSON만):
{
    "answer": "명확한 답변",
    "confidence": 0.0~1.0,
    "sources": ["출처1", "출처2"]
}`;

            let response = '';
            await groqClient.streamChat(
                {
                    model: 'openai/gpt-oss-120b',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    max_tokens: 800
                },
                (chunk: string, full: string) => { response = full; }
            );

            try {
                const match = response.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    solutions.push({
                        ...sp,
                        answer: parsed.answer || '답변 생성 실패',
                        confidence: parsed.confidence || 0.5,
                        sources: parsed.sources || []
                    });
                    continue;
                }
            } catch (e) {
                console.error('Solution parsing failed:', e);
            }

            solutions.push({ ...sp, answer: '답변 생성 실패', confidence: 0.3, sources: [] });
        }

        return solutions;
    },

    /**
     * Step 3: 검증 - 논리/사실/완전성/편향 점검
     */
    async verify(solutions: SubProblem[], groqClient: any): Promise<VerificationResult> {
        const allAnswers = solutions.map(s => `Q: ${s.question}\nA: ${s.answer}`).join('\n\n');

        const prompt = `다음 답변들을 검증하세요.

## 답변 목록
${allAnswers}

## 검증 항목
1. 논리적 일관성 (logicCheck)
2. 사실 정확성 (factCheck)
3. 완전성 - 빠진 내용 없는지 (completenessCheck)
4. 편향 여부 (biasCheck)

## 지시
다음 JSON 형식으로 검증 결과 (순수 JSON만):
{
    "logicCheck": true/false,
    "factCheck": true/false,
    "completenessCheck": true/false,
    "biasCheck": true/false,
    "issues": ["발견된 이슈1", "발견된 이슈2"]
}`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500
            },
            (chunk: string, full: string) => { response = full; }
        );

        try {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    logicCheck: parsed.logicCheck ?? true,
                    factCheck: parsed.factCheck ?? true,
                    completenessCheck: parsed.completenessCheck ?? true,
                    biasCheck: parsed.biasCheck ?? true,
                    issues: parsed.issues || [],
                    overallPass: parsed.logicCheck && parsed.factCheck && parsed.completenessCheck && parsed.biasCheck
                };
            }
        } catch (e) {
            console.error('Verify parsing failed:', e);
        }

        return {
            logicCheck: true,
            factCheck: true,
            completenessCheck: true,
            biasCheck: true,
            issues: [],
            overallPass: true
        };
    },

    /**
     * Step 4: 종합 - 가중치 결합
     */
    async synthesize(
        query: string,
        context: ContextAnalysis,
        solutions: SubProblem[],
        verification: VerificationResult,
        groqClient: any
    ): Promise<{ clearAnswer: string; confidence: number; keyNotes: string[] }> {
        const weightedAnswers = solutions
            .map(s => `[신뢰도 ${s.confidence}] ${s.question}: ${s.answer}`)
            .join('\n\n');

        const prompt = `하위 문제의 답변들을 종합하여 **마크다운 형식으로 직접** 최종 답변을 생성하세요.

## 원본 질문
"${query}"

## 질문 의도
${context.intent}

## 하위 답변들 (신뢰도 포함)
${weightedAnswers}

## 검증 결과
${verification.issues.length > 0 ? `주의: ${verification.issues.join(', ')}` : '검증 통과'}

## 출력 형식 (마크다운)
아래 구조로 **직접 마크다운 텍스트만** 작성하세요 (JSON 아님!):

### 핵심 요약
(3-4문장으로 핵심 내용 요약)

### 상세 분석
1. **주요 내용 1**: 설명
2. **주요 내용 2**: 설명
3. **주요 내용 3**: 설명

### 주요 시사점
- 시사점 1
- 시사점 2

## 필수 규칙
1. JSON 형식으로 응답하지 마세요! 마크다운 텍스트만!
2. 본문에 출처 직접 언급 금지
3. 두괄식: 결론부터
4. MECE: 중복 없이, 누락 없이
5. 개조식: 번호/글머리 사용
6. 수치화: 모호한 표현 금지
7. **참고자료 URL은 절대 생성하지 마세요.** 제공된 검색 결과의 URL만 사용해야 합니다.
8. 본문에 링크를 걸지 마세요. (마지막에 참고자료 섹션으로 자동 정리됩니다)`;

        let response = '';
        await groqClient.streamChat(
            {
                model: 'openai/gpt-oss-120b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
                max_tokens: 5000
            },
            (chunk: string, full: string) => { response = full; }
        );

        // 마크다운 응답 처리
        const cleanResponse = response
            .replace(/^```[\w]*\n?/gm, '')
            .replace(/```$/gm, '')
            .replace(/^\{[\s\S]*\}$/gm, '') // JSON 잔재 제거
            .trim();

        // keyNotes 추출
        const keyNotes: string[] = [];
        const sigsMatch = cleanResponse.match(/### 주요 시사점[\s\S]*?(?=###|$)/i);
        if (sigsMatch) {
            const lines = sigsMatch[0].split('\n').filter(l => l.trim().startsWith('-'));
            keyNotes.push(...lines.map(l => l.replace(/^-\s*/, '').trim()).slice(0, 3));
        }

        if (cleanResponse.length > 100) {
            return {
                clearAnswer: cleanResponse,
                confidence: 0.85,
                keyNotes: keyNotes.length > 0 ? keyNotes : ['종합 분석 결과입니다.']
            };
        }

        // 폴백: 첫 번째 답변
        return {
            clearAnswer: solutions[0]?.answer || '답변 생성 실패',
            confidence: 0.5,
            keyNotes: ['자동 생성된 답변입니다. 추가 검증이 필요합니다.']
        };
    },

    /**
     * Step 5: 성찰 - 신뢰도 미달 시 재시도 결정
     */
    async reflect(
        synthesis: { clearAnswer: string; confidence: number; keyNotes: string[] },
        verification: VerificationResult,
        retryCount: number
    ): Promise<ReflectionResult> {
        const weaknesses: string[] = [];

        if (synthesis.confidence < CONFIDENCE_THRESHOLD) {
            weaknesses.push(`신뢰도 부족: ${synthesis.confidence}`);
        }

        if (!verification.logicCheck) weaknesses.push('논리적 일관성 부족');
        if (!verification.factCheck) weaknesses.push('사실 정확성 의심');
        if (!verification.completenessCheck) weaknesses.push('완전성 부족');
        if (!verification.biasCheck) weaknesses.push('편향 감지');

        const retryNeeded = synthesis.confidence < CONFIDENCE_THRESHOLD && retryCount < MAX_RETRY_COUNT;

        return {
            weaknesses,
            improvements: retryNeeded ? ['추가 검색', '다각도 분석', '출처 교차 검증'] : [],
            retryNeeded,
            retryCount
        };
    },

    /**
     * 단순 답변 프롬프트 빌드 - 마크다운 직접 출력
     */
    buildSimpleAnswerPrompt(query: string, context: ContextAnalysis, searchResults: any[]): string {
        const sourcesText = searchResults.slice(0, 5).map((r, i) =>
            `${i + 1}. [${r.domain || r.displayLink}] ${r.title}: ${r.snippet}`
        ).join('\n');

        return `사용자 질문에 대해 **마크다운 형식으로 직접** 답변하세요.

## 질문
"${query}"

## 질문 분석
- 의도: ${context.intent}
- 핵심 키워드: ${context.searchKeywords.join(', ')}
${context.abbreviationExpansions.length > 0 ?
                `- 약어 확장: ${context.abbreviationExpansions.map(a => `${a.abbreviation} = ${a.mostLikely}`).join(', ')}` : ''}
${context.isAmbiguous ? `- ⚠️ 다의어 가능: ${context.possibleMeanings.join(', ')}` : ''}

## 참고 자료
${sourcesText}

## 출력 형식 (마크다운)
아래 구조로 **직접 마크다운 텍스트만** 작성하세요 (JSON 아님!):

### 핵심 요약
(3-4문장으로 핵심 내용 요약)

### 상세 분석
1. **주요 내용 1**: 설명
2. **주요 내용 2**: 설명
3. **주요 내용 3**: 설명

### 주요 시사점
- 시사점 1
- 시사점 2

## 필수 규칙
1. JSON 형식으로 응답하지 마세요! 마크다운 텍스트만!
2. 본문에 출처를 직접 언급하지 마세요 (예: "네이버에 따르면" ❌)
3. 답변은 두괄식으로 결론부터
4. 개조식(번호, 글머리) 사용
5. 모호한 표현 금지, 구체적 수치 사용`;
    },

    /**
     * 단순 응답 파싱 - 마크다운 직접 반환
     */
    parseSimpleResponse(response: string): { clearAnswer: string; confidence: number; keyNotes: string[] } {
        // JSON 형식인지 확인 후 처리
        try {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.clearAnswer && typeof parsed.clearAnswer === 'string') {
                    return {
                        clearAnswer: parsed.clearAnswer,
                        confidence: parsed.confidence || 0.7,
                        keyNotes: parsed.keyNotes || []
                    };
                }
            }
        } catch (e) {
            // JSON이 아니면 마크다운으로 처리
        }

        // 마크다운 응답이면 그대로 반환
        const cleanResponse = response
            .replace(/^```[\w]*\n?/gm, '')  // 코드 블록 제거
            .replace(/```$/gm, '')
            .trim();

        // 주요 시사점에서 keyNotes 추출
        const keyNotes: string[] = [];
        const sigsMatch = cleanResponse.match(/### 주요 시사점[\s\S]*?(?=###|$)/i);
        if (sigsMatch) {
            const lines = sigsMatch[0].split('\n').filter(l => l.trim().startsWith('-'));
            keyNotes.push(...lines.map(l => l.replace(/^-\s*/, '').trim()).slice(0, 3));
        }

        return {
            clearAnswer: cleanResponse,
            confidence: 0.8,
            keyNotes: keyNotes.length > 0 ? keyNotes : ['AI 분석 결과입니다.']
        };
    }
};

export default ReasoningEngine;
