/**
 * Response Templates - Phase B1
 * 표준 리포트 구조 (두괄식 + MECE + 개조식)
 */

import { IntentType } from './contextAnalyzer';
import { ResearchSource } from './researchService';

// ============================================
// Types
// ============================================

export interface TemplateVariables {
    title: string;
    executiveSummary: string;
    introduction: string;
    mainBody: string;
    conclusion: string;
    sources: ResearchSource[];
    confidence: number;
    generatedAt: string;
}

export interface FormattedReport {
    markdown: string;
    plainText: string;
    metadata: {
        intent: IntentType;
        wordCount: number;
        sourceCount: number;
        confidence: number;
    };
}

// ============================================
// Standard Report Template
// ============================================

/**
 * 표준 리포트 구조
 * 1. 제목 (Title)
 * 2. 요약 (Executive Summary)
 * 3. 서론 (Introduction)
 * 4. 본론 (Main Body)
 * 5. 결론 및 제언 (Conclusion & Recommendation)
 * 6. 참고자료 (References)
 */
function generateStandardReport(vars: TemplateVariables): string {
    return `# ${vars.title}

## 📋 요약 (Executive Summary)

${vars.executiveSummary}

---

## 📍 서론

${vars.introduction}

---

## 📊 본론

${vars.mainBody}

---

## ✅ 결론 및 제언

${vars.conclusion}

---

${formatSources(vars.sources)}

---
*🔹 신뢰도: ${(vars.confidence * 100).toFixed(0)}% | 📅 작성일: ${vars.generatedAt}*`;
}

// ============================================
// Intent-Specific Adaptations
// ============================================

const TEMPLATES: Record<IntentType, (vars: TemplateVariables) => string> = {
    /**
     * 정의 질문: 개념 정의 → 특징 → 활용
     */
    'definition': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 작성 배경\n${vars.introduction}\n\n### 보고서 범위\n본 보고서는 해당 개념의 정의, 특징, 활용 분야를 다룹니다.`
    }),

    /**
     * 비교 질문: 비교 분석 → 차이점 → 권장사항
     */
    'comparison': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 비교 배경\n${vars.introduction}\n\n### 비교 범위\n본 보고서는 각 대상의 특징을 분석하고 차이점을 도출합니다.`
    }),

    /**
     * 팩트체크: 주장 검증 → 근거 분석 → 판정
     */
    'fact-check': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 검증 대상\n${vars.introduction}\n\n### 검증 방법\n신뢰할 수 있는 출처를 교차 검증하여 사실 여부를 확인합니다.`
    }),

    /**
     * How-to: 단계별 가이드
     */
    'how-to': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 가이드 목적\n${vars.introduction}\n\n### 적용 범위\n본 가이드는 단계별 실행 방법을 제시합니다.`
    }),

    /**
     * 의견/전망: 현황 분석 → 다양한 시각 → 전망
     */
    'opinion': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 분석 배경\n${vars.introduction}\n\n### 분석 범위\n본 보고서는 현황을 분석하고 향후 전망을 제시합니다.`
    }),

    /**
     * 탐색/동향: 최신 동향 → 주요 변화 → 시사점
     */
    'exploration': (vars) => generateStandardReport({
        ...vars,
        introduction: `### 조사 배경\n${vars.introduction}\n\n### 조사 범위\n본 보고서는 최신 동향과 주요 변화를 분석합니다.`
    })
};

// ============================================
// Helper Functions
// ============================================

function formatSources(sources: ResearchSource[]): string {
    if (!sources || sources.length === 0) {
        return `## 📚 참고자료\n\n> 출처 정보 없음`;
    }

    const validSources = sources
        .filter(s => s.url && s.trustScore >= 70)
        .slice(0, 10);

    if (validSources.length === 0) {
        return `## 📚 참고자료\n\n> 신뢰할 수 있는 출처 없음`;
    }

    const sourceList = validSources.map((s, i) => {
        const trustEmoji = s.trustScore >= 90 ? '🏆' : s.trustScore >= 80 ? '✅' : '📄';
        return `${i + 1}. ${trustEmoji} [${s.title}](${s.url}) - ${s.domain} (신뢰도: ${s.trustScore}점)`;
    }).join('\n');

    return `## 📚 참고자료\n\n${sourceList}`;
}

// ============================================
// Response Templates
// ============================================

export const ResponseTemplates = {
    /**
     * 의도에 맞는 리포트 포맷팅
     */
    format(intent: IntentType, variables: TemplateVariables): FormattedReport {
        const template = TEMPLATES[intent] || TEMPLATES['definition'];
        const markdown = template(variables);

        // 마크다운에서 텍스트 추출
        const plainText = markdown
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/>\s/g, '')
            .replace(/---/g, '');

        return {
            markdown,
            plainText,
            metadata: {
                intent,
                wordCount: plainText.split(/\s+/).length,
                sourceCount: variables.sources.length,
                confidence: variables.confidence
            }
        };
    },

    /**
     * 기본 변수 생성
     */
    createDefaultVariables(
        title: string,
        executiveSummary: string,
        introduction: string,
        mainBody: string,
        conclusion: string,
        sources: ResearchSource[],
        confidence: number
    ): TemplateVariables {
        return {
            title,
            executiveSummary,
            introduction,
            mainBody,
            conclusion,
            sources,
            confidence,
            generatedAt: new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
    },

    /**
     * 모든 템플릿 유형 반환
     */
    getAvailableTemplates(): IntentType[] {
        return Object.keys(TEMPLATES) as IntentType[];
    }
};

export default ResponseTemplates;
